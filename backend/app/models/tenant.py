from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    phone = Column(String, index=True, nullable=True)
    email = Column(String, index=True, nullable=True)
    external_id = Column(String, index=True, nullable=True)
    source = Column(String)
    campaign = Column(String, nullable=True)
    last_interaction = Column(DateTime, default=datetime.utcnow)
    lead_score = Column(Integer, default=0)
    intent = Column(String, nullable=True)

    conversations = relationship("Conversation", back_populates="contact")
    deals = relationship("Deal", back_populates="contact")


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    contact_id = Column(Integer, ForeignKey("contacts.id"))
    channel = Column(String)
    status = Column(String, default="open")
    last_message = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    bot_active = Column(Boolean, default=True)
    notes = Column(Text, nullable=True)           # internal agent notes
    assigned_to = Column(Integer, nullable=True)  # user_id of assigned agent

    contact = relationship("Contact", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"))
    sender_type = Column(String)
    content = Column(Text)
    content_type = Column(String, default="text")  # text | image | document | audio
    media_url = Column(String, nullable=True)       # outbound media URL
    timestamp = Column(DateTime, default=datetime.utcnow)
    is_read = Column(Boolean, default=False)
    metadata_json = Column(JSON, nullable=True)

    conversation = relationship("Conversation", back_populates="messages")


class CannedResponse(Base):
    __tablename__ = "canned_responses"

    id = Column(Integer, primary_key=True, index=True)
    shortcut = Column(String, index=True)   # e.g. "/precio"
    title = Column(String)                  # display name
    content = Column(Text)                  # the message text
    created_at = Column(DateTime, default=datetime.utcnow)


class Pipeline(Base):
    __tablename__ = "pipelines"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)

    stages = relationship("PipelineStage", back_populates="pipeline")


class PipelineStage(Base):
    __tablename__ = "pipeline_stages"
    id = Column(Integer, primary_key=True, index=True)
    pipeline_id = Column(Integer, ForeignKey("pipelines.id"))
    name = Column(String)
    order = Column(Integer)

    pipeline = relationship("Pipeline", back_populates="stages")
    deals = relationship("Deal", back_populates="stage")


class Deal(Base):
    __tablename__ = "deals"
    id = Column(Integer, primary_key=True, index=True)
    contact_id = Column(Integer, ForeignKey("contacts.id"))
    stage_id = Column(Integer, ForeignKey("pipeline_stages.id"))
    title = Column(String)
    value = Column(Float, default=0.0)
    status = Column(String, default="open")
    created_at = Column(DateTime, default=datetime.utcnow)

    contact = relationship("Contact", back_populates="deals")
    stage = relationship("PipelineStage", back_populates="deals")
