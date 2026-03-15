from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db, tenant_db_session
from app.models.core import Tenant
from app.models.tenant import Conversation, Message, Contact

router = APIRouter()


@router.get("/")
def get_conversations(db: Session = Depends(get_db)):
    tenant = db.query(Tenant).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    with tenant_db_session(tenant.schema_name) as tenant_db:
        conversations = tenant_db.query(Conversation).order_by(Conversation.updated_at.desc()).all()
        result = []
        for conv in conversations:
            contact = tenant_db.query(Contact).filter(Contact.id == conv.contact_id).first()
            result.append({
                "id": conv.id,
                "channel": conv.channel,
                "status": conv.status,
                "last_message": conv.last_message,
                "updated_at": conv.updated_at,
                "contact": {
                    "id": contact.id,
                    "name": contact.name,
                    "phone": contact.phone,
                    "lead_score": contact.lead_score,
                    "intent": contact.intent
                }
            })
        return result


@router.get("/{conversation_id}/messages")
def get_messages(conversation_id: int, db: Session = Depends(get_db)):
    tenant = db.query(Tenant).first()
    with tenant_db_session(tenant.schema_name) as tenant_db:
        messages = tenant_db.query(Message).filter(
            Message.conversation_id == conversation_id
        ).order_by(Message.timestamp.asc()).all()
        return messages


@router.post("/{conversation_id}/send")
def send_message(conversation_id: int, content: str, db: Session = Depends(get_db)):
    tenant = db.query(Tenant).first()
    with tenant_db_session(tenant.schema_name) as tenant_db:
        new_msg = Message(
            conversation_id=conversation_id,
            sender_type="human",
            content=content
        )
        tenant_db.add(new_msg)
        conv = tenant_db.query(Conversation).filter(Conversation.id == conversation_id).first()
        conv.last_message = content
        conv.updated_at = datetime.utcnow()
        tenant_db.commit()
    return {"status": "sent"}
