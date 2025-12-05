import httpx
from app.config import settings

async def post_to_agent(endpoint: str, payload: dict):
    url = f"{settings.AI_AGENT_URL}/{endpoint}"
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(url, json=payload)
        response.raise_for_status()
        return response.json()
