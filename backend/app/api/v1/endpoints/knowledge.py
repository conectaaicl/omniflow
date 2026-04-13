"""
Knowledge Base API — IA & Conocimiento por tenant

POST /knowledge/text      → guardar texto → embedding → insertar
POST /knowledge/upload    → procesar PDF → chunking → embeddings
POST /knowledge/url       → scraping → chunking → embeddings
GET  /knowledge           → listar documentos del tenant
DELETE /knowledge/{id}    → eliminar
GET  /knowledge/search    → búsqueda semántica (internal use + frontend preview)
"""
import io
from typing import Literal

import httpx
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.services.embeddings import get_embedding, get_embedding_sync

router = APIRouter()

MAX_CHUNK_CHARS = 800
CHUNK_OVERLAP = 100


# ── Chunking ──────────────────────────────────────────────────────────────────

def _chunk_text(text_str: str, max_chars: int = MAX_CHUNK_CHARS) -> list[str]:
    """Split text into overlapping chunks by paragraph boundaries."""
    paragraphs = [p.strip() for p in text_str.split("\n\n") if p.strip()]
    chunks, current = [], ""
    for para in paragraphs:
        if len(current) + len(para) < max_chars:
            current += ("\n\n" if current else "") + para
        else:
            if current:
                chunks.append(current)
            # start new chunk with overlap from end of previous
            current = current[-CHUNK_OVERLAP:] + "\n\n" + para if current else para
    if current:
        chunks.append(current)
    return chunks or [text_str[:max_chars]]


# ── DB helpers ────────────────────────────────────────────────────────────────

def _insert_chunk(db: Session, tenant_id: int, tipo: str, titulo: str,
                  contenido: str, embedding: list[float], fuente_url: str | None = None):
    db.execute(
        text("""
            INSERT INTO knowledge_base (tenant_id, tipo, titulo, contenido, embedding, fuente_url)
            VALUES (:tid, :tipo, :titulo, :contenido, CAST(:emb AS vector), :url)
        """),
        {
            "tid": tenant_id,
            "tipo": tipo,
            "titulo": titulo,
            "contenido": contenido,
            "emb": f"[{','.join(str(x) for x in embedding)}]",
            "url": fuente_url,
        },
    )


def _list_docs(db: Session, tenant_id: int) -> list[dict]:
    rows = db.execute(
        text("""
            SELECT id, tipo, titulo, fuente_url,
                   LEFT(contenido, 120) AS preview,
                   created_at
            FROM knowledge_base
            WHERE tenant_id = :tid
            ORDER BY created_at DESC
        """),
        {"tid": tenant_id},
    ).fetchall()
    return [dict(r._mapping) for r in rows]


def _semantic_search(db: Session, tenant_id: int, query: str, top_k: int = 3) -> list[dict]:
    emb = get_embedding_sync(query)
    emb_str = f"[{','.join(str(x) for x in emb)}]"
    rows = db.execute(
        text("""
            SELECT id, tipo, titulo, contenido, fuente_url,
                   1 - (embedding <=> CAST(:emb AS vector)) AS similarity
            FROM knowledge_base
            WHERE tenant_id = :tid AND embedding IS NOT NULL
            ORDER BY embedding <=> CAST(:emb AS vector)
            LIMIT :k
        """),
        {"tid": tenant_id, "emb": emb_str, "k": top_k},
    ).fetchall()
    return [dict(r._mapping) for r in rows]


# ── Endpoints ─────────────────────────────────────────────────────────────────

class TextInput(BaseModel):
    titulo: str
    contenido: str


@router.post("/text")
async def add_text(
    body: TextInput,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save freeform text (FAQs, products, prices, hours) as knowledge."""
    chunks = _chunk_text(body.contenido)
    saved = 0
    for i, chunk in enumerate(chunks):
        emb = await get_embedding(chunk)
        titulo = body.titulo if len(chunks) == 1 else f"{body.titulo} ({i+1}/{len(chunks)})"
        _insert_chunk(db, current_user.tenant_id, "texto", titulo, chunk, emb)
        saved += 1
    db.commit()
    return {"saved_chunks": saved, "titulo": body.titulo}


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    titulo: str = Form(...),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Process and index a PDF document."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Solo se aceptan archivos PDF")

    try:
        import pypdf
        content = await file.read()
        reader = pypdf.PdfReader(io.BytesIO(content))
        pages_text = "\n\n".join(
            page.extract_text() or "" for page in reader.pages
        )
    except ImportError:
        raise HTTPException(status_code=503, detail="pypdf no instalado en el servidor")
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Error procesando PDF: {e}")

    if not pages_text.strip():
        raise HTTPException(status_code=422, detail="No se pudo extraer texto del PDF")

    chunks = _chunk_text(pages_text)
    saved = 0
    for i, chunk in enumerate(chunks):
        emb = await get_embedding(chunk)
        chunk_titulo = titulo if len(chunks) == 1 else f"{titulo} (p.{i+1})"
        _insert_chunk(db, current_user.tenant_id, "pdf", chunk_titulo, chunk, emb,
                      fuente_url=file.filename)
        saved += 1
    db.commit()
    return {"saved_chunks": saved, "pages": len(reader.pages), "titulo": titulo}


@router.post("/url")
async def scrape_url(
    url: str,
    titulo: str | None = None,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Scrape a URL and index its text content."""
    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=True,
                                     headers={"User-Agent": "OmniFlow-Bot/1.0"}) as client:
            resp = await client.get(url)
            resp.raise_for_status()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"No se pudo acceder a la URL: {e}")

    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(resp.text, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
            tag.decompose()
        raw_text = soup.get_text(separator="\n", strip=True)
        page_title = soup.title.string if soup.title else url
    except ImportError:
        raise HTTPException(status_code=503, detail="beautifulsoup4 no instalado")

    if not raw_text.strip():
        raise HTTPException(status_code=422, detail="No se pudo extraer texto de la URL")

    titulo = titulo or page_title or url
    chunks = _chunk_text(raw_text)

    saved = 0
    for i, chunk in enumerate(chunks[:20]):  # max 20 chunks per URL
        emb = await get_embedding(chunk)
        chunk_titulo = titulo if len(chunks) == 1 else f"{titulo} ({i+1})"
        _insert_chunk(db, current_user.tenant_id, "url", chunk_titulo, chunk, emb,
                      fuente_url=url)
        saved += 1
    db.commit()
    return {"saved_chunks": saved, "titulo": titulo, "url": url}


@router.get("")
async def list_knowledge(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all knowledge documents for the tenant."""
    return _list_docs(db, current_user.tenant_id)


@router.delete("/{item_id}")
async def delete_knowledge(
    item_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a knowledge entry (tenant-scoped)."""
    result = db.execute(
        text("DELETE FROM knowledge_base WHERE id = :id AND tenant_id = :tid RETURNING id"),
        {"id": item_id, "tid": current_user.tenant_id},
    )
    if not result.rowcount:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    db.commit()
    return {"deleted": item_id}


@router.get("/search")
async def search_knowledge(
    q: str = Query(..., min_length=2),
    top_k: int = Query(3, le=10),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Semantic search over the tenant's knowledge base (preview/debug)."""
    results = _semantic_search(db, current_user.tenant_id, q, top_k=top_k)
    return {"query": q, "results": results}
