"""
Team / User management within a tenant.
The tenant admin (jefe) can:
  GET    /users/                  — list all team members
  POST   /users/                  — create a new member (sets password)
  PATCH  /users/{id}              — update name, email, role, is_active
  POST   /users/{id}/set-password — reset any member's password (admin override)
  DELETE /users/{id}              — deactivate (soft delete)
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.core.security import get_current_user, get_password_hash
from app.models.core import User, Tenant

router = APIRouter()


# ── Auth helper ───────────────────────────────────────────────────────────────

def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    """User must be authenticated. Platform superadmins pass unconditionally."""
    if not current_user.is_active:
        raise HTTPException(status_code=403, detail="Usuario inactivo")
    return current_user


def _check_same_tenant(actor: User, target: User) -> None:
    """Actor can only modify users in their own tenant (unless platform superadmin)."""
    if actor.is_superuser:
        return
    if actor.tenant_id != target.tenant_id:
        raise HTTPException(status_code=403, detail="No tienes permiso para modificar este usuario")


# ── Schemas ───────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    full_name: str
    email: str
    password: str
    role_id: Optional[int] = None
    is_active: bool = True


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    role_id: Optional[int] = None
    is_active: Optional[bool] = None


class SetPasswordRequest(BaseModel):
    new_password: str


# ── Serializer ────────────────────────────────────────────────────────────────

def _user_out(u: User) -> dict:
    return {
        "id": u.id,
        "full_name": u.full_name,
        "email": u.email,
        "is_active": u.is_active,
        "is_superuser": u.is_superuser,
        "role_id": u.role_id,
        "role_name": u.role.name if u.role else ("superadmin" if u.is_superuser else "admin"),
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/")
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    """List all users in the current user's tenant."""
    users = (
        db.query(User)
        .filter(User.tenant_id == current_user.tenant_id)
        .order_by(User.id.asc())
        .all()
    )
    return [_user_out(u) for u in users]


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    """Create a new team member in the same tenant."""
    if len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 8 caracteres")

    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un usuario con ese email")

    new_user = User(
        tenant_id=current_user.tenant_id,
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        role_id=payload.role_id,
        is_active=payload.is_active,
        is_superuser=False,  # Never superuser when created by tenant admin
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return _user_out(new_user)


@router.patch("/{user_id}")
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    """Update a team member's details."""
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    _check_same_tenant(current_user, target)

    if payload.full_name is not None:
        target.full_name = payload.full_name
    if payload.email is not None:
        existing = db.query(User).filter(User.email == payload.email, User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Ese email ya está en uso")
        target.email = payload.email
    if payload.role_id is not None:
        target.role_id = payload.role_id
    if payload.is_active is not None:
        target.is_active = payload.is_active

    db.add(target)
    db.commit()
    db.refresh(target)
    return _user_out(target)


@router.post("/{user_id}/set-password")
def set_user_password(
    user_id: int,
    payload: SetPasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    """Admin override: set any team member's password without needing their current password."""
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    _check_same_tenant(current_user, target)

    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 8 caracteres")

    target.hashed_password = get_password_hash(payload.new_password)
    db.add(target)
    db.commit()
    return {"message": "Contraseña actualizada"}


@router.delete("/{user_id}")
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    """Deactivate (soft-delete) a team member. Cannot deactivate yourself."""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="No puedes desactivar tu propia cuenta")
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    _check_same_tenant(current_user, target)

    target.is_active = False
    db.add(target)
    db.commit()
    return {"message": "Usuario desactivado"}


@router.get("/roles/")
def list_roles(
    db: Session = Depends(get_db),
    _: User = Depends(_require_admin),
):
    """List available roles."""
    return [{"id": 1, "name": "admin"}, {"id": 2, "name": "agent"}, {"id": 3, "name": "viewer"}]
