"""
Internal endpoints — called by n8n workflows, not exposed to frontend users.
Auth: X-Internal-Secret header matching N8N_API_SECRET.

GET  /internal/knowledge-search  → semantic search for n8n AI context injection
POST /internal/log-message       → log inbound message for analytics
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.services.embeddings import get_embedding_sync

router = APIRouter()


def _verify_internal(request: Request):
    secret = request.headers.get("X-Internal-Secret", "")
    if not secret or secret != settings.N8N_API_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")


@router.get("/knowledge-search")
def knowledge_search(
    request: Request,
    tenant_id: int = Query(...),
    q: str = Query(..., min_length=1),
    top_k: int = Query(3, le=5),
    db: Session = Depends(get_db),
):
    """
    Semantic search over a tenant's knowledge base.
    Called by n8n before passing message to AI — injects business context.
    Returns plain text context string ready to be injected into AI prompt.
    """
    _verify_internal(request)

    emb = get_embedding_sync(q)
    emb_str = f"[{','.join(str(x) for x in emb)}]"

    rows = db.execute(
        text("""
            SELECT contenido,
                   1 - (embedding <=> :emb::vector) AS similarity
            FROM knowledge_base
            WHERE tenant_id = :tid
              AND embedding IS NOT NULL
              AND (1 - (embedding <=> :emb::vector)) > 0.35
            ORDER BY embedding <=> :emb::vector
            LIMIT :k
        """),
        {"tid": tenant_id, "emb": emb_str, "k": top_k},
    ).fetchall()

    if not rows:
        return {"context": "", "found": 0}

    context_parts = [row.contenido for row in rows]
    context = "\n\n---\n\n".join(context_parts)

    return {
        "context": context,
        "found": len(rows),
        "similarities": [round(float(row.similarity), 3) for row in rows],
    }
