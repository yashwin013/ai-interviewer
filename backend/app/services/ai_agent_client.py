import httpx
from app.config import settings


async def call_ai_agent(endpoint: str, payload: dict):
    """
    Generic function to call AI Agent.
    Sends JSON data (resumeText, chunks, answers, etc.)
    """

    url = f"{settings.AI_AGENT_URL}/{endpoint}"

    print("\n=========================")
    print(f"[AI REQUEST] POST → {url}")
    print(f"[PAYLOAD] {payload}")
    print("=========================\n")

    async with httpx.AsyncClient(timeout=90.0) as client:
        try:
            response = await client.post(url, json=payload)

            print(f"[AI RESPONSE STATUS] {response.status_code}")
            print(f"[AI RESPONSE BODY] {response.text}")

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
