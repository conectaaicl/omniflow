"""
Email service via mail.conectaai.cl
POST /api/send  Authorization: Bearer {api_key}
Body: { to, subject, html, text?, template_id?, variables? }
"""
import httpx
from app.core.config import settings


async def send_email(
    to: str,
    subject: str,
    html: str,
    text: str = "",
    template_id: str | None = None,
    variables: dict | None = None,
) -> bool:
    """Send an email via mail.conectaai.cl. Returns True on success."""
    if not settings.MAILSAAS_API_KEY or not settings.MAILSAAS_URL:
        print("[email] MAILSAAS not configured — skipping", flush=True)
        return False

    payload: dict = {"to": to, "subject": subject, "html": html}
    if text:
        payload["text"] = text
    if template_id:
        payload["template_id"] = template_id
    if variables:
        payload["variables"] = variables

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{settings.MAILSAAS_URL.rstrip('/')}/api/send",
                headers={
                    "Authorization": f"Bearer {settings.MAILSAAS_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            ok = resp.status_code < 300
            if not ok:
                print(f"[email] Send failed {resp.status_code}: {resp.text[:200]}", flush=True)
            return ok
    except Exception as e:
        print(f"[email] Error: {e}", flush=True)
        return False


async def send_password_reset(to: str, reset_url: str, user_name: str = "") -> bool:
    html = f"""
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px;">
  <h2 style="color:#7c3aed;">Restablecer contraseña — OmniFlow</h2>
  <p>Hola{(' ' + user_name) if user_name else ''},</p>
  <p>Haz clic en el enlace para restablecer tu contraseña. Expira en 1 hora.</p>
  <a href="{reset_url}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
    Restablecer contraseña
  </a>
  <p style="margin-top:24px;color:#64748b;font-size:12px;">
    Si no solicitaste esto, ignora este email.
  </p>
</div>
"""
    return await send_email(to=to, subject="Restablecer tu contraseña — OmniFlow", html=html)


async def send_welcome(to: str, tenant_name: str, login_url: str) -> bool:
    html = f"""
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px;">
  <h2 style="color:#7c3aed;">Bienvenido a OmniFlow</h2>
  <p>Tu espacio <strong>{tenant_name}</strong> está listo.</p>
  <a href="{login_url}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
    Iniciar sesión
  </a>
</div>
"""
    return await send_email(to=to, subject=f"Bienvenido a OmniFlow — {tenant_name}", html=html)
