from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.router import api_router
from app.core.database import engine, Base
import app.models.core    # noqa: F401 — register models
import app.models.admin   # noqa: F401
import app.models.billing # noqa: F401
import app.models.tenant  # noqa: F401

# Create public tables if they don't exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
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
