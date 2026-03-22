from typing import Any
from fastapi import APIRouter, Request, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.schemas.tenant import TenantCreate, TenantRead, PublicTenantInfo, TenantSettingsUpdate, TenantSettingsRead
from app.services.tenant import create_new_tenant, get_tenant_by_host
from app.core.security import get_password_hash, get_current_user
from app.models.core import Tenant, TenantSettings, User
from app.models.tenant import Contact, Deal
from app.core.database import get_db, tenant_db_session

router = APIRouter()


def _settings_to_dict(s: TenantSettings) -> dict:
    """Serialize TenantSettings ORM → dict with has_X flags."""
    return {
        "logo_url": s.logo_url,
        "primary_color": s.primary_color or "#7c3aed",
        "favicon_url": s.favicon_url,
        "support_email": s.support_email,
        "support_phone": s.support_phone,
        "timezone": s.timezone or "UTC",
        "language": s.language or "es",
        # Channel flags
        "has_whatsapp": bool(s.whatsapp_phone_id and s.whatsapp_access_token),
        "has_instagram": bool(s.instagram_page_id and s.instagram_access_token),
        "has_facebook": bool(s.facebook_page_id and s.facebook_access_token),
        "has_tiktok": bool(s.tiktok_app_id and s.tiktok_app_secret),
        "has_shopify": bool(s.shopify_shop_domain and s.shopify_access_token),
        "has_email": bool(
            (s.email_provider == "sendgrid" and s.sendgrid_api_key)
            or (s.email_provider == "mailgun" and s.mailgun_api_key)
            or (s.smtp_host and s.smtp_user)
        ),
        "has_ai": bool(s.openai_api_key),
        # Web Chat
        "webchat_enabled": s.webchat_enabled if s.webchat_enabled is not None else True,
        "webchat_greeting": s.webchat_greeting,
        "webchat_bot_name": s.webchat_bot_name,
        "webchat_color": s.webchat_color,
        "webchat_system_prompt": getattr(s, "webchat_system_prompt", None),
        # AI
        "ai_provider": getattr(s, "ai_provider", "groq") or "groq",
        "ai_model": getattr(s, "ai_model", None),
        # n8n
        "n8n_url": s.n8n_url,
        "n8n_webhook_path": s.n8n_webhook_path,
    }


def _get_tenant(db: Session, current_user: User) -> Tenant:
    """Get the tenant for the authenticated user."""
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    if not tenant.is_active:
        raise HTTPException(status_code=403, detail="Tenant is suspended")
    return tenant


# ── Public endpoint (no auth required) ───────────────────────────────────────

@router.get("/public-info")
def get_public_info(request: Request, db: Session = Depends(get_db)):
    host = request.headers.get("host", "")
    tenant = get_tenant_by_host(db, host)
    if not tenant:
        # Fallback to first tenant for single-instance setups
        tenant = db.query(Tenant).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    s = tenant.settings
    return {
        "name": tenant.name,
        "subdomain": tenant.subdomain,
        "custom_domain": tenant.custom_domain,
        "settings": _settings_to_dict(s) if s else {},
    }


@router.post("/register", response_model=TenantRead)
def register_tenant(tenant_in: TenantCreate, db: Session = Depends(get_db)):
    """Public registration — creates a new tenant account."""
    existing = db.query(Tenant).filter(
        (Tenant.subdomain == tenant_in.subdomain) | (Tenant.name == tenant_in.name)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Subdomain or company name already taken",
        )
    hashed_password = get_password_hash(tenant_in.password)
    new_tenant = create_new_tenant(
        db,
        tenant_name=tenant_in.name,
        subdomain=tenant_in.subdomain,
        admin_email=tenant_in.admin_email,
        hashed_password=hashed_password,
    )
    return new_tenant


# ── Authenticated endpoints ───────────────────────────────────────────────────

@router.get("/settings")
def get_tenant_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tenant = _get_tenant(db, current_user)
    s = tenant.settings
    if not s:
        raise HTTPException(status_code=404, detail="Settings not found")
    return {
        **_settings_to_dict(s),
        # Credential fields (partial — never expose raw tokens)
        "whatsapp_phone_id": s.whatsapp_phone_id or "",
        "whatsapp_verify_token": s.whatsapp_verify_token or "",
        "whatsapp_number": s.whatsapp_number or "",
        "instagram_page_id": s.instagram_page_id or "",
        "instagram_verify_token": s.instagram_verify_token or "",
        "facebook_page_id": s.facebook_page_id or "",
        "facebook_verify_token": s.facebook_verify_token or "",
        "tiktok_app_id": s.tiktok_app_id or "",
        "shopify_shop_domain": s.shopify_shop_domain or "",
        "email_provider": s.email_provider or "",
        "smtp_host": s.smtp_host or "",
        "smtp_port": s.smtp_port,
        "smtp_user": s.smtp_user or "",
        "smtp_from_address": s.smtp_from_address or "",
        "mailgun_domain": s.mailgun_domain or "",
        # Tenant metadata
        "tenant_name": tenant.name,
        "tenant_subdomain": tenant.subdomain,
    }


@router.patch("/settings")
def update_tenant_settings(
    settings_in: TenantSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tenant = _get_tenant(db, current_user)
    s = tenant.settings
    if not s:
        raise HTTPException(status_code=404, detail="Settings not found")
    for field, value in settings_in.model_dump(exclude_unset=True).items():
        if hasattr(s, field):
            setattr(s, field, value)
    db.add(s)
    db.commit()
    db.refresh(s)
    return _settings_to_dict(s)


@router.get("/dashboard-stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from datetime import datetime, timedelta, time as _time
    from app.models.tenant import Conversation as TenantConversation
    tenant = _get_tenant(db, current_user)
    with tenant_db_session(tenant.schema_name) as tdb:
        total_contacts = tdb.query(Contact).count()
        hot_leads = tdb.query(Contact).filter(Contact.lead_score > 70).count()
        total_deals = tdb.query(Deal).count()
        won_deals = tdb.query(Deal).filter(Deal.status == "won").count()
        sources = (
            tdb.query(Contact.source, func.count(Contact.id))
            .group_by(Contact.source)
            .all()
        )

        # Weekly activity: last 7 days (today = index 6)
        today = datetime.utcnow().date()
        day_labels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
        weekly = []
        for i in range(6, -1, -1):
            day = today - timedelta(days=i)
            day_start = datetime.combine(day, _time(0, 0, 0))
            day_end = datetime.combine(day, _time(23, 59, 59))
            leads = tdb.query(Contact).filter(
                Contact.last_interaction >= day_start,
                Contact.last_interaction <= day_end,
            ).count()
            convs = tdb.query(TenantConversation).filter(
                TenantConversation.updated_at >= day_start,
                TenantConversation.updated_at <= day_end,
            ).count()
            label = "Hoy" if i == 0 else day_labels[day.weekday()]
            weekly.append({"day": label, "leads": leads, "conversaciones": convs})

        return {
            "stats": {
                "total_contacts": total_contacts,
                "hot_leads": hot_leads,
                "total_deals": total_deals,
                "won_deals": won_deals,
                "conversion_rate": (won_deals / total_deals * 100) if total_deals > 0 else 0,
            },
            "source_distribution": [{"source": s[0] or "unknown", "count": s[1]} for s in sources],
            "weekly_activity": weekly,
        }


@router.post("/refresh-whatsapp-token")
async def refresh_whatsapp_token(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Exchange current WhatsApp token for a new 60-day token via Meta Graph API."""
    import httpx
    tenant = _get_tenant(db, current_user)
    s = tenant.settings
    if not s or not s.whatsapp_access_token:
        raise HTTPException(status_code=400, detail="No hay token guardado")
    if not s.meta_app_id or not s.meta_app_secret:
        raise HTTPException(status_code=400, detail="Falta App ID o App Secret de Meta")

    async with httpx.AsyncClient() as client:
        try:
            r = await client.get(
                "https://graph.facebook.com/oauth/access_token",
                params={
                    "grant_type": "fb_exchange_token",
                    "client_id": s.meta_app_id,
                    "client_secret": s.meta_app_secret,
                    "fb_exchange_token": s.whatsapp_access_token,
                },
                timeout=10,
            )
            data = r.json()
            if "access_token" not in data:
                err = data.get("error", {}).get("message", "Token refresh failed")
                raise HTTPException(status_code=400, detail=err)
            s.whatsapp_access_token = data["access_token"]
            db.commit()
            expires_in = data.get("expires_in", 5183944)
            days = round(expires_in / 86400)
            return {"refreshed": True, "expires_in_days": days}
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


@router.post("/test-whatsapp")
async def test_whatsapp_send(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send a test WhatsApp message using the tenant's saved credentials."""
    import httpx
    tenant = _get_tenant(db, current_user)
    s = tenant.settings
    if not s or not s.whatsapp_phone_id or not s.whatsapp_access_token:
        raise HTTPException(status_code=400, detail="WhatsApp no configurado. Guarda Phone Number ID y Access Token primero.")

    to = payload.get("to", "").strip().replace("+", "").replace(" ", "")
    if not to:
        raise HTTPException(status_code=400, detail="Número de destino requerido")

    msg_body = payload.get("message", "✅ Prueba de conexión OmniFlow — WhatsApp configurado correctamente.")

    url = f"https://graph.facebook.com/v19.0/{s.whatsapp_phone_id}/messages"
    headers = {"Authorization": f"Bearer {s.whatsapp_access_token}", "Content-Type": "application/json"}
    data = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "text",
        "text": {"body": msg_body},
    }
    async with httpx.AsyncClient() as client:
        try:
            r = await client.post(url, json=data, headers=headers, timeout=10)
            if r.status_code == 200:
                return {"ok": True, "message_id": r.json().get("messages", [{}])[0].get("id")}
            return {"ok": False, "error": r.json()}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
