from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class TenantCreate(BaseModel):
    name: str
    subdomain: str
    admin_email: EmailStr
    password: str


class TenantRead(BaseModel):
    id: int
    name: str
    subdomain: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TenantSettingsRead(BaseModel):
    logo_url: Optional[str] = None
    primary_color: str = "#7c3aed"
    favicon_url: Optional[str] = None
    support_email: Optional[str] = None
    support_phone: Optional[str] = None
    timezone: str = "UTC"
    language: str = "es"
    has_whatsapp: bool = False
    has_instagram: bool = False
    has_facebook: bool = False
    has_tiktok: bool = False
    has_shopify: bool = False
    has_email: bool = False
    webchat_enabled: bool = True
    webchat_greeting: Optional[str] = None
    webchat_bot_name: Optional[str] = None
    webchat_color: Optional[str] = None
    webchat_system_prompt: Optional[str] = None
    ai_provider: Optional[str] = "groq"
    ai_model: Optional[str] = None
    has_ai: bool = False
    n8n_url: Optional[str] = None
    n8n_webhook_path: Optional[str] = None

    class Config:
        from_attributes = True


class TenantSettingsUpdate(BaseModel):
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    support_email: Optional[str] = None
    support_phone: Optional[str] = None
    timezone: Optional[str] = None
    language: Optional[str] = None
    # WhatsApp
    whatsapp_phone_id: Optional[str] = None
    whatsapp_access_token: Optional[str] = None
    whatsapp_verify_token: Optional[str] = None
    whatsapp_number: Optional[str] = None
    # Instagram
    instagram_page_id: Optional[str] = None
    instagram_access_token: Optional[str] = None
    instagram_verify_token: Optional[str] = None
    # Facebook
    facebook_page_id: Optional[str] = None
    facebook_access_token: Optional[str] = None
    facebook_verify_token: Optional[str] = None
    # TikTok
    tiktok_app_id: Optional[str] = None
    tiktok_app_secret: Optional[str] = None
    tiktok_access_token: Optional[str] = None
    # Shopify
    shopify_shop_domain: Optional[str] = None
    shopify_access_token: Optional[str] = None
    shopify_webhook_secret: Optional[str] = None
    # Email
    email_provider: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from_address: Optional[str] = None
    sendgrid_api_key: Optional[str] = None
    mailgun_api_key: Optional[str] = None
    mailgun_domain: Optional[str] = None
    # Web Chat + AI Agent
    webchat_enabled: Optional[bool] = None
    webchat_greeting: Optional[str] = None
    webchat_bot_name: Optional[str] = None
    webchat_color: Optional[str] = None
    webchat_system_prompt: Optional[str] = None
    openai_api_key: Optional[str] = None
    ai_provider: Optional[str] = None
    ai_model: Optional[str] = None
    # n8n
    n8n_url: Optional[str] = None
    n8n_webhook_path: Optional[str] = None


class PublicTenantInfo(BaseModel):
    name: str
    subdomain: str
    custom_domain: Optional[str] = None
    settings: TenantSettingsRead

    class Config:
        from_attributes = True
