import secrets
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import timedelta

from app.core.database import get_db
from app.core import security
from app.core.config import settings
from app.core.redis_client import store_reset_token, get_reset_user_id, delete_reset_token, invalidate_user_reset_tokens
from app.schemas.token import Token
from app.models.core import User, Tenant

router = APIRouter()

_RESET_TTL = 3600  # 1 hour


# ── Schemas ───────────────────────────────────────────────────────────────────

class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


# ── Login ─────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=Token)
def login_access_token(
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Usuario inactivo")

    # Block login if the tenant is suspended
    if user.tenant_id:
        tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
        if tenant and not tenant.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cuenta suspendida. Contacta al soporte de OmniFlow.",
            )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            user.id, tenant_id=user.tenant_id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }


# ── /me ───────────────────────────────────────────────────────────────────────

@router.get("/me")
def get_me(current_user: User = Depends(security.get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "is_superuser": current_user.is_superuser,
        "tenant_id": current_user.tenant_id,
        "role": getattr(getattr(current_user, "role", None), "name", None) or ("superadmin" if current_user.is_superuser else "admin"),
    }


# ── Change password (requires auth) ──────────────────────────────────────────

@router.post("/change-password")
def change_password(
    payload: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(security.get_current_user),
):
    if not security.verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Contraseña actual incorrecta")
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="La nueva contraseña debe tener al menos 8 caracteres")
    current_user.hashed_password = security.get_password_hash(payload.new_password)
    db.add(current_user)
    db.commit()
    return {"message": "Contraseña actualizada correctamente"}


# ── Forgot password (public) ──────────────────────────────────────────────────

@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    # Always return 200 — never leak whether an email exists
    if not user:
        return {"message": "Si el email está registrado, recibirás un correo con instrucciones."}

    # Invalidate any existing reset tokens for this user
    invalidate_user_reset_tokens(user.id)

    token = secrets.token_urlsafe(32)
    store_reset_token(token, user.id, _RESET_TTL)

    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"

    if settings.RESEND_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    "https://api.resend.com/emails",
                    headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
                    json={
                        "from": settings.FROM_EMAIL,
                        "to": [user.email],
                        "subject": "Restablecer contraseña — OmniFlow",
                        "html": f"""
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#080812;color:#e2e8f0">
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:32px">
    <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#7c3aed,#a855f7);display:flex;align-items:center;justify-content:center">
      <span style="color:white;font-size:16px;font-weight:700">O</span>
    </div>
    <span style="font-size:20px;font-weight:700;background:linear-gradient(90deg,#a78bfa,#c084fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent">OmniFlow</span>
  </div>
  <h2 style="color:#f1f5f9;font-size:22px;margin:0 0 8px">Restablecer contraseña</h2>
  <p style="color:#94a3b8;margin:0 0 24px">Hola {user.full_name or 'usuario'}, recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
  <a href="{reset_url}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#a855f7);color:white;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;margin-bottom:24px">
    Restablecer contraseña
  </a>
  <p style="color:#64748b;font-size:13px;margin-bottom:8px">Este enlace expira en <strong style="color:#94a3b8">1 hora</strong>.</p>
  <p style="color:#64748b;font-size:13px">Si no solicitaste este cambio, ignora este correo — tu contraseña no cambiará.</p>
  <hr style="border:none;border-top:1px solid #1e293b;margin:32px 0">
  <p style="color:#334155;font-size:12px;text-align:center">© OmniFlow — Automatización Omnicanal</p>
</div>""",
                    },
                )
                if resp.status_code >= 400:
                    print(f"[email] Resend error {resp.status_code}: {resp.text}", flush=True)
        except Exception as e:
            print(f"[email] Resend exception: {e}", flush=True)
    else:
        # Dev fallback — print token to logs
        print(f"[dev] Password reset for {user.email} → {reset_url}", flush=True)

    return {"message": "Si el email está registrado, recibirás un correo con instrucciones."}


# ── Reset password (public) ───────────────────────────────────────────────────

@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    user_id = get_reset_user_id(payload.token)
    if not user_id:
        raise HTTPException(status_code=400, detail="Token inválido o expirado. Solicita un nuevo correo.")
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 8 caracteres")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="Usuario no encontrado")
    user.hashed_password = security.get_password_hash(payload.new_password)
    db.add(user)
    db.commit()
    delete_reset_token(payload.token)
    return {"message": "Contraseña restablecida. Ya puedes iniciar sesión."}
