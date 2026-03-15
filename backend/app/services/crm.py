from datetime import datetime
from sqlalchemy.orm import Session
from app.services.ai import analyze_message_intent, calculate_lead_score
from app.models.tenant import Contact, Conversation, Message


def ingest_lead(db: Session, lead_data: dict, tenant_id: int):
    message_content = lead_data.get("message", "")
    intent = analyze_message_intent(message_content)
    score = calculate_lead_score(message_content, lead_data.get("source", "web"))

    phone = lead_data.get("phone")
    email = lead_data.get("email")

    contact = None
    if phone:
        contact = db.query(Contact).filter(Contact.phone == phone).first()
    elif email:
        contact = db.query(Contact).filter(Contact.email == email).first()

    if not contact:
        contact = Contact(
            name=lead_data.get("name", "Unknown"),
            phone=phone,
            email=email,
            source=lead_data.get("source"),
            campaign=lead_data.get("campaign"),
            lead_score=score,
            intent=intent
        )
        db.add(contact)
        db.flush()
    else:
        contact.lead_score = max(contact.lead_score, score)
        contact.intent = intent
        contact.last_interaction = datetime.utcnow()

    conversation = db.query(Conversation).filter(
        Conversation.contact_id == contact.id,
        Conversation.channel == lead_data.get("source")
    ).first()

    if not conversation:
        conversation = Conversation(
            contact_id=contact.id,
            channel=lead_data.get("source"),
            status="open"
        )
        db.add(conversation)
        db.flush()

    if lead_data.get("message"):
        message = Message(
            conversation_id=conversation.id,
            sender_type="contact",
            content=lead_data.get("message"),
            timestamp=datetime.utcnow()
        )
        db.add(message)
        conversation.last_message = lead_data.get("message")
        conversation.updated_at = datetime.utcnow()

    db.commit()
    return contact, conversation


def handle_incoming_message(db: Session, message_data: dict, tenant_id: int):
    return ingest_lead(db, message_data, tenant_id)
