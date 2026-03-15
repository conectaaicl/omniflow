from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from sqlalchemy.orm import Session
from app.core.database import get_db, tenant_db_session
from app.core.config import settings
from app.services.crm import ingest_lead
from app.services.automation import trigger_n8n_workflow
from app.models.core import Tenant, TenantSettings

router = APIRouter()


@router.get("/whatsapp")
async def verify_whatsapp_webhook(request: Request):
    params = request.query_params
    hub_mode = params.get("hub.mode")
    hub_verify_token = params.get("hub.verify_token")
    hub_challenge = params.get("hub.challenge")

    if hub_mode == "subscribe" and hub_verify_token == settings.WHATSAPP_VERIFY_TOKEN:
        return Response(content=hub_challenge, media_type="text/plain")

    raise HTTPException(status_code=403, detail="Verification failed")


@router.post("/whatsapp")
async def handle_whatsapp_webhook(request: Request, db: Session = Depends(get_db)):
    body = await request.json()

    entry = body.get("entry", [{}])[0]
    changes = entry.get("changes", [{}])[0]
    value = changes.get("value", {})

    if "messages" not in value:
        return {"status": "no_messages"}

    phone_number_id = value.get("metadata", {}).get("phone_number_id")

    tenant_settings = db.query(TenantSettings).filter(
        TenantSettings.whatsapp_phone_id == phone_number_id
    ).first()
    if not tenant_settings:
        tenant = db.query(Tenant).first()
        if not tenant:
            return {"status": "tenant_not_found"}
        tenant_settings = tenant.settings
        tenant_obj = tenant
    else:
        tenant_obj = tenant_settings.tenant

    messages = value.get("messages", [])
    contacts_info = value.get("contacts", [])

    with tenant_db_session(tenant_obj.schema_name) as tenant_db:
        for msg in messages:
            sender_phone = msg.get("from")
            content = msg.get("text", {}).get("body", "")
            contact_name = (
                contacts_info[0].get("profile", {}).get("name", "WhatsApp User")
                if contacts_info else "WhatsApp User"
            )

            lead_data = {
                "name": contact_name,
                "phone": sender_phone,
                "source": "whatsapp",
                "message": content,
                "whatsapp_msg_id": msg.get("id")
            }

            contact, conversation = ingest_lead(tenant_db, lead_data, tenant_obj.id)

            if tenant_settings.n8n_url and tenant_settings.n8n_webhook_path:
                payload = {
                    "tenant_id": tenant_obj.id,
                    "contact": {"id": contact.id, "name": contact.name, "phone": contact.phone},
                    "message": {"content": content, "id": msg.get("id")}
                }
                await trigger_n8n_workflow(tenant_settings, payload)

    return {"status": "success"}


@router.post("/facebook-leads")
async def handle_facebook_leads(request: Request, db: Session = Depends(get_db)):
    return {"status": "success"}


@router.post("/tiktok-leads")
async def handle_tiktok_leads(request: Request, db: Session = Depends(get_db)):
    return {"status": "success"}
