import httpx
from app.config import settings

async def post_to_agent(endpoint: str, payload: dict):
    url = f"{settings.AI_AGENT_URL}/{endpoint}"
    
    print(f"[DEBUG] Calling AI Agent: {url}")
    print(f"[DEBUG] Payload: {payload}")
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(url, json=payload)
        
        print(f"[DEBUG] Response status: {response.status_code}")
        print(f"[DEBUG] Response body: {response.text}")
        
        response.raise_for_status()
        return response.json()
