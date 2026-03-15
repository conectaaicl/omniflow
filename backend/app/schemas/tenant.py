from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class TenantBase(BaseModel):
    name: str
    subdomain: str


class TenantCreate(TenantBase):
    admin_email: EmailStr
    password: str


class TenantRead(TenantBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TenantSettingsRead(BaseModel):
    logo_url: Optional[str] = None
    primary_color: str
    favicon_url: Optional[str] = None
    support_email: Optional[str] = None
    whatsapp_number: Optional[str] = None
    timezone: str
    language: str

    class Config:
        from_attributes = True


class PublicTenantInfo(BaseModel):
    name: str
    subdomain: str
    custom_domain: Optional[str] = None
    settings: TenantSettingsRead

    class Config:
        from_attributes = True


class TenantSettingsUpdate(BaseModel):
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    support_email: Optional[str] = None
    whatsapp_number: Optional[str] = None
    timezone: Optional[str] = None
    language: Optional[str] = None
