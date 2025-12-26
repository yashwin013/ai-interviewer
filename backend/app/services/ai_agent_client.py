"""
AI Agent HTTP Client with Connection Pooling.
Uses a persistent httpx client for better performance.
"""

import httpx
from app.config import settings
from typing import Optional

# ===== PERSISTENT HTTP CLIENT (Connection Pooling) =====
# Creates connection pool once, reuses for all requests
# This saves ~100-200ms per request

_http_client: Optional[httpx.AsyncClient] = None


async def get_http_client() -> httpx.AsyncClient:
    """Get or create the persistent HTTP client."""
    global _http_client
    if _http_client is None:
        _http_client = httpx.AsyncClient(
            timeout=60.0,
            # http2=True requires `pip install httpx[http2]` - using HTTP/1.1 for now
            limits=httpx.Limits(
                max_keepalive_connections=5,
                max_connections=10
            )
        )
    return _http_client


async def close_http_client():
    """Close the HTTP client (call on shutdown)."""
    global _http_client
    if _http_client:
        await _http_client.aclose()
        _http_client = None


async def call_ai_agent(endpoint: str, payload: dict):
    """
    Call AI Agent with connection pooling.
    Uses persistent HTTP client for better performance.
    """
    url = f"{settings.AI_AGENT_URL}/{endpoint}"

    print("\n=========================")
    print(f"[AI REQUEST] POST → {url}")
    # Only log payload keys to reduce noise
    print(f"[PAYLOAD KEYS] {list(payload.keys())}")
    print("=========================\n")

    client = await get_http_client()
    
    try:
        response = await client.post(url, json=payload)

        print(f"[AI RESPONSE STATUS] {response.status_code}")
        
        response.raise_for_status()
        return response.json()

    except httpx.ConnectError:
        raise Exception(
            f"Cannot connect to AI Agent at {url}. "
            f"Make sure it's running."
        )

    except httpx.HTTPStatusError as e:
        raise Exception(
            f"AI Agent returned error {e.response.status_code}: {e.response.text}"
        )

    except Exception as e:
        raise Exception(f"Unexpected error calling AI Agent: {str(e)}")


# Shortcut wrappers (cleaner imports in other files)

async def send_resume_for_processing(payload: dict):
    """Send extracted resume text to AI agent for understanding."""
    return await call_ai_agent("parse-resume", payload)


async def ask_first_question(payload: dict):
    """Send resume info to get first interview question."""
    return await call_ai_agent("init-interview", payload)


async def ask_next_question(payload: dict):
    """Send previous answer + resume text to get next question."""
    return await call_ai_agent("next-question", payload)


async def generate_assessment(payload: dict):
    """Generate interview assessment after all questions answered."""
    return await call_ai_agent("generate-assessment", payload)


# ===== NEW: Trigger pre-generation in background =====
async def trigger_pregeneration(payload: dict):
    """Trigger pre-generation of next question (fire-and-forget style)."""
    return await call_ai_agent("pregenerate-question", payload)
