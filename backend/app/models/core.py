from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    schema_name = Column(String, unique=True, index=True)
    subdomain = Column(String, unique=True, index=True)
    custom_domain = Column(String, unique=True, index=True, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    settings = relationship("TenantSettings", back_populates="tenant", uselist=False)
    users = relationship("User", back_populates="tenant")


class TenantSettings(Base):
    __tablename__ = "tenant_settings"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))

    # Branding
    logo_url = Column(String, nullable=True)
    primary_color = Column(String, default="#7c3aed")
    favicon_url = Column(String, nullable=True)
    support_email = Column(String, nullable=True)
    support_phone = Column(String, nullable=True)
    timezone = Column(String, default="UTC")
    language = Column(String, default="es")

    # WhatsApp Business API (Meta Cloud)
    whatsapp_phone_id = Column(String, nullable=True)
    whatsapp_access_token = Column(String, nullable=True)
    whatsapp_verify_token = Column(String, nullable=True)
    whatsapp_number = Column(String, nullable=True)

    # Instagram (Meta Graph API)
    instagram_page_id = Column(String, nullable=True)
    instagram_access_token = Column(String, nullable=True)
    instagram_verify_token = Column(String, nullable=True)

    # Facebook Messenger + Lead Ads (Meta Graph API)
    facebook_page_id = Column(String, nullable=True)
    facebook_access_token = Column(String, nullable=True)
    facebook_verify_token = Column(String, nullable=True)

    # TikTok Lead Gen
    tiktok_app_id = Column(String, nullable=True)
    tiktok_app_secret = Column(String, nullable=True)
    tiktok_access_token = Column(String, nullable=True)

    # Shopify
    shopify_shop_domain = Column(String, nullable=True)
    shopify_access_token = Column(String, nullable=True)
    shopify_webhook_secret = Column(String, nullable=True)

    # Email (SMTP or SendGrid)
    email_provider = Column(String, nullable=True)
    smtp_host = Column(String, nullable=True)
    smtp_port = Column(Integer, nullable=True)
    smtp_user = Column(String, nullable=True)
    smtp_password = Column(String, nullable=True)
    smtp_from_address = Column(String, nullable=True)
    sendgrid_api_key = Column(String, nullable=True)
    mailgun_api_key = Column(String, nullable=True)
    mailgun_domain = Column(String, nullable=True)

    # MailSaaS (ConectaAI Mail)
    mailsaas_url = Column(String, nullable=True, default="https://mail.conectaai.cl")
    mailsaas_api_key = Column(String, nullable=True)

    # Web Chat Widget
    webchat_enabled = Column(Boolean, default=True)
    webchat_greeting = Column(String, default="¡Hola! ¿En qué puedo ayudarte?")
    webchat_bot_name = Column(String, default="Asistente")
    webchat_color = Column(String, nullable=True)
    webchat_system_prompt = Column(Text, nullable=True)

    # AI Sales Agent
    openai_api_key = Column(String, nullable=True)
    ai_provider = Column(String, default="groq")
    ai_model = Column(String, nullable=True)

    # Meta App credentials (for token refresh)
    meta_app_id = Column(String, nullable=True)
    meta_app_secret = Column(String, nullable=True)

    # n8n
    n8n_url = Column(String, nullable=True)
    n8n_webhook_path = Column(String, nullable=True)

    tenant = relationship("Tenant", back_populates="settings")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    tenant = relationship("Tenant", back_populates="users")


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    permissions = Column(JSON, default={})
    created_at = Column(DateTime, default=datetime.utcnow)
