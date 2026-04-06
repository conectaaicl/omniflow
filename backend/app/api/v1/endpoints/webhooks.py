"""
Webhook endpoints for all channels:
  GET/POST /webhooks/whatsapp      — WhatsApp Cloud API
  GET/POST /webhooks/meta          — Instagram DMs + Facebook Messenger + Lead Ads
  POST     /webhooks/tiktok        — TikTok Lead Gen
  POST     /webhooks/shopify       — Shopify Orders/Customers
  POST     /webhooks/email         — Email inbound (SendGrid/Mailgun)
"""
import base64
import hashlib
import hmac
import json
import re
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from app.core.database import get_db, tenant_db_session
from app.models.core import Tenant, TenantSettings
from app.services.crm import ingest_lead
from app.services.automation import trigger_n8n_workflow
from app.services.messaging import send_whatsapp
from app.api.v1.endpoints.webchat import get_ai_reply

router = APIRouter()


# ── Helpers ──────────────────────────────────────────────────────────────────

def _find_tenant(db: Session, **kwargs):
    """Find TenantSettings+Tenant by a credential field, fallback to first tenant."""
    for field, value in kwargs.items():
        if value:
            s = db.query(TenantSettings).filter(
                getattr(TenantSettings, field) == value
            ).first()
            if s and s.tenant:
                return s, s.tenant
    tenant = db.query(Tenant).first()
    if tenant and tenant.settings:
        return tenant.settings, tenant
    return None, None


async def _ingest(db, tenant, settings, lead_data: dict):
    """Save to DB, generate AI reply if WhatsApp, fire n8n workflow."""
    from app.core.config import settings as app_settings

    with tenant_db_session(tenant.schema_name) as tdb:
        contact, conversation = ingest_lead(tdb, lead_data, tenant.id)
        cid, cvid = contact.id, conversation.id

        # Build conversation history for AI (last 14 messages)
        from app.models.tenant import Message, Conversation
        history = list(reversed(
            tdb.query(Message)
            .filter(Message.conversation_id == cvid)
            .order_by(Message.timestamp.desc())
            .limit(14)
            .all()
        ))
        ai_messages = [
            {"role": "user" if m.sender_type == "contact" else "assistant", "content": m.content}
            for m in history
            if m.content
        ]
        bot_active = getattr(conversation, "bot_active", True)
        is_first_message = sum(1 for m in history if m.sender_type == "contact") <= 1

    # ── AI reply for WhatsApp channel ────────────────────────────────────────
    source = lead_data.get("source")
    if source == "whatsapp" and bot_active and settings:
        ai_key = (getattr(settings, "openai_api_key", None)) or app_settings.GROQ_API_KEY or None
        ai_model = getattr(settings, "ai_model", None) or "llama-3.1-8b-instant"
        system_prompt = getattr(settings, "webchat_system_prompt", None) or (
            "Eres un asistente de ventas amable. Responde siempre en español."
        )
        wa_phone_id = getattr(settings, "whatsapp_phone_id", None)
        wa_token = getattr(settings, "whatsapp_access_token", None)
        contact_phone = lead_data.get("phone")

        if ai_key and wa_phone_id and wa_token and contact_phone:
            bot_reply = await get_ai_reply(ai_key, ai_messages, system_prompt, ai_model)
            if bot_reply:
                # Detect human escalation keyword
                needs_handoff = "ESCALAR_HUMANO" in bot_reply
                clean_reply = bot_reply.replace("ESCALAR_HUMANO", "").strip()
                if needs_handoff:
                    clean_reply = "Un momento, te voy a conectar con un agente. 🙋"

                sent = await send_whatsapp(wa_phone_id, wa_token, contact_phone, clean_reply)
                if sent:
                    with tenant_db_session(tenant.schema_name) as tdb:
                        from app.models.tenant import Message, Conversation
                        bot_msg = Message(
                            conversation_id=cvid,
                            sender_type="bot",
                            content=clean_reply,
                            timestamp=datetime.utcnow(),
                        )
                        tdb.add(bot_msg)
                        conv = tdb.query(Conversation).filter(Conversation.id == cvid).first()
                        if conv:
                            conv.last_message = f"[Bot] {clean_reply[:80]}"
                            conv.updated_at = datetime.utcnow()
                            if needs_handoff:
                                conv.bot_active = False
                        tdb.commit()
                    if needs_handoff:
                        print(f"[whatsapp-bot] HANDOFF → bot silenciado para {contact_phone}", flush=True)
                    else:
                        print(f"[whatsapp-bot] replied to {contact_phone}", flush=True)

    # ── Trigger n8n on first message ─────────────────────────────────────────
    if settings and settings.n8n_url and settings.n8n_webhook_path and is_first_message:
        n8n_payload = {
            "tenant_id": tenant.id,
            "channel": source,
            "contact": {
                "id": cid,
                "name": lead_data.get("name"),
                "phone": lead_data.get("phone"),
                "email": lead_data.get("email"),
            },
            "message": {
                "content": lead_data.get("message", ""),
                "conversation_id": cvid,
            },
        }
        await trigger_n8n_workflow(settings, n8n_payload)

    # ── AI reply for Facebook Messenger ──────────────────────────────────────
    if source == "facebook" and bot_active and settings:
        ai_key = (getattr(settings, "openai_api_key", None)) or app_settings.GROQ_API_KEY or None
        ai_model = getattr(settings, "ai_model", None) or "llama-3.1-8b-instant"
        system_prompt = getattr(settings, "webchat_system_prompt", None) or (
            "Eres un asistente de ventas amable. Responde siempre en español."
        )
        fb_token = getattr(settings, "facebook_access_token", None)
        psid = lead_data.get("external_id")
        if ai_key and fb_token and psid:
            bot_reply = await get_ai_reply(ai_key, ai_messages, system_prompt, ai_model)
            if bot_reply:
                needs_handoff = "ESCALAR_HUMANO" in bot_reply
                clean_reply = bot_reply.replace("ESCALAR_HUMANO", "").strip()
                if needs_handoff:
                    clean_reply = "Un momento, te voy a conectar con un agente. 🙋"
                from app.services.messaging import send_facebook
                sent = await send_facebook(fb_token, psid, clean_reply)
                if sent:
                    with tenant_db_session(tenant.schema_name) as tdb:
                        from app.models.tenant import Message, Conversation
                        tdb.add(Message(conversation_id=cvid, sender_type="bot", content=clean_reply, timestamp=datetime.utcnow()))
                        conv = tdb.query(Conversation).filter(Conversation.id == cvid).first()
                        if conv:
                            conv.last_message = f"[Bot] {clean_reply[:80]}"
                            conv.updated_at = datetime.utcnow()
                            if needs_handoff:
                                conv.bot_active = False
                        tdb.commit()
                    print(f"[facebook-bot] {'HANDOFF' if needs_handoff else 'replied'} to {psid}", flush=True)

    # ── AI reply for Instagram DMs ────────────────────────────────────────────
    if source == "instagram" and bot_active and settings:
        ai_key = (getattr(settings, "openai_api_key", None)) or app_settings.GROQ_API_KEY or None
        ai_model = getattr(settings, "ai_model", None) or "llama-3.1-8b-instant"
        system_prompt = getattr(settings, "webchat_system_prompt", None) or (
            "Eres un asistente de ventas amable. Responde siempre en español."
        )
        ig_token = getattr(settings, "instagram_access_token", None) or getattr(settings, "facebook_access_token", None)
        sender_id = lead_data.get("external_id")
        if ai_key and ig_token and sender_id:
            bot_reply = await get_ai_reply(ai_key, ai_messages, system_prompt, ai_model)
            if bot_reply:
                needs_handoff = "ESCALAR_HUMANO" in bot_reply
                clean_reply = bot_reply.replace("ESCALAR_HUMANO", "").strip()
                if needs_handoff:
                    clean_reply = "Un momento, te voy a conectar con un agente. 🙋"
                from app.services.messaging import send_instagram
                ig_account_id = getattr(settings, "instagram_page_id", "me") or "me"
                sent = await send_instagram(ig_token, sender_id, clean_reply, ig_account_id)
                if sent:
                    with tenant_db_session(tenant.schema_name) as tdb:
                        from app.models.tenant import Message, Conversation
                        tdb.add(Message(conversation_id=cvid, sender_type="bot", content=clean_reply, timestamp=datetime.utcnow()))
                        conv = tdb.query(Conversation).filter(Conversation.id == cvid).first()
                        if conv:
                            conv.last_message = f"[Bot] {clean_reply[:80]}"
                            conv.updated_at = datetime.utcnow()
                            if needs_handoff:
                                conv.bot_active = False
                        tdb.commit()
                    print(f"[instagram-bot] {'HANDOFF' if needs_handoff else 'replied'} to {sender_id}", flush=True)

    # ── Follow-up n8n para todos los canales en primer mensaje ───────────────
    if source in ("whatsapp", "facebook", "instagram") and is_first_message and settings and settings.n8n_url:
        followup_url = f"{settings.n8n_url.rstrip('/')}/webhook/followup-lead"
        followup_payload = {
            "phone": lead_data.get("phone"),
            "contact_name": lead_data.get("name"),
            "subdomain": tenant.subdomain,
            "email": lead_data.get("email") or "",
            "source": source,
            "external_id": lead_data.get("external_id") or "",
        }
        import httpx as _httpx
        try:
            async with _httpx.AsyncClient(timeout=5) as client:
                await client.post(followup_url, json=followup_payload)
        except Exception as e:
            print(f"[followup] Could not trigger follow-up for {source}: {e}", flush=True)


# ── WhatsApp ─────────────────────────────────────────────────────────────────

@router.get("/whatsapp")
async def verify_whatsapp(request: Request, db: Session = Depends(get_db)):
    p = request.query_params
    mode = p.get("hub.mode")
    token = p.get("hub.verify_token")
    challenge = p.get("hub.challenge")
    if mode == "subscribe" and token:
        s = db.query(TenantSettings).filter(
            TenantSettings.whatsapp_verify_token == token
        ).first()
        if s:
            return PlainTextResponse(challenge)
    raise HTTPException(status_code=403, detail="Verification failed")


@router.post("/whatsapp")
async def handle_whatsapp(request: Request, db: Session = Depends(get_db)):
    from app.core.config import settings as app_settings
    raw_body = await request.body()
    # Validate X-Hub-Signature-256 if META_WEBHOOK_SECRET is configured
    if app_settings.META_WEBHOOK_SECRET:
        sig_header = request.headers.get("X-Hub-Signature-256", "")
        expected = "sha256=" + hmac.new(
            app_settings.META_WEBHOOK_SECRET.encode(),
            raw_body,
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(sig_header, expected):
            raise HTTPException(status_code=403, detail="Invalid webhook signature")
    body = json.loads(raw_body)
    entry = body.get("entry", [{}])[0]
    changes = entry.get("changes", [{}])[0]
    value = changes.get("value", {})

    if "messages" not in value:
        return {"status": "no_messages"}

    phone_id = value.get("metadata", {}).get("phone_number_id")
    settings, tenant = _find_tenant(db, whatsapp_phone_id=phone_id)
    if not tenant:
        return {"status": "tenant_not_found"}

    contacts_info = value.get("contacts", [])
    for msg in value.get("messages", []):
        msg_type = msg.get("type", "text")
        if msg_type == "text":
            content = msg.get("text", {}).get("body", "")
        elif msg_type == "image":
            content = "[Imagen recibida]"
        elif msg_type == "audio":
            content = "[Audio recibido]"
        elif msg_type == "document":
            content = "[Documento recibido]"
        else:
            content = f"[{msg_type}]"

        contact_name = (
            contacts_info[0].get("profile", {}).get("name", "WhatsApp User")
            if contacts_info else "WhatsApp User"
        )
        await _ingest(db, tenant, settings, {
            "name": contact_name,
            "phone": msg.get("from"),
            "source": "whatsapp",
            "message": content,
            "external_id": msg.get("id"),
        })

    return {"status": "ok"}


# ── Meta (Instagram DMs + Facebook Messenger + Lead Ads) ────────────────────

@router.get("/meta")
async def verify_meta(request: Request, db: Session = Depends(get_db)):
    p = request.query_params
    mode = p.get("hub.mode")
    token = p.get("hub.verify_token")
    challenge = p.get("hub.challenge")
    if mode == "subscribe" and token:
        s = db.query(TenantSettings).filter(
            (TenantSettings.instagram_verify_token == token) |
            (TenantSettings.facebook_verify_token == token)
        ).first()
        if s:
            return PlainTextResponse(challenge)
    raise HTTPException(status_code=403, detail="Verification failed")


@router.post("/meta")
async def handle_meta(request: Request, db: Session = Depends(get_db)):
    body = await request.json()
    obj_type = body.get("object")  # "instagram" or "page"

    for entry in body.get("entry", []):
        page_id = entry.get("id")

        if obj_type == "instagram":
            settings, tenant = _find_tenant(db, instagram_page_id=page_id)
            for messaging in entry.get("messaging", []):
                sender_id = messaging.get("sender", {}).get("id")
                content = messaging.get("message", {}).get("text", "[Mensaje Instagram]")
                if not content:
                    continue
                await _ingest(db, tenant, settings, {
                    "name": f"Instagram_{sender_id[-6:]}",
                    "external_id": sender_id,
                    "source": "instagram",
                    "message": content,
                })

        elif obj_type == "page":
            settings, tenant = _find_tenant(db, facebook_page_id=page_id)

            # Messenger messages
            for messaging in entry.get("messaging", []):
                psid = messaging.get("sender", {}).get("id")
                content = messaging.get("message", {}).get("text", "")
                if not content:
                    continue
                await _ingest(db, tenant, settings, {
                    "name": f"FB_{psid[-6:]}",
                    "external_id": psid,
                    "source": "facebook",
                    "message": content,
                })

            # Lead Ads
            for change in entry.get("changes", []):
                if change.get("field") == "leadgen":
                    val = change.get("value", {})
                    fields = {f["name"]: f["values"][0]
                              for f in val.get("field_data", []) if f.get("values")}
                    await _ingest(db, tenant, settings, {
                        "name": fields.get("full_name", fields.get("first_name", "Facebook Lead")),
                        "phone": fields.get("phone_number"),
                        "email": fields.get("email"),
                        "source": "facebook",
                        "message": f"Lead Ad: {val.get('ad_name', 'Facebook Lead Ad')}",
                        "campaign": val.get("ad_name"),
                    })

    return {"status": "ok"}


# ── TikTok Lead Gen ───────────────────────────────────────────────────────────

@router.post("/tiktok")
async def handle_tiktok(request: Request, db: Session = Depends(get_db)):
    body = await request.json()
    settings, tenant = _find_tenant(db, tiktok_app_id=body.get("app_id"))
    if not tenant:
        return {"status": "tenant_not_found"}

    leads = body.get("leads", [body])
    for lead in leads:
        fields = {f["name"]: f["value"] for f in lead.get("field_data", [])}
        await _ingest(db, tenant, settings, {
            "name": fields.get("full_name", fields.get("name", "TikTok Lead")),
            "phone": fields.get("phone_number", fields.get("phone")),
            "email": fields.get("email"),
            "source": "tiktok",
            "message": f"TikTok Lead Form: {lead.get('form_name', 'Lead Gen')}",
            "campaign": lead.get("ad_name") or lead.get("campaign_name"),
        })

    return {"status": "ok"}


# ── Shopify ───────────────────────────────────────────────────────────────────

@router.post("/shopify")
async def handle_shopify(request: Request, db: Session = Depends(get_db)):
    topic = request.headers.get("X-Shopify-Topic", "")
    shop_domain = request.headers.get("X-Shopify-Shop-Domain", "")
    hmac_header = request.headers.get("X-Shopify-Hmac-Sha256", "")
    body_bytes = await request.body()

    settings, tenant = _find_tenant(db, shopify_shop_domain=shop_domain)
    if not tenant:
        return {"status": "tenant_not_found"}

    # HMAC verification
    if settings and settings.shopify_webhook_secret:
        digest = hmac.new(
            settings.shopify_webhook_secret.encode(),
            body_bytes,
            hashlib.sha256,
        ).digest()
        expected = base64.b64encode(digest).decode()
        if not hmac.compare_digest(expected, hmac_header):
            raise HTTPException(status_code=403, detail="HMAC mismatch")

    body = json.loads(body_bytes)

    if topic == "orders/create":
        customer = body.get("customer", {})
        name = f"{customer.get('first_name','')} {customer.get('last_name','')}".strip()
        await _ingest(db, tenant, settings, {
            "name": name or "Shopify Customer",
            "email": customer.get("email") or body.get("email"),
            "phone": customer.get("phone") or body.get("shipping_address", {}).get("phone"),
            "source": "shopify",
            "message": f"Nueva orden #{body.get('order_number')} — ${body.get('total_price','0')}",
            "campaign": "shopify_order",
        })

    elif topic == "customers/create":
        name = f"{body.get('first_name','')} {body.get('last_name','')}".strip()
        await _ingest(db, tenant, settings, {
            "name": name or "Shopify Customer",
            "email": body.get("email"),
            "phone": body.get("phone"),
            "source": "shopify",
            "message": "Nuevo cliente registrado en Shopify",
            "campaign": "shopify_customer",
        })

    elif topic in ("checkouts/create", "checkouts/update"):
        customer = body.get("customer", {})
        name = f"{customer.get('first_name','')} {customer.get('last_name','')}".strip()
        await _ingest(db, tenant, settings, {
            "name": name or "Visitante",
            "email": customer.get("email") or body.get("email"),
            "phone": customer.get("phone"),
            "source": "shopify",
            "message": f"Abandono de carrito — ${body.get('total_price','0')}",
            "campaign": "shopify_cart_abandoned",
        })

    return {"status": "ok"}


# ── Email inbound ─────────────────────────────────────────────────────────────

@router.post("/email")
async def handle_email_inbound(request: Request, db: Session = Depends(get_db)):
    content_type = request.headers.get("content-type", "")
    if "multipart" in content_type or "form" in content_type:
        form = await request.form()
        from_raw = str(form.get("from", form.get("sender", "unknown@email.com")))
        subject = str(form.get("subject", "Sin asunto"))
        text_body = str(form.get("text", form.get("body-plain", form.get("stripped-text", ""))))
    else:
        body = await request.json()
        from_raw = body.get("from", body.get("sender", "unknown@email.com"))
        subject = body.get("subject", "Sin asunto")
        text_body = body.get("text", body.get("body", ""))

    name_match = re.match(r'^(.+?)\s*<(.+?)>', from_raw)
    if name_match:
        sender_name = name_match.group(1).strip('"').strip()
        sender_email = name_match.group(2).strip()
    else:
        sender_email = from_raw.strip()
        sender_name = sender_email.split("@")[0]

    settings, tenant = _find_tenant(db)
    if not tenant:
        return {"status": "tenant_not_found"}

    await _ingest(db, tenant, settings, {
        "name": sender_name,
        "email": sender_email,
        "source": "email",
        "message": f"{subject}: {text_body[:500]}" if text_body else subject,
        "campaign": "email_inbound",
    })

    return {"status": "ok"}
