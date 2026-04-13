"""
Channels API — WhatsApp Embedded Signup, send, status.

POST /channels/whatsapp/embedded-signup  → exchange Meta code → save encrypted token → clone n8n workflows
GET  /channels/status                    → estado de todos los canales del tenant
DELETE /channels/whatsapp                → desconectar
POST /channels/whatsapp/send             → enviar mensaje via Cloud API
"""
import httpx
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db, tenant_db_session
from app.core.security import get_current_user
from app.models.core import Tenant, TenantSettings
from app.services.encryption import encrypt_token, safe_decrypt
from app.services.n8n_manager import provision_tenant_workflows, deprovision_tenant_workflows

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────────────

class EmbeddedSignupRequest(BaseModel):
    code: str                    # code from FB.login() callback
    phone_number_id: str | None = None  # optional, Meta also sends via webhook
    waba_id: str | None = None


class SendMessageRequest(BaseModel):
    to: str          # recipient phone (E.164: +56912345678)
    message: str
    message_type: str = "text"   # text | template


class ChannelStatusResponse(BaseModel):
    whatsapp: dict
    instagram: dict
    facebook: dict
    n8n_workflows: dict


# ── Helpers ──────────────────────────────────────────────────────────────────

def _get_settings(db: Session, tenant_id: int) -> TenantSettings:
    s = db.query(TenantSettings).filter(TenantSettings.tenant_id == tenant_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Tenant settings not found")
    return s


async def _exchange_code_for_token(code: str) -> dict:
    """Exchange OAuth code for a long-lived access token via Meta Graph API."""
    if not settings.META_APP_ID or not settings.META_APP_SECRET:
        raise HTTPException(status_code=503, detail="META_APP_ID / META_APP_SECRET not configured")

    async with httpx.AsyncClient(timeout=20) as client:
        # Step 1: Exchange code for short-lived token
        resp = await client.get(
            "https://graph.facebook.com/oauth/access_token",
            params={
                "client_id": settings.META_APP_ID,
                "client_secret": settings.META_APP_SECRET,
                "redirect_uri": settings.FRONTEND_URL,
                "code": code,
            },
        )
        if not resp.is_success:
            raise HTTPException(status_code=400, detail=f"Meta token exchange failed: {resp.text[:300]}")

        short_token = resp.json().get("access_token")
        if not short_token:
            raise HTTPException(status_code=400, detail="No access_token in Meta response")

        # Step 2: Exchange for long-lived token (60 days)
        resp2 = await client.get(
            "https://graph.facebook.com/oauth/access_token",
            params={
                "grant_type": "fb_exchange_token",
                "client_id": settings.META_APP_ID,
                "client_secret": settings.META_APP_SECRET,
                "fb_exchange_token": short_token,
            },
        )
        if not resp2.is_success:
            # Fall back to short-lived if exchange fails
            return {"access_token": short_token, "token_type": "bearer"}

        return resp2.json()


async def _get_waba_info(access_token: str) -> dict:
    """Fetch WhatsApp Business Account info from Meta."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://graph.facebook.com/v20.0/me/whatsapp_business_account",
                params={"access_token": access_token},
            )
            if resp.is_success:
                return resp.json()
    except Exception:
        pass
    return {}


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/whatsapp/embedded-signup")
async def whatsapp_embedded_signup(
    body: EmbeddedSignupRequest,
    background_tasks: BackgroundTasks,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Called after the user completes the FB Embedded Signup flow.
    1. Exchange code for long-lived access token
    2. Save encrypted token + phone_number_id + waba_id to tenant_settings
    3. Clone + activate n8n workflows (background)
    """
    s = _get_settings(db, current_user.tenant_id)
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()

    # Exchange code for token
    token_data = await _exchange_code_for_token(body.code)
    access_token = token_data["access_token"]

    # Get WABA info if not provided
    waba_id = body.waba_id
    phone_number_id = body.phone_number_id
    if not waba_id:
        waba_info = await _get_waba_info(access_token)
        waba_id = waba_info.get("id") or ""

    # Encrypt and save
    encrypted = encrypt_token(access_token)
    s.wa_token_encrypted = encrypted
    s.whatsapp_access_token = None  # clear plain-text field
    s.waba_id = waba_id or ""
    if phone_number_id:
        s.whatsapp_phone_id = phone_number_id
    s.wa_status = "connected"
    db.commit()
    db.refresh(s)

    # Clone n8n workflows in background
    if settings.N8N_API_KEY and settings.N8N_URL and s.whatsapp_phone_id:
        background_tasks.add_task(
            _provision_workflows,
            tenant_id=current_user.tenant_id,
            tenant_name=tenant.name if tenant else f"Tenant {current_user.tenant_id}",
            phone_number_id=s.whatsapp_phone_id,
            access_token=access_token,
            db_settings_id=s.id,
        )

    return {
        "status": "connected",
        "waba_id": waba_id,
        "phone_number_id": s.whatsapp_phone_id,
        "message": "WhatsApp conectado. Workflows n8n activandose en segundo plano.",
    }


async def _provision_workflows(
    tenant_id: int,
    tenant_name: str,
    phone_number_id: str,
    access_token: str,
    db_settings_id: int,
):
    """Background task: clone n8n workflows and save mapping."""
    from app.core.database import SessionLocal
    mapping = await provision_tenant_workflows(
        tenant_id=tenant_id,
        tenant_name=tenant_name,
        phone_number_id=phone_number_id,
        wa_access_token=access_token,
    )
    if mapping:
        db = SessionLocal()
        try:
            s = db.query(TenantSettings).filter(TenantSettings.id == db_settings_id).first()
            if s:
                s.n8n_workflow_ids = mapping
                db.commit()
        finally:
            db.close()


@router.get("/status")
async def get_channel_status(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return connection status of all channels for the current tenant."""
    s = _get_settings(db, current_user.tenant_id)
    wa_token = safe_decrypt(s.wa_token_encrypted) or s.whatsapp_access_token

    return {
        "whatsapp": {
            "connected": bool(wa_token and s.whatsapp_phone_id),
            "status": s.wa_status or "disconnected",
            "phone_number_id": s.whatsapp_phone_id,
            "waba_id": s.waba_id,
            "number": s.whatsapp_number,
        },
        "instagram": {
            "connected": bool(s.instagram_access_token and s.instagram_page_id),
            "page_id": s.instagram_page_id,
        },
        "facebook": {
            "connected": bool(s.facebook_access_token and s.facebook_page_id),
            "page_id": s.facebook_page_id,
        },
        "telegram": {
            "connected": bool(getattr(s, 'telegram_bot_token', None)),
            "bot_username": getattr(s, 'telegram_bot_username', None),
        },
        "tiktok": {
            "connected": bool(s.tiktok_access_token),
            "app_id": s.tiktok_app_id,
        },
        "shopify": {
            "connected": bool(s.shopify_access_token and s.shopify_shop_domain),
            "shop": s.shopify_shop_domain,
        },
        "webchat": {
            "enabled": s.webchat_enabled,
            "bot_name": s.webchat_bot_name,
            "color": s.webchat_color,
        },
        "n8n_workflows": s.n8n_workflow_ids or {},
    }


@router.delete("/whatsapp")
async def disconnect_whatsapp(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Disconnect WhatsApp: clear tokens and delete n8n workflows."""
    s = _get_settings(db, current_user.tenant_id)

    # Delete n8n workflows
    if s.n8n_workflow_ids and settings.N8N_API_KEY:
        import asyncio
        asyncio.create_task(deprovision_tenant_workflows(s.n8n_workflow_ids))

    s.wa_token_encrypted = None
    s.whatsapp_access_token = None
    s.waba_id = None
    s.whatsapp_phone_id = None
    s.wa_status = "disconnected"
    s.n8n_workflow_ids = {}
    db.commit()

    return {"status": "disconnected", "message": "WhatsApp desconectado correctamente"}


@router.post("/whatsapp/send")
async def send_whatsapp_message(
    body: SendMessageRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send a WhatsApp message on behalf of the tenant."""
    s = _get_settings(db, current_user.tenant_id)
    access_token = safe_decrypt(s.wa_token_encrypted) or s.whatsapp_access_token
    phone_id = s.whatsapp_phone_id

    if not access_token or not phone_id:
        raise HTTPException(status_code=400, detail="WhatsApp no conectado")

    recipient = body.to.replace(" ", "").replace("-", "")
    if not recipient.startswith("+"):
        recipient = "+" + recipient

    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": recipient,
        "type": "text",
        "text": {"preview_url": False, "body": body.message},
    }

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            f"https://graph.facebook.com/v20.0/{phone_id}/messages",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
        if not resp.is_success:
            raise HTTPException(
                status_code=resp.status_code,
                detail=f"Meta API error: {resp.text[:300]}",
            )
        return resp.json()


class ManualWhatsAppRequest(BaseModel):
    phone_number_id: str
    waba_id: str
    access_token: str
    phone_number: str | None = None


class InstagramRequest(BaseModel):
    page_id: str
    access_token: str
    verify_token: str | None = None


class FacebookRequest(BaseModel):
    page_id: str
    access_token: str
    verify_token: str | None = None


@router.post("/whatsapp/manual")
async def whatsapp_manual_config(
    body: ManualWhatsAppRequest,
    background_tasks: BackgroundTasks,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Configure WhatsApp manually with direct credentials (no OAuth flow)."""
    s = _get_settings(db, current_user.tenant_id)
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()

    encrypted = encrypt_token(body.access_token)
    s.wa_token_encrypted = encrypted
    s.whatsapp_access_token = None
    s.waba_id = body.waba_id
    s.whatsapp_phone_id = body.phone_number_id
    if body.phone_number:
        s.whatsapp_number = body.phone_number
    s.wa_status = "active"
    db.commit()
    db.refresh(s)

    if settings.N8N_API_KEY and settings.N8N_URL:
        background_tasks.add_task(
            _provision_workflows,
            tenant_id=current_user.tenant_id,
            tenant_name=tenant.name if tenant else f"Tenant {current_user.tenant_id}",
            phone_number_id=body.phone_number_id,
            access_token=body.access_token,
            db_settings_id=s.id,
        )

    return {
        "status": "active",
        "waba_id": body.waba_id,
        "phone_number_id": body.phone_number_id,
        "message": "WhatsApp configurado correctamente.",
    }


@router.post("/instagram")
async def connect_instagram(
    body: InstagramRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Configure Instagram DMs channel."""
    s = _get_settings(db, current_user.tenant_id)
    s.instagram_page_id = body.page_id
    s.instagram_access_token = body.access_token
    if body.verify_token:
        s.instagram_verify_token = body.verify_token
    db.commit()
    return {"status": "connected", "page_id": body.page_id, "message": "Instagram conectado."}


@router.delete("/instagram")
async def disconnect_instagram(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    s = _get_settings(db, current_user.tenant_id)
    s.instagram_page_id = None
    s.instagram_access_token = None
    s.instagram_verify_token = None
    db.commit()
    return {"status": "disconnected"}


@router.post("/facebook")
async def connect_facebook(
    body: FacebookRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Configure Facebook Messenger channel."""
    s = _get_settings(db, current_user.tenant_id)
    s.facebook_page_id = body.page_id
    s.facebook_access_token = body.access_token
    if body.verify_token:
        s.facebook_verify_token = body.verify_token
    db.commit()
    return {"status": "connected", "page_id": body.page_id, "message": "Facebook conectado."}


@router.delete("/facebook")
async def disconnect_facebook(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    s = _get_settings(db, current_user.tenant_id)
    s.facebook_page_id = None
    s.facebook_access_token = None
    s.facebook_verify_token = None
    db.commit()
    return {"status": "disconnected"}


class TikTokRequest(BaseModel):
    app_id: str
    app_secret: str
    access_token: str


class TelegramRequest(BaseModel):
    bot_token: str
    bot_username: str | None = None


class ShopifyRequest(BaseModel):
    shop_domain: str
    access_token: str
    webhook_secret: str | None = None


class WebchatRequest(BaseModel):
    enabled: bool = True
    greeting: str | None = None
    bot_name: str | None = None
    color: str | None = None
    system_prompt: str | None = None


class QuickSetupRequest(BaseModel):
    company_name: str | None = None
    logo_url: str | None = None
    custom_domain: str | None = None
    bot_name: str | None = None
    color: str | None = None
    greeting: str | None = None
    system_prompt: str | None = None
    telegram_bot_token: str | None = None


@router.post("/tiktok")
async def connect_tiktok(
    body: TikTokRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    s = _get_settings(db, current_user.tenant_id)
    s.tiktok_app_id = body.app_id
    s.tiktok_app_secret = body.app_secret
    s.tiktok_access_token = body.access_token
    db.commit()
    return {"status": "connected", "message": "TikTok conectado."}


@router.delete("/tiktok")
async def disconnect_tiktok(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    s = _get_settings(db, current_user.tenant_id)
    s.tiktok_app_id = None
    s.tiktok_app_secret = None
    s.tiktok_access_token = None
    db.commit()
    return {"status": "disconnected"}


@router.post("/telegram")
async def connect_telegram(
    body: TelegramRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Auto-validate token and fetch bot info from Telegram API
    bot_username = body.bot_username
    bot_first_name = None
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(f"https://api.telegram.org/bot{body.bot_token}/getMe")
            if r.status_code == 200:
                info = r.json().get("result", {})
                bot_username = info.get("username", bot_username)
                bot_first_name = info.get("first_name")
            elif r.status_code == 401:
                raise HTTPException(status_code=400, detail="Token inválido. Verifica el token de @BotFather.")
    except httpx.RequestError:
        pass  # continue saving even if Telegram is unreachable

    s = _get_settings(db, current_user.tenant_id)
    s.telegram_bot_token = body.bot_token
    s.telegram_bot_username = bot_username
    db.commit()

    # Register webhook so Telegram sends updates to our backend
    from app.core.config import settings as app_settings
    webhook_url = f"{app_settings.BACKEND_URL}/api/v1/webhooks/telegram"
    wh_ok = False
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            wr = await client.post(
                f"https://api.telegram.org/bot{body.bot_token}/setWebhook",
                json={"url": webhook_url, "allowed_updates": ["message"]},
            )
            wh_ok = wr.status_code == 200 and wr.json().get("ok")
            if not wh_ok:
                print(f"[Telegram setWebhook] {wr.text[:200]}")
    except Exception as e:
        print(f"[Telegram setWebhook error] {e}")

    return {
        "status": "connected",
        "message": f"Bot {'@' + bot_username if bot_username else ''} conectado correctamente.",
        "bot_username": bot_username,
        "bot_name": bot_first_name,
        "webhook_registered": wh_ok,
    }


@router.delete("/telegram")
async def disconnect_telegram(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    s = _get_settings(db, current_user.tenant_id)
    s.telegram_bot_token = None
    s.telegram_bot_username = None
    db.commit()
    return {"status": "disconnected"}


@router.post("/shopify")
async def connect_shopify(
    body: ShopifyRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    s = _get_settings(db, current_user.tenant_id)
    s.shopify_shop_domain = body.shop_domain
    s.shopify_access_token = body.access_token
    if body.webhook_secret:
        s.shopify_webhook_secret = body.webhook_secret
    db.commit()
    return {"status": "connected", "shop": body.shop_domain, "message": "Shopify conectado."}


@router.delete("/shopify")
async def disconnect_shopify(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    s = _get_settings(db, current_user.tenant_id)
    s.shopify_shop_domain = None
    s.shopify_access_token = None
    s.shopify_webhook_secret = None
    db.commit()
    return {"status": "disconnected"}


@router.post("/webchat")
async def configure_webchat(
    body: WebchatRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    s = _get_settings(db, current_user.tenant_id)
    s.webchat_enabled = body.enabled
    if body.greeting is not None:
        s.webchat_greeting = body.greeting
    if body.bot_name is not None:
        s.webchat_bot_name = body.bot_name
    if body.color is not None:
        s.webchat_color = body.color
    if body.system_prompt is not None:
        s.webchat_system_prompt = body.system_prompt
    db.commit()
    return {"status": "configured", "enabled": body.enabled, "message": "Webchat configurado."}


@router.post("/setup")
async def quick_setup(
    body: QuickSetupRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """One-shot setup: company name, logo, domain, webchat config, telegram."""
    s = _get_settings(db, current_user.tenant_id)
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()

    if body.company_name and tenant:
        tenant.name = body.company_name
    if body.logo_url is not None:
        s.logo_url = body.logo_url
    if body.custom_domain is not None and tenant:
        tenant.custom_domain = body.custom_domain or None
    if body.color is not None:
        s.webchat_color = body.color
        s.primary_color = body.color
    if body.bot_name is not None:
        s.webchat_bot_name = body.bot_name
    if body.greeting is not None:
        s.webchat_greeting = body.greeting
    if body.system_prompt is not None:
        s.webchat_system_prompt = body.system_prompt
    s.webchat_enabled = True

    # Telegram auto-connect if token provided
    telegram_info = None
    if body.telegram_bot_token:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.get(f"https://api.telegram.org/bot{body.telegram_bot_token}/getMe")
                if r.status_code == 200:
                    info = r.json().get("result", {})
                    s.telegram_bot_token = body.telegram_bot_token
                    s.telegram_bot_username = info.get("username")
                    telegram_info = info.get("username")
                elif r.status_code == 401:
                    db.commit()
                    raise HTTPException(status_code=400, detail="Token de Telegram inv\u00e1lido.")
        except httpx.RequestError:
            s.telegram_bot_token = body.telegram_bot_token

    db.commit()

    subdomain = tenant.subdomain if tenant else "osw"
    snippet = f'<script src="https://osw.conectaai.cl/widget.js" data-tenant="{subdomain}"></script>'
    return {
        "status": "ok",
        "message": "Configuraci\u00f3n guardada correctamente.",
        "snippet": snippet,
        "telegram_bot": telegram_info,
    }

