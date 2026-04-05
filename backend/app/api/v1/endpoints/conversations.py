import csv
import io
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from app.core.database import get_db, tenant_db_session
from app.core.security import get_current_user
from app.models.core import Tenant, TenantSettings, User
from app.models.tenant import Conversation, Message, Contact, CannedResponse
from app.services import messaging

router = APIRouter()


def _get_tenant(db: Session, current_user: User) -> Tenant:
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant


@router.get("/")
def get_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tenant = _get_tenant(db, current_user)
    with tenant_db_session(tenant.schema_name) as tdb:
        convs = (
            tdb.query(Conversation)
            .order_by(Conversation.updated_at.desc())
            .limit(100)
            .all()
        )
        result = []
        for conv in convs:
            contact = tdb.query(Contact).filter(Contact.id == conv.contact_id).first()
            if not contact:
                continue
            ip_msg = (
                tdb.query(Message)
                .filter(
                    Message.conversation_id == conv.id,
                    Message.sender_type == "contact",
                    Message.metadata_json.isnot(None),
                )
                .order_by(Message.timestamp.desc())
                .first()
            )
            visitor_ip = None
            if ip_msg and ip_msg.metadata_json:
                visitor_ip = ip_msg.metadata_json.get("ip")

            result.append({
                "id": conv.id,
                "channel": conv.channel,
                "status": conv.status,
                "last_message": conv.last_message,
                "updated_at": conv.updated_at.isoformat() if conv.updated_at else None,
                "bot_active": getattr(conv, "bot_active", True),
                "notes": getattr(conv, "notes", None),
                "assigned_to": getattr(conv, "assigned_to", None),
                "contact": {
                    "id": contact.id,
                    "name": contact.name,
                    "phone": contact.phone,
                    "email": contact.email,
                    "lead_score": contact.lead_score or 0,
                    "intent": contact.intent,
                    "ip_address": visitor_ip,
                    "external_id": contact.external_id,
                },
            })
        return result


@router.get("/{conversation_id}/messages")
def get_messages(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tenant = _get_tenant(db, current_user)
    with tenant_db_session(tenant.schema_name) as tdb:
        msgs = (
            tdb.query(Message)
            .filter(Message.conversation_id == conversation_id)
            .order_by(Message.timestamp.asc())
            .all()
        )
        return [
            {
                "id": m.id,
                "sender_type": m.sender_type,
                "content": m.content,
                "content_type": getattr(m, "content_type", "text"),
                "media_url": getattr(m, "media_url", None),
                "timestamp": m.timestamp.isoformat(),
            }
            for m in msgs
        ]


@router.post("/{conversation_id}/send")
async def send_message(
    conversation_id: int,
    content: str,
    content_type: str = "text",
    media_url: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tenant = _get_tenant(db, current_user)
    s = tenant.settings

    wa_phone_id = s.whatsapp_phone_id if s else None
    wa_token = s.whatsapp_access_token if s else None
    ig_token = s.instagram_access_token if s else None
    fb_token = s.facebook_access_token if s else None

    with tenant_db_session(tenant.schema_name) as tdb:
        conv = tdb.query(Conversation).filter(Conversation.id == conversation_id).first()
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")

        contact = tdb.query(Contact).filter(Contact.id == conv.contact_id).first()
        contact_phone = contact.phone if contact else None
        contact_email = contact.email if contact else None
        contact_ext_id = contact.external_id if contact else None

        msg = Message(
            conversation_id=conversation_id,
            sender_type="human",
            content=content,
            content_type=content_type,
            media_url=media_url,
            timestamp=datetime.utcnow(),
        )
        tdb.add(msg)
        conv.last_message = content if content_type == "text" else f"[{content_type}]"
        conv.updated_at = datetime.utcnow()
        tdb.commit()
        channel = conv.channel

    sent = False
    if channel == "whatsapp" and wa_phone_id and wa_token and contact_phone:
        if content_type == "image" and media_url:
            sent = await messaging.send_whatsapp_image(wa_phone_id, wa_token, contact_phone, media_url, content)
        else:
            sent = await messaging.send_whatsapp(wa_phone_id, wa_token, contact_phone, content)
    elif channel == "instagram" and ig_token and contact_ext_id:
        sent = await messaging.send_instagram(ig_token, contact_ext_id, content)
    elif channel == "facebook" and fb_token and contact_ext_id:
        sent = await messaging.send_facebook(fb_token, contact_ext_id, content)
    elif channel == "email" and s and contact_email:
        sent = await messaging.send_email(s, contact_email, "Mensaje de tu equipo", content)
    elif channel in ("web", "webchat"):
        sent = True

    return {"status": "sent", "delivered": sent, "channel": channel}


# ── Human handoff toggle ──────────────────────────────────────────────────────

class HandoffPayload(BaseModel):
    bot_active: bool


@router.patch("/{conversation_id}/handoff")
def toggle_handoff(
    conversation_id: int,
    payload: HandoffPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tenant = _get_tenant(db, current_user)
    with tenant_db_session(tenant.schema_name) as tdb:
        conv = tdb.query(Conversation).filter(Conversation.id == conversation_id).first()
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
        conv.bot_active = payload.bot_active
        tdb.commit()
    return {"conversation_id": conversation_id, "bot_active": payload.bot_active}


# ── Notes ─────────────────────────────────────────────────────────────────────

class NotesPayload(BaseModel):
    notes: str


@router.patch("/{conversation_id}/notes")
def save_notes(
    conversation_id: int,
    payload: NotesPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tenant = _get_tenant(db, current_user)
    with tenant_db_session(tenant.schema_name) as tdb:
        conv = tdb.query(Conversation).filter(Conversation.id == conversation_id).first()
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
        conv.notes = payload.notes
        tdb.commit()
    return {"saved": True}


# ── Agent assignment ──────────────────────────────────────────────────────────

class AssignPayload(BaseModel):
    user_id: Optional[int] = None


@router.patch("/{conversation_id}/assign")
def assign_conversation(
    conversation_id: int,
    payload: AssignPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tenant = _get_tenant(db, current_user)
    with tenant_db_session(tenant.schema_name) as tdb:
        conv = tdb.query(Conversation).filter(Conversation.id == conversation_id).first()
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
        conv.assigned_to = payload.user_id
        tdb.commit()
    return {"conversation_id": conversation_id, "assigned_to": payload.user_id}


# ── Canned responses ──────────────────────────────────────────────────────────

class CannedPayload(BaseModel):
    shortcut: str
    title: str
    content: str


@router.get("/canned-responses")
def get_canned_responses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tenant = _get_tenant(db, current_user)
    with tenant_db_session(tenant.schema_name) as tdb:
        items = tdb.query(CannedResponse).order_by(CannedResponse.title).all()
        return [{"id": c.id, "shortcut": c.shortcut, "title": c.title, "content": c.content} for c in items]


@router.post("/canned-responses")
def create_canned_response(
    payload: CannedPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tenant = _get_tenant(db, current_user)
    with tenant_db_session(tenant.schema_name) as tdb:
        item = CannedResponse(shortcut=payload.shortcut, title=payload.title, content=payload.content)
        tdb.add(item)
        tdb.commit()
        tdb.refresh(item)
        return {"id": item.id, "shortcut": item.shortcut, "title": item.title, "content": item.content}


@router.delete("/canned-responses/{item_id}")
def delete_canned_response(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tenant = _get_tenant(db, current_user)
    with tenant_db_session(tenant.schema_name) as tdb:
        item = tdb.query(CannedResponse).filter(CannedResponse.id == item_id).first()
        if not item:
            raise HTTPException(status_code=404, detail="Not found")
        tdb.delete(item)
        tdb.commit()
    return {"deleted": True}


# ── WhatsApp templates ────────────────────────────────────────────────────────

@router.get("/whatsapp-templates")
async def get_whatsapp_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    import httpx
    tenant = _get_tenant(db, current_user)
    s = tenant.settings
    if not s or not s.whatsapp_access_token:
        raise HTTPException(status_code=400, detail="WhatsApp no configurado")
    waba_id = getattr(s, "waba_id", None)
    if not waba_id:
        raise HTTPException(status_code=400, detail="WABA ID no configurado")
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(
            f"https://graph.facebook.com/v20.0/{waba_id}/message_templates",
            params={"access_token": s.whatsapp_access_token, "limit": 50},
        )
        data = r.json()
        if "data" not in data:
            raise HTTPException(status_code=400, detail=data.get("error", {}).get("message", "Error"))
        return [
            {
                "id": t.get("id"),
                "name": t.get("name"),
                "status": t.get("status"),
                "language": t.get("language"),
                "category": t.get("category"),
                "components": t.get("components", []),
            }
            for t in data["data"]
            if t.get("status") == "APPROVED"
        ]


class TemplateSendPayload(BaseModel):
    conversation_id: int
    template_name: str
    language_code: str = "es"
    components: list = []


@router.post("/whatsapp-templates/send")
async def send_whatsapp_template(
    payload: TemplateSendPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    import httpx
    tenant = _get_tenant(db, current_user)
    s = tenant.settings
    if not s or not s.whatsapp_access_token or not s.whatsapp_phone_id:
        raise HTTPException(status_code=400, detail="WhatsApp no configurado")

    with tenant_db_session(tenant.schema_name) as tdb:
        conv = tdb.query(Conversation).filter(Conversation.id == payload.conversation_id).first()
        if not conv:
            raise HTTPException(status_code=404, detail="Conversación no encontrada")
        contact = tdb.query(Contact).filter(Contact.id == conv.contact_id).first()
        if not contact or not contact.phone:
            raise HTTPException(status_code=400, detail="Contacto sin número de teléfono")
        phone = contact.phone.lstrip("+")

    async with httpx.AsyncClient(timeout=10) as client:
        body = {
            "messaging_product": "whatsapp",
            "to": phone,
            "type": "template",
            "template": {
                "name": payload.template_name,
                "language": {"code": payload.language_code},
            },
        }
        if payload.components:
            body["template"]["components"] = payload.components
        r = await client.post(
            f"https://graph.facebook.com/v20.0/{s.whatsapp_phone_id}/messages",
            headers={"Authorization": f"Bearer {s.whatsapp_access_token}", "Content-Type": "application/json"},
            json=body,
        )
        data = r.json()
        if "messages" not in data:
            raise HTTPException(status_code=400, detail=data.get("error", {}).get("message", "Error al enviar template"))

    # Save to DB
    with tenant_db_session(tenant.schema_name) as tdb:
        msg = Message(
            conversation_id=payload.conversation_id,
            sender_type="human",
            content=f"[Template: {payload.template_name}]",
            timestamp=datetime.utcnow(),
        )
        tdb.add(msg)
        tdb.commit()

    return {"sent": True, "template": payload.template_name}


# ── Import CSV contacts ───────────────────────────────────────────────────────

@router.post("/contacts/import-csv")
async def import_contacts_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Import contacts from CSV. Expected columns (case-insensitive):
    name, phone, email, source, campaign
    """
    tenant = _get_tenant(db, current_user)
    content = await file.read()
    try:
        text = content.decode("utf-8-sig")  # handle BOM
        reader = csv.DictReader(io.StringIO(text))
        # Normalize headers
        rows = []
        for row in reader:
            normalized = {k.strip().lower(): v.strip() for k, v in row.items()}
            rows.append(normalized)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al leer CSV: {e}")

    imported = 0
    skipped = 0
    with tenant_db_session(tenant.schema_name) as tdb:
        for row in rows:
            name = row.get("name") or row.get("nombre") or ""
            phone = row.get("phone") or row.get("telefono") or row.get("teléfono") or ""
            email = row.get("email") or row.get("correo") or ""
            source = row.get("source") or row.get("fuente") or "import"
            campaign = row.get("campaign") or row.get("campaña") or ""

            if not name and not phone and not email:
                skipped += 1
                continue

            # Skip duplicates by phone or email
            existing = None
            if phone:
                existing = tdb.query(Contact).filter(Contact.phone == phone).first()
            if not existing and email:
                existing = tdb.query(Contact).filter(Contact.email == email).first()
            if existing:
                skipped += 1
                continue

            contact = Contact(
                name=name or phone or email,
                phone=phone or None,
                email=email or None,
                source=source,
                campaign=campaign or None,
                last_interaction=datetime.utcnow(),
            )
            tdb.add(contact)
            imported += 1
        tdb.commit()

    return {"imported": imported, "skipped": skipped, "total": len(rows)}
