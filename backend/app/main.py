from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
import httpx
from app.core.config import settings
from app.api.v1.router import api_router
from app.core.database import engine, Base
import app.models.core    # noqa: F401 — register models
import app.models.admin   # noqa: F401
import app.models.billing # noqa: F401
import app.models.tenant  # noqa: F401

# Create public tables if they don't exist
Base.metadata.create_all(bind=engine)

# Seed default plans if table is empty
def _seed_plans():
    from app.core.database import SessionLocal
    from app.models.billing import Plan
    db = SessionLocal()
    try:
        for name, price, features in [
            ("Starter", 29.0, {"contacts": 1000, "channels": 2, "ai": False}),
            ("Pro",     79.0, {"contacts": 10000, "channels": 5, "ai": True}),
            ("Enterprise", 199.0, {"contacts": -1, "channels": -1, "ai": True}),
        ]:
            if not db.query(Plan).filter(Plan.name == name).first():
                db.add(Plan(name=name, price=price, features=features))
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[startup] Plan seed warning: {e}", flush=True)
    finally:
        db.close()

_seed_plans()


def _seed_roles():
    from app.core.database import SessionLocal
    from app.models.core import Role
    db = SessionLocal()
    try:
        for name, permissions in [
            ("admin",  {"conversations": True, "crm": True, "settings": True, "billing": True, "team": True}),
            ("agent",  {"conversations": True, "crm": True, "settings": False, "billing": False, "team": False}),
            ("viewer", {"conversations": True, "crm": False, "settings": False, "billing": False, "team": False}),
        ]:
            existing = db.query(Role).filter(Role.name == name).first()
            if not existing:
                db.add(Role(name=name, permissions=permissions))
        db.commit()
    finally:
        db.close()

_seed_roles()


# Seed platform superadmin from env vars (SUPERADMIN_EMAIL + SUPERADMIN_PASSWORD)
def _seed_superadmin():
    if not settings.SUPERADMIN_EMAIL or not settings.SUPERADMIN_PASSWORD:
        return
    from app.core.database import SessionLocal
    from app.models.core import Tenant, TenantSettings, User
    from app.core.security import get_password_hash
    db = SessionLocal()
    try:
        existing = db.query(User).filter(
            User.email == settings.SUPERADMIN_EMAIL
        ).first()
        if existing:
            # Ensure they have superuser flag
            if not existing.is_superuser:
                existing.is_superuser = True
                db.commit()
            return

        # Create a dedicated platform tenant for superadmin if none exists
        platform_tenant = db.query(Tenant).filter(
            Tenant.subdomain == "platform"
        ).first()
        if not platform_tenant:
            from app.services.tenant import create_tenant_schema
            platform_tenant = Tenant(
                name="OmniFlow Platform",
                schema_name="tenant_platform",
                subdomain="platform",
                is_active=True,
            )
            db.add(platform_tenant)
            db.flush()
            db.add(TenantSettings(tenant_id=platform_tenant.id))
            db.commit()
            db.refresh(platform_tenant)
            try:
                create_tenant_schema("tenant_platform")
            except Exception as e:
                print(f"[startup] Schema creation warning: {e}")

        superadmin = User(
            tenant_id=platform_tenant.id,
            email=settings.SUPERADMIN_EMAIL,
            hashed_password=get_password_hash(settings.SUPERADMIN_PASSWORD),
            full_name="SuperAdmin",
            is_superuser=True,
            is_active=True,
        )
        db.add(superadmin)
        db.commit()
        print(f"[startup] Superadmin created: {settings.SUPERADMIN_EMAIL}")
    finally:
        db.close()

_seed_superadmin()


def _migrate_tenant_schemas():
    """
    Safe, idempotent migration: adds any missing columns to existing tenant schemas.
    Runs on every startup — ALTER TABLE ... ADD COLUMN IF NOT EXISTS is a no-op if column exists.
    """
    import re
    from app.core.database import SessionLocal, engine
    from app.models.core import Tenant
    from sqlalchemy import text
    db = SessionLocal()
    try:
        tenants = db.query(Tenant).all()
        migrations = [
            "ALTER TABLE {schema}.conversations ADD COLUMN IF NOT EXISTS bot_active BOOLEAN DEFAULT TRUE",
        ]
        with engine.begin() as conn:
            for tenant in tenants:
                schema = tenant.schema_name
                if not re.match(r'^[a-z0-9_]+$', schema):
                    continue
                for migration in migrations:
                    conn.execute(text(migration.format(schema=schema)))
        print(f"[startup] Schema migration complete ({len(tenants)} tenants)", flush=True)
    except Exception as e:
        print(f"[startup] Migration warning: {e}", flush=True)
    finally:
        db.close()

_migrate_tenant_schemas()


async def _whatsapp_token_refresh_loop():
    """
    Background task: every 45 days, exchange WhatsApp tokens for fresh 60-day tokens
    for all tenants that have meta_app_id, meta_app_secret, and whatsapp_access_token set.
    Runs immediately on startup so we catch tokens close to expiry, then every 45 days.
    """
    INTERVAL_SECONDS = 45 * 24 * 3600  # 45 days
    while True:
        await asyncio.sleep(5)  # brief delay after startup before first run
        try:
            from app.core.database import SessionLocal
            from app.models.core import Tenant
            db = SessionLocal()
            try:
                tenants = db.query(Tenant).filter(Tenant.is_active == True).all()
                async with httpx.AsyncClient(timeout=10) as client:
                    for tenant in tenants:
                        s = tenant.settings
                        if not s:
                            continue
                        if not (s.whatsapp_access_token and s.meta_app_id and s.meta_app_secret):
                            continue
                        try:
                            r = await client.get(
                                "https://graph.facebook.com/oauth/access_token",
                                params={
                                    "grant_type": "fb_exchange_token",
                                    "client_id": s.meta_app_id,
                                    "client_secret": s.meta_app_secret,
                                    "fb_exchange_token": s.whatsapp_access_token,
                                },
                            )
                            data = r.json()
                            if "access_token" in data:
                                s.whatsapp_access_token = data["access_token"]
                                db.commit()
                                days = round(data.get("expires_in", 5183944) / 86400)
                                print(f"[token-refresh] Tenant {tenant.subdomain}: token refreshed, expires in {days}d", flush=True)
                            else:
                                err = data.get("error", {}).get("message", "unknown")
                                print(f"[token-refresh] Tenant {tenant.subdomain}: refresh failed — {err}", flush=True)
                        except Exception as e:
                            print(f"[token-refresh] Tenant {tenant.subdomain}: error — {e}", flush=True)
            finally:
                db.close()
        except Exception as e:
            print(f"[token-refresh] Loop error: {e}", flush=True)
        await asyncio.sleep(INTERVAL_SECONDS)


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(_whatsapp_token_refresh_loop())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# Set all CORS enabled origins
_raw_origins = settings.CORS_ORIGINS
_allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()] if _raw_origins else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def tenant_middleware(request: Request, call_next):
    # This middleware could detect tenant from subdomain or custom domain
    # For now, we'll rely on the JWT tenant_id for authenticated requests
    # But for public pages (landing, white-label branding), we need host detection
    host = request.headers.get("host", "")
    request.state.host = host
    
    response = await call_next(request)
    return response

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {"message": "Welcome to OmniFlow API", "status": "running"}
