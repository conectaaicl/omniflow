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
    external_id = lead_data.get("external_id")

    # Deduplicate: external_id → phone → email
    contact = None
    if external_id:
        contact = db.query(Contact).filter(Contact.external_id == external_id).first()
    if not contact and phone:
        contact = db.query(Contact).filter(Contact.phone == phone).first()
    if not contact and email:
        contact = db.query(Contact).filter(Contact.email == email).first()

    if not contact:
        contact = Contact(
            name=lead_data.get("name", "Visitante"),
            phone=phone,
            email=email,
            external_id=external_id,
            source=lead_data.get("source"),
            campaign=lead_data.get("campaign"),
            lead_score=score,
            intent=intent,
        )
        db.add(contact)
        db.flush()
    else:
        # Update name if still placeholder
        new_name = lead_data.get("name", "")
        if new_name and contact.name in ("Unknown", "Visitante", "Visitante Web", ""):
            contact.name = new_name
        # Persist external_id if first time linking
        if external_id and not contact.external_id:
            contact.external_id = external_id
        contact.lead_score = max(contact.lead_score or 0, score)
        contact.intent = intent
        contact.last_interaction = datetime.utcnow()

    # One conversation per (contact, channel)
    conversation = db.query(Conversation).filter(
        Conversation.contact_id == contact.id,
        Conversation.channel == lead_data.get("source"),
    ).first()

    if not conversation:
        conversation = Conversation(
            contact_id=contact.id,
            channel=lead_data.get("source"),
            status="open",
        )
        db.add(conversation)
        db.flush()

    if lead_data.get("message"):
        msg_meta = {}
        if lead_data.get("ip_address"):
            msg_meta["ip"] = lead_data["ip_address"]
        msg = Message(
            conversation_id=conversation.id,
            sender_type="contact",
            content=lead_data["message"],
            timestamp=datetime.utcnow(),
            metadata_json=msg_meta or None,
        )
        db.add(msg)
        conversation.last_message = lead_data["message"]
        conversation.updated_at = datetime.utcnow()

    db.commit()
    return contact, conversation


def handle_incoming_message(db: Session, message_data: dict, tenant_id: int):
    return ingest_lead(db, message_data, tenant_id)
