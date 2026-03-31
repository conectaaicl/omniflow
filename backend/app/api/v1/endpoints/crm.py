from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from app.core.database import get_db, tenant_db_session
from app.core.security import get_current_user
from app.models.core import Tenant, User
from app.models.tenant import Pipeline, PipelineStage, Deal, Contact

router = APIRouter()


def _get_tenant(db: Session, current_user: User) -> Tenant:
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant


@router.get("/pipeline")
def get_pipeline(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tenant = _get_tenant(db, current_user)
    with tenant_db_session(tenant.schema_name) as tdb:
        pipeline = tdb.query(Pipeline).first()
        if not pipeline:
            pipeline = Pipeline(name="Sales Pipeline")
            tdb.add(pipeline)
            tdb.commit()
            tdb.refresh(pipeline)
            for i, name in enumerate(["Nuevo Lead", "Contactado", "Propuesta", "Negociación", "Ganado", "Perdido"]):
                tdb.add(PipelineStage(pipeline_id=pipeline.id, name=name, order=i))
            tdb.commit()

        stages = (
            tdb.query(PipelineStage)
            .filter(PipelineStage.pipeline_id == pipeline.id)
            .order_by(PipelineStage.order.asc())
            .all()
        )
        result = []
        for stage in stages:
            deals = tdb.query(Deal).filter(Deal.stage_id == stage.id).all()
            deal_list = []
            for d in deals:
                contact = tdb.query(Contact).filter(Contact.id == d.contact_id).first()
                deal_list.append({
                    "id": d.id,
                    "title": d.title,
                    "value": d.value,
                    "status": d.status,
                    "contact": {
                        "name": contact.name if contact else "?",
                        "phone": contact.phone if contact else None,
                        "lead_score": contact.lead_score if contact else 0,
                    },
                })
            result.append({
                "id": stage.id,
                "name": stage.name,
                "order": stage.order,
                "deals": deal_list,
            })
        return result


@router.get("/contacts")
def list_contacts(
    search: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    tags: Optional[str] = Query(None),
    min_score: Optional[int] = Query(None),
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tenant = _get_tenant(db, current_user)
    with tenant_db_session(tenant.schema_name) as tdb:
        q = tdb.query(Contact)
        if search:
            s = f"%{search}%"
            q = q.filter(
                Contact.name.ilike(s) | Contact.phone.ilike(s) | Contact.email.ilike(s)
            )
        if source:
            q = q.filter(Contact.source == source)
        if min_score is not None:
            q = q.filter(Contact.lead_score >= min_score)
        if tags:
            from sqlalchemy import text as _text
            tag_list = [t.strip() for t in tags.split(',') if t.strip()]
            for tag in tag_list:
                q = q.filter(_text(f"tags @> '\"{tag}\"'::jsonb"))
        total = q.count()
        contacts = q.order_by(Contact.last_interaction.desc()).offset(offset).limit(limit).all()
        return {
            "total": total,
            "contacts": [
                {
                    "id": c.id,
                    "name": c.name,
                    "phone": c.phone,
                    "email": c.email,
                    "source": c.source,
                    "lead_score": c.lead_score,
                    "intent": c.intent,
                    "last_interaction": c.last_interaction.isoformat() if c.last_interaction else None,
                    "tags": getattr(c, 'tags', []) or [],
                }
                for c in contacts
            ],
        }


class ContactUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    lead_score: Optional[int] = None
    intent: Optional[str] = None


@router.patch("/contacts/{contact_id}")
def update_contact(
    contact_id: int,
    data: ContactUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tenant = _get_tenant(db, current_user)
    with tenant_db_session(tenant.schema_name) as tdb:
        contact = tdb.query(Contact).filter(Contact.id == contact_id).first()
        if not contact:
            raise HTTPException(status_code=404, detail="Contact not found")
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(contact, field, value)
        tdb.commit()
        return {"ok": True}


@router.patch("/deals/{deal_id}/move")
def move_deal(
    deal_id: int,
    target_stage_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tenant = _get_tenant(db, current_user)
    with tenant_db_session(tenant.schema_name) as tdb:
        deal = tdb.query(Deal).filter(Deal.id == deal_id).first()
        if not deal:
            raise HTTPException(status_code=404, detail="Deal not found")
        deal.stage_id = target_stage_id
        tdb.commit()
        return {"status": "success"}
