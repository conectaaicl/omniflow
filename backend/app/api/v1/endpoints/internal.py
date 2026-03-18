"""
Internal API endpoints for n8n automation (no JWT — uses shared API secret).
Auth: Header  X-API-Secret: <N8N_API_SECRET from env>

Endpoints:
  GET  /internal/contact/{external_id}?subdomain=osw   — get contact + conversation
  POST /internal/contact/upsert                         — create/update contact
  POST /internal/deal/upsert                            — create or move deal
  POST /internal/webchat/inject                         — inject bot message into chat
  POST /internal/quote/save                             — save generated quote
  GET  /internal/contact/list?subdomain=osw&limit=50   — recent contacts
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.core.config import settings
from app.core.database import get_db, tenant_db_session
from app.models.core import Tenant
from app.models.tenant import Contact, Conversation, Message, Deal, PipelineStage

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
