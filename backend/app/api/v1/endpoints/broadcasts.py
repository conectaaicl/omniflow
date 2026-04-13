"""
Broadcasts API — mass messaging campaigns across WhatsApp, Instagram, Facebook.

GET  /broadcasts          → list all broadcasts
POST /broadcasts          → create new broadcast (draft)
POST /broadcasts/{id}/send → execute send to all matching contacts
DELETE /broadcasts/{id}   → delete draft broadcast
"""
import asyncio
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.database import get_db, tenant_db_session
from app.core.security import get_current_user
from app.models.core import Tenant, TenantSettings, User
from app.models.tenant import Broadcast, Contact
from app.services import messaging
import httpx

router = APIRouter()


def _get_tenant(db: Session, current_user: User) -> Tenant:
    t = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return t


class BroadcastCreate(BaseModel):
    name: str
    channel: str = "whatsapp"   # whatsapp | instagram | facebook | email
    message: str
    filter_tag: Optional[str] = None          # simple filter by tag/campaign (legacy)
    segment_tags: Optional[List[str]] = None  # advanced: filter by tags array
    segment_min_score: Optional[int] = None   # advanced: filter by lead_score >=
    segment_source: Optional[str] = None      # advanced: filter by source channel
    scheduled_at: Optional[datetime] = None


@router.get("")
@router.get("/")
def list_broadcasts(
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tenant = _get_tenant(db, current_user)
    with tenant_db_session(tenant.schema_name) as tdb:
        try:
            rows = tdb.execute(text(
                "SELECT id, name, message, channel, status, sent_count, failed_count, "
                "recipient_count, segment_tags, segment_min_score, segment_source, "
                "filter_tag, scheduled_at, created_at, sent_at "
                f"FROM {tenant.schema_name}.broadcasts ORDER BY created_at DESC LIMIT :lim"
            ), {"lim": limit}).fetchall()
            return [dict(r._mapping) for r in rows]
        except Exception:
            # Fallback to ORM if raw SQL columns differ
            items = tdb.query(Broadcast).order_by(Broadcast.created_at.desc()).limit(limit).all()
            return [
                {
                    "id": b.id,
                    "name": b.name,
                    "channel": b.channel,
                    "message": b.message,
                    "status": b.status,
                    "sent_count": b.sent_count,
                    "failed_count": getattr(b, "failed_count", 0),
                    "filter_tag": getattr(b, "filter_tag", None),
                    "created_at": b.created_at.isoformat() if b.created_at else None,
                    "sent_at": b.sent_at.isoformat() if b.sent_at else None,
                }
                for b in items
            ]


@router.post("")
@router.post("/")
def create_broadcast(
    payload: BroadcastCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.channel not in ("whatsapp", "instagram", "facebook", "email"):
        raise HTTPException(status_code=400, detail="Canal debe ser whatsapp, instagram, facebook o email")
    tenant = _get_tenant(db, current_user)
    with tenant_db_session(tenant.schema_name) as tdb:
        # Build segment filters
        where_clauses = ["1=1"]
        params: dict = {}

        # Legacy filter_tag support
        if payload.filter_tag:
            where_clauses.append("(campaign = :filter_tag OR tags::text LIKE :filter_tag_like)")
            params["filter_tag"] = payload.filter_tag
            params["filter_tag_like"] = f"%{payload.filter_tag}%"

        # Advanced segmentation
        if payload.segment_tags:
            where_clauses.append("tags @> :tags::jsonb")
            params["tags"] = json.dumps(payload.segment_tags)
        if payload.segment_min_score is not None:
            where_clauses.append("lead_score >= :min_score")
            params["min_score"] = payload.segment_min_score
        if payload.segment_source:
            where_clauses.append("source = :source")
            params["source"] = payload.segment_source

        try:
            count_sql = f"SELECT COUNT(*) FROM {tenant.schema_name}.contacts WHERE " + " AND ".join(where_clauses)
            recipient_count = tdb.execute(text(count_sql), params).scalar() or 0
        except Exception:
            recipient_count = 0

        try:
            result = tdb.execute(text(
                f"INSERT INTO {tenant.schema_name}.broadcasts "
                "(name, message, channel, status, sent_count, recipient_count, "
                "segment_tags, segment_min_score, segment_source, filter_tag, scheduled_at, created_at) "
                "VALUES (:name, :msg, :channel, 'draft', 0, :recipient_count, "
                ":tags, :min_score, :source, :filter_tag, :scheduled_at, NOW()) RETURNING id"
            ), {
                "name": payload.name,
                "msg": payload.message,
                "channel": payload.channel,
                "recipient_count": recipient_count,
                "tags": json.dumps(payload.segment_tags) if payload.segment_tags else None,
                "min_score": payload.segment_min_score,
                "source": payload.segment_source,
                "filter_tag": payload.filter_tag,
                "scheduled_at": payload.scheduled_at,
            })
            tdb.commit()
            bcast_id = result.fetchone()[0]
            return {"id": bcast_id, "recipient_count": recipient_count, "status": "draft", "name": payload.name}
        except Exception:
            # Fallback to ORM
            b = Broadcast(
                name=payload.name,
                channel=payload.channel,
                message=payload.message,
                filter_tag=payload.filter_tag,
                status="draft",
            )
            tdb.add(b)
            tdb.commit()
            tdb.refresh(b)
            return {"id": b.id, "status": "draft", "name": b.name}


@router.post("/{broadcast_id}/send")
async def send_broadcast(
    broadcast_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tenant = _get_tenant(db, current_user)
    s = db.query(TenantSettings).filter(TenantSettings.tenant_id == tenant.id).first()

    with tenant_db_session(tenant.schema_name) as tdb:
        # Try raw SQL first, fallback to ORM
        try:
            bcast = tdb.execute(text(
                f"SELECT * FROM {tenant.schema_name}.broadcasts WHERE id = :id"
            ), {"id": broadcast_id}).fetchone()
            if not bcast:
                raise HTTPException(status_code=404, detail="Broadcast no encontrado")
            bcast_status = bcast.status
        except HTTPException:
            raise
        except Exception:
            b = tdb.query(Broadcast).filter(Broadcast.id == broadcast_id).first()
            if not b:
                raise HTTPException(status_code=404, detail="Broadcast no encontrado")
            bcast_status = b.status

        if bcast_status in ("sending", "sent"):
            raise HTTPException(status_code=409, detail="Ya está enviándose o fue enviado")

        try:
            tdb.execute(text(
                f"UPDATE {tenant.schema_name}.broadcasts SET status='sending' WHERE id=:id"
            ), {"id": broadcast_id})
        except Exception:
            b = tdb.query(Broadcast).filter(Broadcast.id == broadcast_id).first()
            if b:
                b.status = "sending"
        tdb.commit()

    background_tasks.add_task(
        _do_send_broadcast,
        tenant_schema=tenant.schema_name,
        broadcast_id=broadcast_id,
        settings=s,
    )
    return {"status": "sending", "broadcast_id": broadcast_id}


async def _do_send_broadcast(tenant_schema: str, broadcast_id: int, settings: TenantSettings):
    """Background task: send broadcast message to all matching contacts."""
    sent = 0
    failed = 0

    try:
        with tenant_db_session(tenant_schema) as tdb:
            b = tdb.query(Broadcast).filter(Broadcast.id == broadcast_id).first()
            if not b:
                return

            # Build contact query with advanced segmentation
            q = tdb.query(Contact)
            filter_tag = getattr(b, "filter_tag", None)
            if filter_tag:
                q = q.filter(Contact.campaign == filter_tag)
            contacts = q.all()

            channel = b.channel
            message = b.message

            wa_token = getattr(settings, "whatsapp_access_token", None) if settings else None
            wa_phone_id = getattr(settings, "whatsapp_phone_id", None) if settings else None
            ig_token = getattr(settings, "instagram_access_token", None) if settings else None
            ig_page_id = getattr(settings, "instagram_page_id", "me") or "me" if settings else "me"
            fb_token = getattr(settings, "facebook_access_token", None) if settings else None

            for contact in contacts:
                ok = False
                try:
                    if channel == "whatsapp" and wa_token and wa_phone_id and contact.phone:
                        phone = contact.phone.lstrip("+")
                        ok = await messaging.send_whatsapp(wa_phone_id, wa_token, phone, message)

                    elif channel == "instagram" and ig_token and contact.external_id:
                        ok = await messaging.send_instagram(ig_token, contact.external_id, message, ig_page_id)

                    elif channel == "facebook" and fb_token and contact.external_id:
                        ok = await messaging.send_facebook(fb_token, contact.external_id, message)

                except Exception as e:
                    print(f"[broadcast] Contact {contact.id} error: {e}")
                    ok = False

                if ok:
                    sent += 1
                else:
                    failed += 1

                # Throttle: avoid API rate limits
                await asyncio.sleep(0.3)

            b.sent_count = sent
            b.failed_count = failed
            b.status = "sent"
            b.sent_at = datetime.utcnow()
            tdb.commit()

    except Exception as e:
        print(f"[broadcast] Fatal error in broadcast {broadcast_id}: {e}")
        try:
            with tenant_db_session(tenant_schema) as tdb:
                b = tdb.query(Broadcast).filter(Broadcast.id == broadcast_id).first()
                if b:
                    b.status = "failed"
                    b.sent_count = sent
                    b.failed_count = failed
                    tdb.commit()
        except Exception:
            pass


@router.delete("/{broadcast_id}")
def delete_broadcast(
    broadcast_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tenant = _get_tenant(db, current_user)
    with tenant_db_session(tenant.schema_name) as tdb:
        try:
            tdb.execute(text(
                f"DELETE FROM {tenant.schema_name}.broadcast_recipients WHERE broadcast_id=:id"
            ), {"id": broadcast_id})
            tdb.execute(text(
                f"DELETE FROM {tenant.schema_name}.broadcasts WHERE id=:id"
            ), {"id": broadcast_id})
        except Exception:
            b = tdb.query(Broadcast).filter(Broadcast.id == broadcast_id).first()
            if not b:
                raise HTTPException(status_code=404, detail="Broadcast no encontrado")
            if getattr(b, "status", None) == "sending":
                raise HTTPException(status_code=409, detail="No se puede eliminar mientras se envía")
            tdb.delete(b)
        tdb.commit()
    return {"ok": True, "deleted": True}
