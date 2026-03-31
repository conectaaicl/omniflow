"""bookings.py — Calendar & booking system for OmniFlow"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db, tenant_db_session
from app.core.security import get_current_user
from app.models.core import Tenant, User
from datetime import datetime, date, time

router = APIRouter()


def _get_tenant(db: Session, current_user: User) -> Tenant:
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant


class AvailabilitySlotCreate(BaseModel):
    day_of_week: int   # 0=Mon ... 6=Sun
    start_time: str    # "09:00"
    end_time: str      # "10:00"
    service: Optional[str] = None
    capacity: int = 1


class BookingCreate(BaseModel):
    contact_id: Optional[int] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    service: str
    scheduled_at: datetime
    duration_minutes: int = 60
    notes: Optional[str] = None


# ─── AVAILABILITY ───────────────────────────────────────────────

@router.get("/availability")
def list_availability(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tenant = _get_tenant(db, current_user)
    with tenant_db_session(tenant.schema_name) as tdb:
        rows = tdb.execute(text(
            f"SELECT id, day_of_week, start_time, end_time, service, capacity, is_active "
            f"FROM {tenant.schema_name}.availability_slots ORDER BY day_of_week, start_time"
        )).fetchall()
        return [dict(r._mapping) for r in rows]


@router.post("/availability")
def create_availability_slot(
    data: AvailabilitySlotCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tenant = _get_tenant(db, current_user)
    with tenant_db_session(tenant.schema_name) as tdb:
        result = tdb.execute(text(
            f"INSERT INTO {tenant.schema_name}.availability_slots "
            "(day_of_week, start_time, end_time, service, capacity, is_active) "
            "VALUES (:dow, :start, :end, :service, :cap, TRUE) RETURNING id"
        ), {
            "dow": data.day_of_week,
            "start": data.start_time,
            "end": data.end_time,
            "service": data.service,
            "cap": data.capacity,
        })
        tdb.commit()
        return {"id": result.fetchone()[0]}


@router.delete("/availability/{slot_id}")
def delete_availability_slot(
    slot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tenant = _get_tenant(db, current_user)
    with tenant_db_session(tenant.schema_name) as tdb:
        tdb.execute(text(
            f"DELETE FROM {tenant.schema_name}.availability_slots WHERE id=:id"
        ), {"id": slot_id})
        tdb.commit()
    return {"ok": True}


# ─── BOOKINGS ───────────────────────────────────────────────────

@router.get("")
def list_bookings(
    status: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tenant = _get_tenant(db, current_user)
    with tenant_db_session(tenant.schema_name) as tdb:
        where = ["1=1"]
        params = {"lim": limit}
        if status:
            where.append("b.status = :status")
            params["status"] = status
        if from_date:
            where.append("b.scheduled_at >= :from_date::timestamp")
            params["from_date"] = from_date

        rows = tdb.execute(text(
            f"SELECT b.id, b.service, b.scheduled_at, b.duration_minutes, b.status, "
            f"b.notes, b.contact_name, b.contact_phone, b.created_at, "
            f"c.name as contact_db_name, c.phone as contact_db_phone "
            f"FROM {tenant.schema_name}.bookings b "
            f"LEFT JOIN {tenant.schema_name}.contacts c ON b.contact_id = c.id "
            f"WHERE {' AND '.join(where)} "
            f"ORDER BY b.scheduled_at ASC LIMIT :lim"
        ), params).fetchall()
        result = []
        for r in rows:
            d = dict(r._mapping)
            d["display_name"] = d["contact_db_name"] or d["contact_name"] or "Sin nombre"
            d["display_phone"] = d["contact_db_phone"] or d["contact_phone"] or ""
            result.append(d)
        return result


@router.post("")
def create_booking(
    data: BookingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tenant = _get_tenant(db, current_user)
    with tenant_db_session(tenant.schema_name) as tdb:
        # Check for conflicts
        conflict = tdb.execute(text(
            f"SELECT id FROM {tenant.schema_name}.bookings "
            "WHERE scheduled_at = :at AND status NOT IN ('cancelled') "
            "AND service = :service"
        ), {"at": data.scheduled_at, "service": data.service}).fetchone()
        if conflict:
            raise HTTPException(status_code=409, detail="Ese horario ya está reservado para ese servicio")

        result = tdb.execute(text(
            f"INSERT INTO {tenant.schema_name}.bookings "
            "(contact_id, contact_name, contact_phone, service, scheduled_at, duration_minutes, notes, status, created_at) "
            "VALUES (:contact_id, :name, :phone, :service, :at, :dur, :notes, 'confirmed', NOW()) RETURNING id"
        ), {
            "contact_id": data.contact_id,
            "name": data.contact_name,
            "phone": data.contact_phone,
            "service": data.service,
            "at": data.scheduled_at,
            "dur": data.duration_minutes,
            "notes": data.notes,
        })
        tdb.commit()
        return {"id": result.fetchone()[0], "status": "confirmed"}


@router.patch("/{booking_id}")
def update_booking_status(
    booking_id: int,
    status: str = Query(..., regex="^(confirmed|cancelled|completed|no_show)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tenant = _get_tenant(db, current_user)
    with tenant_db_session(tenant.schema_name) as tdb:
        tdb.execute(text(
            f"UPDATE {tenant.schema_name}.bookings SET status=:status WHERE id=:id"
        ), {"status": status, "id": booking_id})
        tdb.commit()
    return {"ok": True, "status": status}


@router.delete("/{booking_id}")
def delete_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tenant = _get_tenant(db, current_user)
    with tenant_db_session(tenant.schema_name) as tdb:
        tdb.execute(text(
            f"DELETE FROM {tenant.schema_name}.bookings WHERE id=:id"
        ), {"id": booking_id})
        tdb.commit()
    return {"ok": True}


# ─── PUBLIC AVAILABILITY (for bot) ─────────────────────────────

@router.get("/public/slots/{date_str}")
def get_available_slots_for_date(
    date_str: str,
    service: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return available time slots for a given date (for bot scheduling)."""
    import datetime as dt
    try:
        target = dt.date.fromisoformat(date_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Fecha inválida (use YYYY-MM-DD)")

    dow = target.weekday()  # 0=Monday
    tenant = _get_tenant(db, current_user)
    with tenant_db_session(tenant.schema_name) as tdb:
        slots = tdb.execute(text(
            f"SELECT start_time, end_time, service, capacity FROM {tenant.schema_name}.availability_slots "
            "WHERE day_of_week = :dow AND is_active = TRUE "
            + ("AND (service = :service OR service IS NULL) " if service else "")
            + "ORDER BY start_time"
        ), {"dow": dow, **({"service": service} if service else {})}).fetchall()

        # Check existing bookings for that day
        booked = tdb.execute(text(
            f"SELECT service, TO_CHAR(scheduled_at, 'HH24:MI') as time_str FROM {tenant.schema_name}.bookings "
            "WHERE scheduled_at::date = :d AND status NOT IN ('cancelled')"
        ), {"d": date_str}).fetchall()
        booked_set = {(b.service, b.time_str) for b in booked}

        result = []
        for s in slots:
            slot_key = (s.service, s.start_time[:5])
            available = slot_key not in booked_set
            result.append({
                "start_time": s.start_time[:5],
                "end_time": s.end_time[:5],
                "service": s.service,
                "available": available,
            })
        return {"date": date_str, "slots": result}
