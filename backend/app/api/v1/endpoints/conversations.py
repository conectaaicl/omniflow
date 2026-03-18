from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db, tenant_db_session
from app.core.security import get_current_user
from app.models.core import Tenant, TenantSettings, User
from app.models.tenant import Conversation, Message, Contact
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
            # Find most recent visitor message with IP metadata
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
                "timestamp": m.timestamp.isoformat(),
            }
            for m in msgs
        ]


@router.post("/{conversation_id}/send")
async def send_message(
    conversation_id: int,
    content: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tenant = _get_tenant(db, current_user)
    s = tenant.settings

    # Read credentials before context switch (avoid lazy-load issues)
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
            timestamp=datetime.utcnow(),
        )
        tdb.add(msg)
        conv.last_message = content
        conv.updated_at = datetime.utcnow()
        tdb.commit()
        channel = conv.channel

    sent = False
    if channel == "whatsapp" and wa_phone_id and wa_token and contact_phone:
        sent = await messaging.send_whatsapp(wa_phone_id, wa_token, contact_phone, content)
    elif channel == "instagram" and ig_token and contact_ext_id:
        sent = await messaging.send_instagram(ig_token, contact_ext_id, content)
    elif channel == "facebook" and fb_token and contact_ext_id:
        sent = await messaging.send_facebook(fb_token, contact_ext_id, content)
    elif channel == "email" and s and contact_email:
        sent = await messaging.send_email(s, contact_email, "Mensaje de tu equipo", content)
    elif channel == "web":
        sent = True  # Saved to DB, widget polls for it

    return {"status": "sent", "delivered": sent, "channel": channel}
