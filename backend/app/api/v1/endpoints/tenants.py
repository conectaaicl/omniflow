from typing import Any
from fastapi import APIRouter, Request, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.schemas.tenant import TenantCreate, TenantRead, PublicTenantInfo, TenantSettingsUpdate, TenantSettingsRead
from app.services.tenant import create_new_tenant, get_tenant_by_host
from app.core.security import get_password_hash
from app.models.core import Tenant, TenantSettings, User
from app.models.tenant import Contact, Deal
from app.core.database import get_db, tenant_db_session

router = APIRouter()


@router.get("/public-info", response_model=PublicTenantInfo)
def get_public_info(request: Request, db: Session = Depends(get_db)):
    host = request.headers.get("host", "")
    tenant = get_tenant_by_host(db, host)
    if not tenant:
        tenant = db.query(Tenant).first()
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant


@router.patch("/settings", response_model=TenantSettingsRead)
def update_tenant_settings(
    settings_in: TenantSettingsUpdate,
    db: Session = Depends(get_db),
):
    tenant = db.query(Tenant).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    settings = tenant.settings
    obj_data = settings_in.model_dump(exclude_unset=True)
    for field in obj_data:
        setattr(settings, field, obj_data[field])
    db.add(settings)
    db.commit()
    db.refresh(settings)
    return settings


@router.post("/register", response_model=TenantRead)
def register_tenant(tenant_in: TenantCreate, db: Session = Depends(get_db)):
    existing_tenant = db.query(Tenant).filter(Tenant.subdomain == tenant_in.subdomain).first()
    if existing_tenant:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Subdomain already taken"
        )
    hashed_password = get_password_hash(tenant_in.password)
    new_tenant = create_new_tenant(
        db,
        tenant_name=tenant_in.name,
        subdomain=tenant_in.subdomain,
        admin_email=tenant_in.admin_email,
        hashed_password=hashed_password
    )
    return new_tenant


@router.get("/dashboard-stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    tenant = db.query(Tenant).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    with tenant_db_session(tenant.schema_name) as tenant_db:
        total_contacts = tenant_db.query(Contact).count()
        hot_leads = tenant_db.query(Contact).filter(Contact.lead_score > 70).count()
        total_deals = tenant_db.query(Deal).count()
        won_deals = tenant_db.query(Deal).filter(Deal.status == "won").count()
        sources = tenant_db.query(Contact.source, func.count(Contact.id)).group_by(Contact.source).all()
        source_data = [{"source": s[0], "count": s[1]} for s in sources]
        return {
            "stats": {
                "total_contacts": total_contacts,
                "hot_leads": hot_leads,
                "total_deals": total_deals,
                "won_deals": won_deals,
                "conversion_rate": (won_deals / total_deals * 100) if total_deals > 0 else 0
            },
            "source_distribution": source_data
        }
