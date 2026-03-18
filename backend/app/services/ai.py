"""
AI utilities: intent classification and lead scoring.
Uses Groq API (llama-3.1-8b-instant) when an API key is available,
otherwise falls back to fast keyword heuristics — never raises.
"""
import re
import httpx


# ── Intent classification ─────────────────────────────────────────────────────

INTENT_PROMPT = """Classify the following customer message into exactly ONE of these intents:
- pricing_inquiry   (asking about price, cost, quotes)
- purchase_intent   (ready to buy, wants to place order)
- demo_request      (wants demo, meeting, call)
- info_request      (wants information, details, specs)
- support_request   (has a problem, complaint, technical issue)
- general_query     (greetings, anything else)

Reply with ONLY the intent label, nothing else.

Message: {message}"""


def _heuristic_intent(content: str) -> str:
    c = content.lower()
    if any(w in c for w in ["precio", "costo", "cuánto", "cuanto", "valor", "cotiz", "quote", "$", "uf "]):
        return "pricing_inquiry"
    if any(w in c for w in ["comprar", "compro", "quiero el", "listo", "pedido", "order"]):
        return "purchase_intent"
    if any(w in c for w in ["demo", "probar", "agendar", "reunión", "reunion", "llamada", "visita"]):
        return "demo_request"
    if any(w in c for w in ["problema", "error", "falla", "ayuda", "soporte", "support"]):
        return "support_request"
    if any(w in c for w in ["info", "informaci", "detalle", "saber", "cómo", "como funciona"]):
        return "info_request"
    return "general_query"


def analyze_message_intent(content: str, api_key: str | None = None) -> str:
    """Synchronous wrapper — returns intent string, never raises."""
    if not content or not content.strip():
        return "general_query"
    # Fast path: heuristics (avoids an async call in sync context)
    return _heuristic_intent(content)


async def analyze_message_intent_async(content: str, api_key: str | None = None) -> str:
    """Async version that calls LLM when key is available."""
    if not content or not content.strip():
        return "general_query"
    if not api_key:
        return _heuristic_intent(content)
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={
                    "model": "llama-3.1-8b-instant",
                    "messages": [{"role": "user", "content": INTENT_PROMPT.format(message=content[:500])}],
                    "max_tokens": 20,
                    "temperature": 0,
                },
            )
            label = resp.json()["choices"][0]["message"]["content"].strip().lower()
            valid = {"pricing_inquiry", "purchase_intent", "demo_request", "info_request", "support_request", "general_query"}
            return label if label in valid else _heuristic_intent(content)
    except Exception:
        return _heuristic_intent(content)


# ── Lead scoring ──────────────────────────────────────────────────────────────

def calculate_lead_score(content: str, source: str) -> int:
    """Score 0-100 based on channel + message signals."""
    score = 0
    c = content.lower()

    source_weights = {
        "whatsapp": 25,
        "web":      15,
        "instagram": 12,
        "facebook":  10,
        "tiktok":     8,
        "email":     10,
    }
    score += source_weights.get(source, 5)

    # High-value signals
    if any(w in c for w in ["comprar", "compro", "pedido", "quiero el", "listo para comprar"]):
        score += 45
    elif any(w in c for w in ["precio", "costo", "cuánto", "cotiz", "presupuesto"]):
        score += 25
    elif any(w in c for w in ["demo", "reunión", "agendar", "visita"]):
        score += 20
    elif any(w in c for w in ["info", "informaci", "detalle"]):
        score += 10

    # Message length signal (longer = more engaged)
    if len(content) > 100:
        score += 10
    elif len(content) > 40:
        score += 5

    return min(score, 100)
