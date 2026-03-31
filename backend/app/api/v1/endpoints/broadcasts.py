"""broadcasts.py — Broadcast campaigns for OmniFlow"""
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db, tenant_db_session
from app.core.security import get_current_user
from app.models.core import Tenant, User
from datetime import datetime
import httpx
import json

router = APIRouter()


def _get_tenant(db: Session, current_user: User) -> Tenant:
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant


class BroadcastCreate(BaseModel):
    name: str
    message: str
    channel: str = "whatsapp"  # whatsapp, email
    segment_tags: Optional[List[str]] = None      # filter by tags
    segment_min_score: Optional[int] = None       # filter by lead_score >=
    segment_source: Optional[str] = None          # filter by source channel
    scheduled_at: Optional[datetime] = None


@router.get("")
def list_broadcasts(
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tenant = _get_tenant(db, current_user)
    with tenant_db_session(tenant.schema_name) as tdb:
        rows = tdb.execute(text(
            "SELECT id, name, message, channel, status, sent_count, recipient_count, "
            "segment_tags, segment_min_score, segment_source, scheduled_at, created_at, sent_at "
            f"FROM {tenant.schema_name}.broadcasts ORDER BY created_at DESC LIMIT :lim"
        ), {"lim": limit}).fetchall()
        return [dict(r._mapping) for r in rows]


@router.post("")
def create_broadcast(
    data: BroadcastCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tenant = _get_tenant(db, current_user)
    with tenant_db_session(tenant.schema_name) as tdb:
        # Count recipients based on segment
        where_clauses = ["1=1"]
        params = {}
        if data.segment_tags:
            where_clauses.append("tags @> :tags::jsonb")
            params["tags"] = json.dumps(data.segment_tags)
        if data.segment_min_score is not None:
            where_clauses.append("lead_score >= :min_score")
            params["min_score"] = data.segment_min_score
        if data.segment_source:
            where_clauses.append("source = :source")
            params["source"] = data.segment_source

        count_sql = f"SELECT COUNT(*) FROM {tenant.schema_name}.contacts WHERE " + " AND ".join(where_clauses)
        recipient_count = tdb.execute(text(count_sql), params).scalar()

        result = tdb.execute(text(
            f"INSERT INTO {tenant.schema_name}.broadcasts "
            "(name, message, channel, status, sent_count, recipient_count, "
            "segment_tags, segment_min_score, segment_source, scheduled_at, created_at) "
            "VALUES (:name, :msg, :channel, 'draft', 0, :recipient_count, "
            ":tags, :min_score, :source, :scheduled_at, NOW()) RETURNING id"
        ), {
            "name": data.name,
            "msg": data.message,
            "channel": data.channel,
            "recipient_count": recipient_count,
            "tags": json.dumps(data.segment_tags) if data.segment_tags else None,
            "min_score": data.segment_min_score,
            "source": data.segment_source,
            "scheduled_at": data.scheduled_at,
        })
        tdb.commit()
        bcast_id = result.fetchone()[0]
        return {"id": bcast_id, "recipient_count": recipient_count, "status": "draft"}


@router.post("/{broadcast_id}/send")
def send_broadcast(
    broadcast_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tenant = _get_tenant(db, current_user)
    settings = tenant.settings
    with tenant_db_session(tenant.schema_name) as tdb:
        bcast = tdb.execute(text(
            f"SELECT * FROM {tenant.schema_name}.broadcasts WHERE id = :id"
        ), {"id": broadcast_id}).fetchone()
        if not bcast:
            raise HTTPException(status_code=404, detail="Broadcast not found")
        if bcast.status == "sent":
            raise HTTPException(status_code=400, detail="Ya fue enviado")

        # Mark as sending
        tdb.execute(text(
            f"UPDATE {tenant.schema_name}.broadcasts SET status='sending' WHERE id=:id"
        ), {"id": broadcast_id})
        tdb.commit()

    # Fire background task
    background_tasks.add_task(
        _do_send_broadcast,
        schema_name=tenant.schema_name,
        broadcast_id=broadcast_id,
        wa_phone_id=settings.whatsapp_phone_id if settings else None,
        wa_token=settings.whatsapp_access_token if settings else None,
    )
    return {"status": "sending", "message": "Envío iniciado en background"}


def _do_send_broadcast(schema_name: str, broadcast_id: int, wa_phone_id: str, wa_token: str):
    """Background: send WhatsApp message to all matching contacts."""
    from app.core.database import engine
    from sqlalchemy.orm import sessionmaker
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    try:
        db.execute(text(f"SET search_path TO {schema_name}, public"))

        bcast = db.execute(text(
            f"SELECT * FROM {schema_name}.broadcasts WHERE id=:id"
        ), {"id": broadcast_id}).fetchone()
        if not bcast:
            return

        # Build recipients query
        where_clauses = ["phone IS NOT NULL AND phone != ''"]
        params = {}
        if bcast.segment_tags:
            where_clauses.append("tags @> :tags::jsonb")
            params["tags"] = bcast.segment_tags
        if bcast.segment_min_score is not None:
            where_clauses.append("lead_score >= :min_score")
            params["min_score"] = bcast.segment_min_score
        if bcast.segment_source:
            where_clauses.append("source = :source")
            params["source"] = bcast.segment_source

        contacts = db.execute(text(
            f"SELECT id, name, phone FROM {schema_name}.contacts WHERE " + " AND ".join(where_clauses)
        ), params).fetchall()

        sent = 0
        for contact in contacts:
            success = False
            if wa_phone_id and wa_token:
                try:
                    resp = httpx.post(
                        f"https://graph.facebook.com/v19.0/{wa_phone_id}/messages",
                        headers={"Authorization": f"Bearer {wa_token}", "Content-Type": "application/json"},
                        json={
                            "messaging_product": "whatsapp",
                            "to": contact.phone.lstrip("+").replace(" ", ""),
                            "type": "text",
                            "text": {"body": bcast.message},
                        },
                        timeout=10,
                    )
                    success = resp.status_code == 200
                except Exception:
                    pass

            db.execute(text(
                f"INSERT INTO {schema_name}.broadcast_recipients "
                "(broadcast_id, contact_id, status, sent_at) VALUES (:bid, :cid, :status, NOW())"
            ), {"bid": broadcast_id, "cid": contact.id, "status": "sent" if success else "failed"})
            if success:
                sent += 1

        db.execute(text(
            f"UPDATE {schema_name}.broadcasts SET status='sent', sent_count=:sent, sent_at=NOW() WHERE id=:id"
        ), {"sent": sent, "id": broadcast_id})
        db.commit()
    finally:
        db.close()


@router.delete("/{broadcast_id}")
def delete_broadcast(
    broadcast_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tenant = _get_tenant(db, current_user)
    with tenant_db_session(tenant.schema_name) as tdb:
        tdb.execute(text(
            f"DELETE FROM {tenant.schema_name}.broadcast_recipients WHERE broadcast_id=:id"
        ), {"id": broadcast_id})
        tdb.execute(text(
            f"DELETE FROM {tenant.schema_name}.broadcasts WHERE id=:id"
        ), {"id": broadcast_id})
        tdb.commit()
    return {"ok": True}
