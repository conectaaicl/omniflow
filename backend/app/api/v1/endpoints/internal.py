"""
Internal API endpoints for n8n automation (no JWT — uses shared API secret).
Auth: Header  X-API-Secret: <N8N_API_SECRET from env>

Endpoints:
  GET  /internal/contact/{external_id}?subdomain=osw   — get contact + conversation
  POST /internal/contact/upsert                         — create/update contact
  POST /internal/deal/upsert                            — create or move deal
  POST /internal/webchat/inject                         — inject bot message into chat
  POST /internal/whatsapp/inject                        — inject bot message into whatsapp conversation
  POST /internal/quote/save                             — save generated quote
  GET  /internal/contact/list?subdomain=osw&limit=50   — recent contacts
  GET  /internal/ai-config?subdomain=osw                — get AI config (system_prompt, model, provider)
"""
import json
import os
import shutil
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Header, UploadFile, File, Form
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.core.config import settings
from app.core.database import get_db, tenant_db_session
from app.models.core import Tenant, TenantSettings, User
from app.models.tenant import Contact, Conversation, Message, Deal, PipelineStage
from app.core import security as _security

router = APIRouter()


# ── Auth ──────────────────────────────────────────────────────────────────────

def _require_secret(x_api_secret: str = Header(...)):
    if not settings.N8N_API_SECRET or x_api_secret != settings.N8N_API_SECRET:
        raise HTTPException(status_code=403, detail="Invalid API secret")


def _get_tenant_by_subdomain(subdomain: str, db: Session) -> Tenant:
    tenant = db.query(Tenant).filter(Tenant.subdomain == subdomain).first()
    if not tenant:
        raise HTTPException(status_code=404, detail=f"Tenant '{subdomain}' not found")
    return tenant


# ── Schemas ───────────────────────────────────────────────────────────────────

class ContactUpsert(BaseModel):
    subdomain: str
    external_id: str
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    source: Optional[str] = "web"
    ip_address: Optional[str] = None


class DealUpsert(BaseModel):
    subdomain: str
    external_id: str          # contact external_id
    title: Optional[str] = None
    value: Optional[float] = 0.0
    stage_name: Optional[str] = None   # e.g. "Propuesta", "Contactado"
    deal_id: Optional[int] = None      # if moving existing deal


class InjectMessage(BaseModel):
    subdomain: str
    external_id: str          # visitor external_id
    content: str
    sender_type: str = "bot"  # bot | human


class SaveQuote(BaseModel):
    subdomain: str
    external_id: str
    quote_text: str
    product: Optional[str] = None
    total_value: Optional[float] = None


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/contact/{external_id}")
def get_contact(
    external_id: str,
    subdomain: str,
    db: Session = Depends(get_db),
    _: str = Depends(_require_secret),
):
    tenant = _get_tenant_by_subdomain(subdomain, db)
    with tenant_db_session(tenant.schema_name) as tdb:
        contact = tdb.query(Contact).filter(Contact.external_id == external_id).first()
        if not contact:
            return {"found": False, "contact": None}

        conv = (
            tdb.query(Conversation)
            .filter(Conversation.contact_id == contact.id, Conversation.channel == "web")
            .first()
        )
        msg_count = 0
        if conv:
            msg_count = tdb.query(Message).filter(Message.conversation_id == conv.id).count()

        return {
            "found": True,
            "contact": {
                "id": contact.id,
                "name": contact.name,
                "phone": contact.phone,
                "email": contact.email,
                "external_id": contact.external_id,
                "lead_score": contact.lead_score,
                "intent": contact.intent,
                "source": contact.source,
                "last_interaction": contact.last_interaction.isoformat() if contact.last_interaction else None,
            },
            "conversation": {
                "id": conv.id if conv else None,
                "status": conv.status if conv else None,
                "message_count": msg_count,
                "last_message": conv.last_message if conv else None,
            } if conv else None,
            "has_name": bool(contact.name and contact.name not in ("Visitante", "Visitante Web", "Unknown", "")),
            "has_phone": bool(contact.phone),
            "has_email": bool(contact.email),
        }


@router.post("/contact/upsert")
def upsert_contact(
    payload: ContactUpsert,
    db: Session = Depends(get_db),
    _: str = Depends(_require_secret),
):
    tenant = _get_tenant_by_subdomain(payload.subdomain, db)
    with tenant_db_session(tenant.schema_name) as tdb:
        contact = tdb.query(Contact).filter(Contact.external_id == payload.external_id).first()
        if not contact:
            contact = Contact(
                name=payload.name or "Visitante",
                phone=payload.phone,
                email=payload.email,
                external_id=payload.external_id,
                source=payload.source,
            )
            tdb.add(contact)
            tdb.flush()
        else:
            if payload.name and contact.name in ("Visitante", "Visitante Web", "Unknown", ""):
                contact.name = payload.name
            if payload.phone and not contact.phone:
                contact.phone = payload.phone
            if payload.email and not contact.email:
                contact.email = payload.email
            contact.last_interaction = datetime.utcnow()
        tdb.commit()
        return {"id": contact.id, "external_id": contact.external_id, "name": contact.name}


@router.post("/deal/upsert")
def upsert_deal(
    payload: DealUpsert,
    db: Session = Depends(get_db),
    _: str = Depends(_require_secret),
):
    tenant = _get_tenant_by_subdomain(payload.subdomain, db)
    with tenant_db_session(tenant.schema_name) as tdb:
        contact = tdb.query(Contact).filter(Contact.external_id == payload.external_id).first()
        if not contact:
            raise HTTPException(status_code=404, detail="Contact not found")

        # Find target stage
        stage = None
        if payload.stage_name:
            stage = tdb.query(PipelineStage).filter(
                PipelineStage.name == payload.stage_name
            ).first()
        if not stage:
            # Default to first stage (Nuevo Lead)
            stage = tdb.query(PipelineStage).order_by(PipelineStage.order.asc()).first()

        # Move existing or create new
        deal = None
        if payload.deal_id:
            deal = tdb.query(Deal).filter(Deal.id == payload.deal_id).first()
        if not deal:
            # Look for open deal for this contact
            deal = tdb.query(Deal).filter(
                Deal.contact_id == contact.id, Deal.status == "open"
            ).first()

        if deal:
            if stage:
                deal.stage_id = stage.id
            if payload.value:
                deal.value = payload.value
        else:
            deal = Deal(
                contact_id=contact.id,
                stage_id=stage.id if stage else None,
                title=payload.title or f"Lead: {contact.name}",
                value=payload.value or 0.0,
                status="open",
            )
            tdb.add(deal)

        tdb.commit()
        tdb.refresh(deal)
        return {
            "deal_id": deal.id,
            "stage": stage.name if stage else None,
            "contact_name": contact.name,
            "value": deal.value,
        }


@router.post("/webchat/inject")
def inject_message(
    payload: InjectMessage,
    db: Session = Depends(get_db),
    _: str = Depends(_require_secret),
):
    """Inject a bot/human message into an ongoing webchat conversation."""
    tenant = _get_tenant_by_subdomain(payload.subdomain, db)
    with tenant_db_session(tenant.schema_name) as tdb:
        contact = tdb.query(Contact).filter(Contact.external_id == payload.external_id).first()
        if not contact:
            raise HTTPException(status_code=404, detail="Contact not found")

        conv = (
            tdb.query(Conversation)
            .filter(Conversation.contact_id == contact.id, Conversation.channel == "web")
            .first()
        )
        if not conv:
            raise HTTPException(status_code=404, detail="No web conversation found")

        msg = Message(
            conversation_id=conv.id,
            sender_type=payload.sender_type,
            content=payload.content,
            timestamp=datetime.utcnow(),
        )
        tdb.add(msg)
        conv.last_message = f"[{payload.sender_type.upper()}] {payload.content[:80]}"
        conv.updated_at = datetime.utcnow()
        tdb.commit()

        return {"injected": True, "conversation_id": conv.id, "message_id": msg.id}


@router.post("/quote/save")
def save_quote(
    payload: SaveQuote,
    db: Session = Depends(get_db),
    _: str = Depends(_require_secret),
):
    """Save a generated quote as a bot message + update deal value."""
    tenant = _get_tenant_by_subdomain(payload.subdomain, db)
    with tenant_db_session(tenant.schema_name) as tdb:
        contact = tdb.query(Contact).filter(Contact.external_id == payload.external_id).first()
        if not contact:
            raise HTTPException(status_code=404, detail="Contact not found")

        conv = (
            tdb.query(Conversation)
            .filter(Conversation.contact_id == contact.id, Conversation.channel == "web")
            .first()
        )
        if conv:
            msg = Message(
                conversation_id=conv.id,
                sender_type="bot",
                content=payload.quote_text,
                timestamp=datetime.utcnow(),
                metadata_json={"type": "quote", "product": payload.product, "value": payload.total_value},
            )
            tdb.add(msg)
            conv.last_message = f"[COTIZACIÓN] {payload.quote_text[:80]}"
            conv.updated_at = datetime.utcnow()

        # Update deal value if provided
        if payload.total_value:
            deal = tdb.query(Deal).filter(
                Deal.contact_id == contact.id, Deal.status == "open"
            ).first()
            if deal:
                deal.value = payload.total_value

        tdb.commit()
        return {"saved": True}


@router.get("/contacts/recent")
def list_recent_contacts(
    subdomain: str,
    limit: int = 50,
    db: Session = Depends(get_db),
    _: str = Depends(_require_secret),
):
    tenant = _get_tenant_by_subdomain(subdomain, db)
    with tenant_db_session(tenant.schema_name) as tdb:
        contacts = (
            tdb.query(Contact)
            .order_by(Contact.last_interaction.desc())
            .limit(limit)
            .all()
        )
        return [
            {
                "id": c.id,
                "external_id": c.external_id,
                "name": c.name,
                "phone": c.phone,
                "email": c.email,
                "lead_score": c.lead_score,
                "intent": c.intent,
                "last_interaction": c.last_interaction.isoformat() if c.last_interaction else None,
                "has_name": bool(c.name and c.name not in ("Visitante", "Visitante Web", "Unknown", "")),
                "has_phone": bool(c.phone),
                "has_email": bool(c.email),
            }
            for c in contacts
        ]


# ── AI Config (para workflow WhatsApp IA PRO) ─────────────────────────────────

@router.get("/ai-config")
def get_ai_config(
    subdomain: str,
    db: Session = Depends(get_db),
    _: str = Depends(_require_secret),
):
    """Returns AI configuration for the tenant (system prompt, model, provider).
    Safe to call from n8n — never exposes API keys or tokens."""
    tenant = _get_tenant_by_subdomain(subdomain, db)
    s = db.query(TenantSettings).filter(TenantSettings.tenant_id == tenant.id).first()
    if not s:
        return {
            "system_prompt": "Eres un asistente virtual amable y profesional. Responde en español.",
            "ai_provider": "groq",
            "ai_model": "llama-3.3-70b-versatile",
        }
    return {
        "system_prompt": s.webchat_system_prompt or "Eres un asistente virtual amable y profesional. Responde en español.",
        "ai_provider": s.ai_provider or "groq",
        "ai_model": s.ai_model or "llama-3.3-70b-versatile",
    }


@router.get("/whatsapp/tenant-config")
def get_whatsapp_tenant_config(
    phone_number_id: str,
    db: Session = Depends(get_db),
    _: str = Depends(_require_secret),
):
    """Returns full WhatsApp + AI config for a tenant identified by phone_number_id.
    Used by n8n to route multi-tenant WhatsApp messages automatically."""
    s = db.query(TenantSettings).filter(
        TenantSettings.whatsapp_phone_id == phone_number_id
    ).first()
    if not s:
        raise HTTPException(
            status_code=404,
            detail=f"No tenant configured for phone_number_id '{phone_number_id}'"
        )
    tenant = db.query(Tenant).filter(Tenant.id == s.tenant_id).first()
    return {
        "tenant_id": s.tenant_id,
        "subdomain": tenant.subdomain if tenant else "unknown",
        "whatsapp_token": s.whatsapp_access_token,
        "whatsapp_phone_id": s.whatsapp_phone_id,
        "whatsapp_number": s.whatsapp_number,
        "system_prompt": s.webchat_system_prompt or "Eres un asistente virtual amable y profesional. Responde en español.",
        "ai_provider": s.ai_provider or "groq",
        "ai_model": s.ai_model or "llama-3.3-70b-versatile",
    }


# ── WhatsApp message inject (logs bot responses to WhatsApp conversations) ─────

class InjectWhatsApp(BaseModel):
    subdomain: str
    phone: str                # contact phone number (WhatsApp from field)
    content: str
    sender_type: str = "bot"  # bot | human
    contact_name: Optional[str] = None  # auto-create if contact not found


class HandoffRequest(BaseModel):
    subdomain: str
    phone: str


@router.post("/whatsapp/inject")
def inject_whatsapp_message(
    payload: InjectWhatsApp,
    db: Session = Depends(get_db),
    _: str = Depends(_require_secret),
):
    """Inject a bot/human message into a WhatsApp conversation in OmniFlow CRM.
    Auto-creates contact and conversation if they don't exist yet."""
    tenant = _get_tenant_by_subdomain(payload.subdomain, db)
    # Normalize phone: always search with + prefix
    phone_normalized = payload.phone if payload.phone.startswith("+") else f"+{payload.phone}"
    with tenant_db_session(tenant.schema_name) as tdb:
        contact = (
            tdb.query(Contact)
            .filter(Contact.phone.in_([phone_normalized, payload.phone]))
            .first()
        )
        if not contact:
            # Auto-create contact from WhatsApp number
            contact = Contact(
                name=payload.contact_name or "Cliente WhatsApp",
                phone=phone_normalized,
                external_id=payload.phone.lstrip("+"),
                source="whatsapp",
                last_interaction=datetime.utcnow(),
            )
            tdb.add(contact)
            tdb.flush()

        conv = (
            tdb.query(Conversation)
            .filter(
                Conversation.contact_id == contact.id,
                Conversation.channel == "whatsapp",
            )
            .order_by(Conversation.updated_at.desc())
            .first()
        )
        if not conv:
            # Auto-create WhatsApp conversation
            conv = Conversation(
                contact_id=contact.id,
                channel="whatsapp",
                status="open",
                bot_active=True,
            )
            tdb.add(conv)
            tdb.flush()

        msg = Message(
            conversation_id=conv.id,
            sender_type=payload.sender_type,
            content=payload.content,
            timestamp=datetime.utcnow(),
        )
        tdb.add(msg)
        label = payload.sender_type.upper()
        conv.last_message = f"[{label}] {payload.content[:80]}"
        conv.updated_at = datetime.utcnow()
        tdb.commit()

        return {"injected": True, "conversation_id": conv.id, "message_id": msg.id}


@router.post("/whatsapp/handoff")
def whatsapp_handoff(
    payload: HandoffRequest,
    db: Session = Depends(get_db),
    _: str = Depends(_require_secret),
):
    """Pause the bot and flag the conversation for a human agent."""
    tenant = _get_tenant_by_subdomain(payload.subdomain, db)
    phone_normalized = payload.phone if payload.phone.startswith("+") else f"+{payload.phone}"
    with tenant_db_session(tenant.schema_name) as tdb:
        contact = (
            tdb.query(Contact)
            .filter(Contact.phone.in_([phone_normalized, payload.phone]))
            .first()
        )
        if not contact:
            return {"ok": False, "reason": "contact_not_found"}

        conv = (
            tdb.query(Conversation)
            .filter(
                Conversation.contact_id == contact.id,
                Conversation.channel == "whatsapp",
            )
            .order_by(Conversation.updated_at.desc())
            .first()
        )
        if not conv:
            return {"ok": False, "reason": "conversation_not_found"}

        conv.bot_active = False
        conv.status = "pending"   # highlights in agent inbox
        tdb.commit()
        return {"ok": True, "conversation_id": conv.id, "contact_name": contact.name}


# ── Knowledge Search (for n8n AI context injection) ────────────────────────────

from fastapi import Request, Query as FQuery
from app.services.embeddings import get_embedding_sync
from sqlalchemy import text as sa_text

@router.get("/knowledge-search")
def knowledge_search_internal(
    request: Request,
    tenant_id: int = FQuery(...),
    q: str = FQuery(..., min_length=1),
    top_k: int = FQuery(3, le=5),
    db: Session = Depends(get_db),
):
    """
    Semantic search over a tenant's knowledge base.
    Called by n8n before passing message to AI — injects business context.
    Auth: X-Internal-Secret header matching N8N_API_SECRET.
    """
    secret = request.headers.get("X-Internal-Secret", "")
    if not secret or secret != settings.N8N_API_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")

    emb = get_embedding_sync(q)
    emb_str = f"[{','.join(str(x) for x in emb)}]"

    rows = db.execute(
        sa_text("""
            SELECT contenido,
                   1 - (embedding <=> CAST(:emb AS vector)) AS similarity
            FROM knowledge_base
            WHERE tenant_id = :tid
              AND embedding IS NOT NULL
              AND (1 - (embedding <=> CAST(:emb AS vector))) > 0.35
            ORDER BY embedding <=> CAST(:emb AS vector)
            LIMIT :k
        """),
        {"tid": tenant_id, "emb": emb_str, "k": top_k},
    ).fetchall()

    if not rows:
        return {"context": "", "found": 0}

    context_parts = [row.contenido for row in rows]
    context = "\n\n---\n\n".join(context_parts)
    return {
        "context": context,
        "found": len(rows),
        "similarities": [round(float(row.similarity), 3) for row in rows],
    }


# ── WhatsApp Follow-up Send (for n8n automated sequences) ─────────────────────

class SendFollowup(BaseModel):
    subdomain: str
    phone: str
    content: str


@router.post("/whatsapp/send-followup")
async def send_whatsapp_followup(
    payload: SendFollowup,
    db: Session = Depends(get_db),
    _: str = Depends(_require_secret),
):
    """
    Send a WhatsApp message from an n8n follow-up sequence.
    Checks bot_active before sending — skips if an agent has taken over.
    Logs message to conversation on success.
    """
    tenant = _get_tenant_by_subdomain(payload.subdomain, db)
    ts = db.query(TenantSettings).filter(TenantSettings.tenant_id == tenant.id).first()
    if not ts or not ts.whatsapp_phone_id or not ts.whatsapp_access_token:
        raise HTTPException(status_code=400, detail="WhatsApp not configured for this tenant")

    phone_normalized = payload.phone if payload.phone.startswith("+") else f"+{payload.phone}"

    # Check bot_active BEFORE sending
    conv_id = None
    with tenant_db_session(tenant.schema_name) as tdb:
        contact = tdb.query(Contact).filter(
            Contact.phone.in_([phone_normalized, payload.phone])
        ).first()
        if not contact:
            return {"sent": False, "reason": "contact_not_found"}

        conv = (
            tdb.query(Conversation)
            .filter(
                Conversation.contact_id == contact.id,
                Conversation.channel == "whatsapp",
            )
            .order_by(Conversation.updated_at.desc())
            .first()
        )
        if not conv:
            return {"sent": False, "reason": "no_conversation"}

        if not getattr(conv, "bot_active", True):
            return {"sent": False, "reason": "agent_took_over"}

        conv_id = conv.id

    # Send via WhatsApp Cloud API
    from app.services.messaging import send_whatsapp as _send_wa
    sent = await _send_wa(ts.whatsapp_phone_id, ts.whatsapp_access_token, phone_normalized, payload.content)

    if sent and conv_id:
        with tenant_db_session(tenant.schema_name) as tdb:
            msg = Message(
                conversation_id=conv_id,
                sender_type="bot",
                content=payload.content,
                timestamp=datetime.utcnow(),
            )
            tdb.add(msg)
            conv = tdb.query(Conversation).filter(Conversation.id == conv_id).first()
            if conv:
                conv.last_message = f"[FollowUp] {payload.content[:80]}"
                conv.updated_at = datetime.utcnow()
            tdb.commit()

    return {"sent": sent, "logged": sent}


# ── Admin Landing Content (JWT auth, superuser only) ─────────────────────────

LANDING_CONTENT_FILE = "/app/uploads/landing_content.json"
STATIC_DIR = "/app/uploads"

def _require_superuser(db: Session = Depends(get_db), authorization: str = Header(...)):
    token = authorization.replace("Bearer ", "")
    try:
        payload = _security.decode_token(token)
        email = payload.get("sub")
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    return user


@router.get("/landing-content")
def get_landing_content(_user=Depends(_require_superuser)):
    if os.path.exists(LANDING_CONTENT_FILE):
        with open(LANDING_CONTENT_FILE) as f:
            return json.load(f)
    return {}


@router.post("/landing-content")
def save_landing_content(data: dict, _user=Depends(_require_superuser)):
    os.makedirs(os.path.dirname(LANDING_CONTENT_FILE), exist_ok=True)
    with open(LANDING_CONTENT_FILE, "w") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return {"ok": True}


@router.post("/upload-asset")
async def upload_asset(
    file: UploadFile = File(...),
    dest: str = Form(...),
    _user=Depends(_require_superuser),
):
    # Sanitize dest to prevent path traversal
    dest = dest.replace("..", "").lstrip("/")
    out_path = os.path.join(STATIC_DIR, dest)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return {"ok": True, "path": f"/{dest}"}
