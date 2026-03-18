"""
Web Chat endpoints (public — no JWT required, widget calls these directly):
  GET  /webchat/config/{subdomain}        — Widget bootstrap config
  POST /webchat/message                   — Receive visitor message, return AI reply
  GET  /webchat/messages/{visitor_id}     — Poll for new bot/agent messages
"""
import httpx
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db, tenant_db_session
from app.models.core import Tenant, TenantSettings
from app.services.crm import ingest_lead
from app.services.automation import trigger_n8n_workflow

router = APIRouter()

# ── Default system prompt (fallback when tenant has none configured) ──────────

DEFAULT_SYSTEM_PROMPT = """You are an AI Sales Agent. You help visitors with their questions in a friendly, professional manner.
You answer concisely in 2-4 sentences. On the first message, ask for the visitor's name and contact info (email or WhatsApp).
If you don't know something specific about the business, acknowledge it and offer to connect them with a human agent."""


# ── AI reply via Groq (OpenAI-compatible) ─────────────────────────────────────

async def get_ai_reply(api_key: str, messages: list, system_prompt: str, model: str = "llama-3.1-8b-instant") -> str | None:
    """Call Groq API and return AI reply text. Returns None on any error."""
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "messages": [{"role": "system", "content": system_prompt}] + messages,
                    "max_tokens": 350,
                    "temperature": 0.65,
                },
            )
            data = response.json()
            if "choices" not in data:
                print(f"[AI] Unexpected response: {data}", flush=True)
                return None
            return data["choices"][0]["message"]["content"].strip()
    except Exception as e:
        print(f"[AI] Error calling Groq: {e}", flush=True)
        return None


# ── Schemas ───────────────────────────────────────────────────────────────────

class WebChatMessage(BaseModel):
    tenant_subdomain: str
    visitor_id: str
    visitor_name: str = "Visitante"
    message: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/config/{subdomain}")
def get_widget_config(subdomain: str, db: Session = Depends(get_db)):
    """Return public widget configuration for the given tenant subdomain."""
    tenant = db.query(Tenant).filter(Tenant.subdomain == subdomain).first()
    if not tenant or not tenant.settings:
        raise HTTPException(status_code=404, detail="Tenant not found")
    s = tenant.settings
    return {
        "tenant_name": tenant.name,
        "subdomain": tenant.subdomain,
        "greeting": s.webchat_greeting or "¡Hola! ¿En qué puedo ayudarte hoy? 😊",
        "bot_name": s.webchat_bot_name or "Asistente",
        "color": s.webchat_color or s.primary_color or "#7c3aed",
        "logo_url": s.logo_url or "",
        "enabled": s.webchat_enabled if s.webchat_enabled is not None else True,
        "ai_enabled": bool(s.openai_api_key),
    }


@router.post("/message")
async def receive_webchat_message(payload: WebChatMessage, request: Request, db: Session = Depends(get_db)):
    """
    Receive a visitor message, generate an AI reply, persist both,
    and trigger the n8n workflow on the first message.
    """
    tenant = db.query(Tenant).filter(Tenant.subdomain == payload.tenant_subdomain).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    settings = tenant.settings

    # Eagerly read all settings BEFORE switching DB context (avoids SQLAlchemy lazy-load failures)
    ai_key = settings.openai_api_key if settings else None
    ai_model = (getattr(settings, "ai_model", None) or "llama-3.1-8b-instant") if settings else "llama-3.1-8b-instant"
    n8n_url = settings.n8n_url if settings else None
    n8n_path = settings.n8n_webhook_path if settings else None
    system_prompt = (
        getattr(settings, "webchat_system_prompt", None) or DEFAULT_SYSTEM_PROMPT
    ) if settings else DEFAULT_SYSTEM_PROMPT

    # Extract visitor IP (respects X-Forwarded-For from Cloudflare/nginx)
    forwarded_for = request.headers.get("X-Forwarded-For")
    visitor_ip = (forwarded_for.split(",")[0].strip() if forwarded_for else None) or (
        request.client.host if request.client else None
    )

    print(f"[webchat] tenant={payload.tenant_subdomain} ip={visitor_ip} ai={'yes' if ai_key else 'no'}", flush=True)

    # ── Save incoming message + get conversation history ──────────────────────
    with tenant_db_session(tenant.schema_name) as tdb:
        contact, conversation = ingest_lead(tdb, {
            "name": payload.visitor_name,
            "external_id": payload.visitor_id,
            "source": "web",
            "message": payload.message,
            "ip_address": visitor_ip,
        }, tenant.id)
        contact_id = contact.id
        conv_id = conversation.id

        # Build conversation history for AI context (last 14 turns)
        from app.models.tenant import Message
        history = (
            tdb.query(Message)
            .filter(Message.conversation_id == conv_id)
            .order_by(Message.timestamp.asc())
            .limit(14)
            .all()
        )
        ai_messages = [
            {
                "role": "user" if m.sender_type == "contact" else "assistant",
                "content": m.content,
            }
            for m in history
        ]
        is_first_message = sum(1 for m in history if m.sender_type == "contact") <= 1

    # ── Generate AI reply ─────────────────────────────────────────────────────
    bot_reply = None
    if ai_key:
        bot_reply = await get_ai_reply(ai_key, ai_messages, system_prompt, ai_model)
        print(f"[AI] reply generated: {bool(bot_reply)}", flush=True)

    # ── Persist bot reply ─────────────────────────────────────────────────────
    if bot_reply:
        with tenant_db_session(tenant.schema_name) as tdb:
            from app.models.tenant import Message, Conversation
            bot_msg = Message(
                conversation_id=conv_id,
                sender_type="bot",
                content=bot_reply,
                timestamp=datetime.utcnow(),
            )
            tdb.add(bot_msg)
            conv = tdb.query(Conversation).filter(Conversation.id == conv_id).first()
            if conv:
                conv.last_message = f"[Bot] {bot_reply[:80]}"
                conv.updated_at = datetime.utcnow()
            tdb.commit()

    # ── Trigger n8n on first message only ────────────────────────────────────
    if n8n_url and n8n_path and is_first_message:
        await trigger_n8n_workflow(settings, {
            "tenant_id": tenant.id,
            "channel": "web",
            "contact": {"id": contact_id, "external_id": payload.visitor_id, "name": payload.visitor_name},
            "message": {"content": payload.message, "conversation_id": conv_id},
        })

    return {
        "status": "ok",
        "conversation_id": conv_id,
        "contact_id": contact_id,
        "reply": bot_reply,
    }


@router.get("/messages/{visitor_id}")
def poll_webchat_messages(visitor_id: str, tenant_subdomain: str, db: Session = Depends(get_db)):
    """
    Widget polls this endpoint every 3s to pick up bot/agent replies.
    Returns all messages for this visitor's web conversation.
    """
    from app.models.tenant import Contact, Conversation, Message

    tenant = db.query(Tenant).filter(Tenant.subdomain == tenant_subdomain).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    with tenant_db_session(tenant.schema_name) as tdb:
        contact = tdb.query(Contact).filter(Contact.external_id == visitor_id).first()
        if not contact:
            return []

        conv = (
            tdb.query(Conversation)
            .filter(
                Conversation.contact_id == contact.id,
                Conversation.channel == "web",
            )
            .first()
        )
        if not conv:
            return []

        messages = (
            tdb.query(Message)
            .filter(Message.conversation_id == conv.id)
            .order_by(Message.timestamp.asc())
            .all()
        )
        return [
            {
                "id": m.id,
                "sender_type": m.sender_type,
                "content": m.content,
                "timestamp": m.timestamp.isoformat(),
            }
            for m in messages
        ]
