"""
n8n Manager — clone and activate workflow templates per tenant.

Uses n8n REST API v1:
  GET  /api/v1/workflows           → list existing
  POST /api/v1/workflows           → create (clone)
  POST /api/v1/workflows/{id}/activate → activate
  DELETE /api/v1/workflows/{id}    → deactivate/delete

Auth: X-N8N-API-KEY header
"""
import json
import os
from pathlib import Path
import httpx
from app.core.config import settings

TEMPLATES_DIR = Path(__file__).parent.parent.parent.parent / "n8n_workflows"


def _headers() -> dict:
    return {"X-N8N-API-KEY": settings.N8N_API_KEY, "Content-Type": "application/json"}


def _n8n_url(path: str) -> str:
    base = settings.N8N_URL.rstrip("/")
    return f"{base}/api/v1{path}"


async def get_all_workflows() -> list[dict]:
    """List all workflows in n8n."""
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(_n8n_url("/workflows"), headers=_headers())
        resp.raise_for_status()
        return resp.json().get("data", [])


async def clone_template(
    template_file: str,
    tenant_id: int,
    tenant_name: str,
    phone_number_id: str,
    wa_access_token: str,
    backend_url: str,
) -> dict:
    """
    Load a workflow template JSON, patch tenant variables, and create in n8n.
    Returns the created workflow dict.
    """
    template_path = TEMPLATES_DIR / template_file
    if not template_path.exists():
        raise FileNotFoundError(f"Template not found: {template_file}")

    workflow = json.loads(template_path.read_text())

    # Rename
    original_name = workflow.get("name", "Workflow")
    workflow["name"] = f"[T{tenant_id}] {tenant_name} — {original_name}"

    # Remove id so n8n assigns a new one
    workflow.pop("id", None)
    workflow.pop("createdAt", None)
    workflow.pop("updatedAt", None)
    workflow["active"] = False  # activate separately

    # Inject tenant variables into staticData or env nodes
    static_data = workflow.get("staticData") or {}
    static_data.update({
        "tenant_id": str(tenant_id),
        "phone_number_id": phone_number_id,
        "wa_access_token": wa_access_token,
        "backend_url": backend_url,
    })
    workflow["staticData"] = static_data

    # Patch HTTP Request nodes that call backend
    for node in workflow.get("nodes", []):
        params = node.get("parameters", {})
        url = params.get("url", "")
        if "{{backend_url}}" in str(url):
            params["url"] = url.replace("{{backend_url}}", backend_url)
        if "{{tenant_id}}" in str(params):
            node["parameters"] = json.loads(
                json.dumps(params).replace("{{tenant_id}}", str(tenant_id))
            )

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            _n8n_url("/workflows"),
            headers=_headers(),
            json=workflow,
        )
        if resp.status_code not in (200, 201):
            raise RuntimeError(f"n8n create failed: {resp.status_code} {resp.text[:300]}")
        return resp.json()


async def activate_workflow(workflow_id: str) -> bool:
    """Activate a workflow by ID."""
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            _n8n_url(f"/workflows/{workflow_id}/activate"),
            headers=_headers(),
        )
        return resp.status_code in (200, 204)


async def deactivate_and_delete(workflow_id: str) -> bool:
    """Deactivate then delete a workflow."""
    async with httpx.AsyncClient(timeout=15) as client:
        await client.post(_n8n_url(f"/workflows/{workflow_id}/deactivate"), headers=_headers())
        resp = await client.delete(_n8n_url(f"/workflows/{workflow_id}"), headers=_headers())
        return resp.status_code in (200, 204)


# Templates to clone when a tenant connects WhatsApp
WHATSAPP_TEMPLATES = [
    "whatsapp_ia_pro.json",
    "ai_sales_agent_pro.json",
]


async def provision_tenant_workflows(
    tenant_id: int,
    tenant_name: str,
    phone_number_id: str,
    wa_access_token: str,
) -> dict[str, str]:
    """
    Clone and activate all WhatsApp template workflows for a tenant.
    Returns mapping: { template_file: workflow_id }
    """
    backend_url = settings.BACKEND_URL or settings.FRONTEND_URL
    mapping: dict[str, str] = {}

    for template_file in WHATSAPP_TEMPLATES:
        try:
            wf = await clone_template(
                template_file=template_file,
                tenant_id=tenant_id,
                tenant_name=tenant_name,
                phone_number_id=phone_number_id,
                wa_access_token=wa_access_token,
                backend_url=backend_url,
            )
            wf_id = str(wf.get("id", ""))
            if wf_id:
                await activate_workflow(wf_id)
                mapping[template_file] = wf_id
                print(f"[n8n] Workflow {template_file} → {wf_id} activated for tenant {tenant_id}", flush=True)
        except Exception as e:
            print(f"[n8n] Failed to clone {template_file} for tenant {tenant_id}: {e}", flush=True)

    return mapping


async def deprovision_tenant_workflows(workflow_ids: dict[str, str]) -> None:
    """Delete all n8n workflows for a tenant (on disconnect)."""
    for template_file, wf_id in workflow_ids.items():
        try:
            await deactivate_and_delete(wf_id)
            print(f"[n8n] Deleted workflow {wf_id} ({template_file})", flush=True)
        except Exception as e:
            print(f"[n8n] Failed to delete {wf_id}: {e}", flush=True)
