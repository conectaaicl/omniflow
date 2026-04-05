"""
Outbound messaging service — sends messages via each channel's API.
"""
import httpx
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText


# ── WhatsApp ────────────────────────────────────────────────────────────────

async def send_whatsapp(phone_number_id: str, access_token: str, to: str, message: str) -> bool:
    """Send a WhatsApp message via Meta Cloud API."""
    url = f"https://graph.facebook.com/v18.0/{phone_number_id}/messages"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": to,
        "type": "text",
        "text": {"preview_url": False, "body": message},
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(url, json=payload, headers=headers)
            return r.status_code == 200
    except Exception as e:
        print(f"[WhatsApp send error] {e}")
        return False


async def send_whatsapp_image(phone_number_id: str, access_token: str, to: str, image_url: str, caption: str = "") -> bool:
    """Send a WhatsApp image message via Meta Cloud API."""
    url = f"https://graph.facebook.com/v18.0/{phone_number_id}/messages"
    headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": to,
        "type": "image",
        "image": {"link": image_url, "caption": caption},
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(url, json=payload, headers=headers)
            return r.status_code == 200
    except Exception as e:
        print(f"[WhatsApp image send error] {e}")
        return False


# ── Instagram DM ────────────────────────────────────────────────────────────

async def send_instagram(page_access_token: str, recipient_id: str, message: str) -> bool:
    """Send an Instagram Direct Message via Meta Graph API."""
    url = "https://graph.facebook.com/v18.0/me/messages"
    headers = {"Authorization": f"Bearer {page_access_token}"}
    payload = {
        "recipient": {"id": recipient_id},
        "message": {"text": message},
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(url, json=payload, headers=headers)
            return r.status_code == 200
    except Exception as e:
        print(f"[Instagram send error] {e}")
        return False


# ── Facebook Messenger ───────────────────────────────────────────────────────

async def send_facebook(page_access_token: str, psid: str, message: str) -> bool:
    """Send a Facebook Messenger message via Meta Graph API."""
    url = "https://graph.facebook.com/v18.0/me/messages"
    headers = {"Authorization": f"Bearer {page_access_token}"}
    payload = {
        "recipient": {"id": psid},
        "message": {"text": message},
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(url, json=payload, headers=headers)
            return r.status_code == 200
    except Exception as e:
        print(f"[Facebook send error] {e}")
        return False


# ── Email ────────────────────────────────────────────────────────────────────

async def send_email(settings, to_email: str, subject: str, body: str) -> bool:
    """Send email via SMTP or SendGrid depending on tenant config."""
    if settings.email_provider == "sendgrid" and settings.sendgrid_api_key:
        return await _send_sendgrid(
            settings.sendgrid_api_key,
            settings.smtp_from_address or "noreply@omniflow.app",
            to_email, subject, body,
        )
    elif settings.email_provider == "mailgun" and settings.mailgun_api_key:
        return await _send_mailgun(
            settings.mailgun_api_key,
            settings.mailgun_domain,
            settings.smtp_from_address or f"noreply@{settings.mailgun_domain}",
            to_email, subject, body,
        )
    elif settings.smtp_host and settings.smtp_user:
        return _send_smtp(settings, to_email, subject, body)
    return False


async def _send_sendgrid(api_key: str, from_email: str, to_email: str, subject: str, body: str) -> bool:
    url = "https://api.sendgrid.com/v3/mail/send"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {
        "personalizations": [{"to": [{"email": to_email}]}],
        "from": {"email": from_email},
        "subject": subject,
        "content": [{"type": "text/html", "value": body}],
    }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(url, json=payload, headers=headers)
            return r.status_code == 202
    except Exception as e:
        print(f"[SendGrid error] {e}")
        return False


async def _send_mailgun(api_key: str, domain: str, from_email: str, to_email: str, subject: str, body: str) -> bool:
    url = f"https://api.mailgun.net/v3/{domain}/messages"
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(
                url,
                auth=("api", api_key),
                data={"from": from_email, "to": to_email, "subject": subject, "html": body},
            )
            return r.status_code == 200
    except Exception as e:
        print(f"[Mailgun error] {e}")
        return False


def _send_smtp(settings, to_email: str, subject: str, body: str) -> bool:
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.smtp_from_address or settings.smtp_user
        msg["To"] = to_email
        msg.attach(MIMEText(body, "html"))
        port = int(settings.smtp_port or 587)
        with smtplib.SMTP(settings.smtp_host, port, timeout=10) as smtp:
            smtp.ehlo()
            smtp.starttls()
            smtp.login(settings.smtp_user, settings.smtp_password)
            smtp.sendmail(msg["From"], to_email, msg.as_string())
        return True
    except Exception as e:
        print(f"[SMTP error] {e}")
        return False


# ── Shopify (outbound is not direct — Shopify is inbound only for webhooks) ──
# Shopify doesn't receive messages, it sends order/customer events to us.
# So no send_shopify function needed.

# ── TikTok (Lead Gen is inbound only) ───────────────────────────────────────
# TikTok Lead Gen sends leads to our webhook. No outbound send.
