import hmac
import hashlib
import json
from datetime import datetime, timedelta

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.billing import Plan, Subscription
from app.models.core import Tenant

router = APIRouter()

PLAN_PRICES = {
    "starter": {"monthly": 29, "annual": 23},
    "pro":     {"monthly": 79, "annual": 63},
    "enterprise": {"monthly": 199, "annual": 159},
}

PLAN_TITLES = {
    "starter": "OmniFlow Starter",
    "pro": "OmniFlow Pro",
    "enterprise": "OmniFlow Enterprise",
}


# ── Current subscription ──────────────────────────────────────────────────────
@router.get("/current")
def get_current_subscription(db: Session = Depends(get_db)):
    tenant = db.query(Tenant).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    sub = db.query(Subscription).filter(Subscription.tenant_id == tenant.id).first()
    if not sub:
        return {"status": "none", "plan": "Free"}
    return {
        "status": sub.status,
        "plan": sub.plan.name,
        "current_period_end": sub.current_period_end,
    }


# ── Internal subscribe (admin / post-payment activation) ─────────────────────
@router.post("/subscribe/{plan_id}")
def create_subscription(plan_id: int, db: Session = Depends(get_db)):
    tenant = db.query(Tenant).first()
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    sub = db.query(Subscription).filter(Subscription.tenant_id == tenant.id).first()
    if sub:
        sub.plan_id = plan.id
        sub.status = "active"
    else:
        sub = Subscription(
            tenant_id=tenant.id,
            plan_id=plan.id,
            status="active",
            current_period_start=datetime.utcnow(),
            current_period_end=datetime.utcnow() + timedelta(days=30),
        )
        db.add(sub)
    db.commit()
    return {"status": "subscribed", "plan": plan.name}


# ── Create Mercado Pago preference ────────────────────────────────────────────
class PreferenceRequest(BaseModel):
    plan: str
    billing: str
    email: str
    subdomain: str


@router.post("/create-preference")
async def create_mp_preference(body: PreferenceRequest):
    if not settings.MP_ACCESS_TOKEN:
        raise HTTPException(status_code=503, detail="Mercado Pago not configured. Contact support.")

    prices = PLAN_PRICES.get(body.plan)
    if not prices:
        raise HTTPException(status_code=400, detail="Invalid plan")

    price = prices.get(body.billing, prices["monthly"])
    title = PLAN_TITLES.get(body.plan, "OmniFlow Plan")

    back_url_base = f"{settings.FRONTEND_URL}/payment-success?subdomain={body.subdomain}&email={body.email}"

    preference_data = {
        "items": [
            {
                "title": f"{title} · {'Anual' if body.billing == 'annual' else 'Mensual'}",
                "quantity": 1,
                "unit_price": price,
                "currency_id": "USD",
            }
        ],
        "payer": {"email": body.email},
        "external_reference": f"{body.subdomain}|{body.plan}|{body.billing}",
        "back_urls": {
            "success": back_url_base + "&status=approved",
            "failure": f"{settings.FRONTEND_URL}/checkout?plan={body.plan}&billing={body.billing}&email={body.email}&subdomain={body.subdomain}&error=1",
            "pending": f"{settings.FRONTEND_URL}/payment-pending?plan={body.plan}&billing={body.billing}&email={body.email}&subdomain={body.subdomain}&method=mp",
        },
        "auto_return": "approved",
        "notification_url": f"{settings.FRONTEND_URL}/api/v1/billing/mp-webhook",
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.mercadopago.com/checkout/preferences",
            json=preference_data,
            headers={
                "Authorization": f"Bearer {settings.MP_ACCESS_TOKEN}",
                "Content-Type": "application/json",
            },
        )

    if response.status_code not in (200, 201):
        raise HTTPException(status_code=502, detail=f"Mercado Pago error: {response.text}")

    data = response.json()
    return {"init_point": data["init_point"], "id": data["id"]}


# ── Mercado Pago webhook ──────────────────────────────────────────────────────
@router.post("/mp-webhook")
async def mp_webhook(request: Request, db: Session = Depends(get_db)):
    body = await request.body()
    try:
        data = json.loads(body)
    except Exception:
        return {"status": "ignored"}

    if data.get("type") != "payment":
        return {"status": "ignored"}

    payment_id = data.get("data", {}).get("id")
    if not payment_id or not settings.MP_ACCESS_TOKEN:
        return {"status": "ignored"}

    # Fetch payment details
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"https://api.mercadopago.com/v1/payments/{payment_id}",
            headers={"Authorization": f"Bearer {settings.MP_ACCESS_TOKEN}"},
        )

    if resp.status_code != 200:
        return {"status": "error"}

    payment = resp.json()
    if payment.get("status") != "approved":
        return {"status": "pending"}

    # Parse external reference: subdomain|plan|billing
    ext_ref = payment.get("external_reference", "")
    parts = ext_ref.split("|")
    if len(parts) < 2:
        return {"status": "bad_reference"}

    subdomain, plan_key = parts[0], parts[1]
    billing = parts[2] if len(parts) > 2 else "monthly"

    # Find or look up plan record
    plan_name_map = {"starter": "Starter", "pro": "Pro", "enterprise": "Enterprise"}
    plan_name = plan_name_map.get(plan_key, "Pro")
    plan = db.query(Plan).filter(Plan.name == plan_name).first()

    # Find tenant by subdomain
    tenant = db.query(Tenant).filter(Tenant.subdomain == subdomain).first()
    if not tenant:
        return {"status": "tenant_not_found"}

    # Activate tenant
    tenant.is_active = True

    # Create/update subscription
    if plan:
        days = 365 if billing == "annual" else 30
        sub = db.query(Subscription).filter(Subscription.tenant_id == tenant.id).first()
        if sub:
            sub.plan_id = plan.id
            sub.status = "active"
            sub.current_period_end = datetime.utcnow() + timedelta(days=days)
        else:
            sub = Subscription(
                tenant_id=tenant.id,
                plan_id=plan.id,
                status="active",
                current_period_start=datetime.utcnow(),
                current_period_end=datetime.utcnow() + timedelta(days=days),
            )
            db.add(sub)

    db.commit()
    return {"status": "activated", "tenant": subdomain}


# ── Legacy stripe webhook (no-op) ────────────────────────────────────────────
@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    return {"status": "received"}
