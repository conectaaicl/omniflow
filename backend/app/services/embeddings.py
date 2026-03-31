"""
Embeddings service using sentence-transformers all-MiniLM-L6-v2 (384 dims, free, local).
Model is loaded once at import and cached.
"""
import asyncio
from functools import lru_cache
from typing import Optional

_model = None


def _load_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer("all-MiniLM-L6-v2")
        print("[embeddings] Model loaded: all-MiniLM-L6-v2", flush=True)
    return _model


def get_embedding_sync(text: str) -> list[float]:
    """Synchronous embedding — blocks the thread."""
    model = _load_model()
    return model.encode(text, normalize_embeddings=True).tolist()


async def get_embedding(text: str) -> list[float]:
    """Async-safe embedding using a thread pool."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, get_embedding_sync, text)


async def get_embeddings_batch(texts: list[str]) -> list[list[float]]:
    """Batch embeddings for efficiency."""
    model = _load_model()
    loop = asyncio.get_event_loop()
    embeddings = await loop.run_in_executor(
        None,
        lambda: model.encode(texts, normalize_embeddings=True, batch_size=32).tolist()
    )
    return embeddings
