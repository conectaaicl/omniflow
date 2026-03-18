from fastapi import APIRouter, Depends, HTTPException
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
