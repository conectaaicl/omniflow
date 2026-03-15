from fastapi import APIRouter
from app.api.v1.endpoints import auth, tenants, webhooks, conversations, crm, admin, billing

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(tenants.router, prefix="/tenants", tags=["tenants"])
api_router.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])
api_router.include_router(conversations.router, prefix="/conversations", tags=["conversations"])
api_router.include_router(crm.router, prefix="/crm", tags=["crm"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(billing.router, prefix="/billing", tags=["billing"])
