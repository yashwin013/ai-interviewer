from fastapi import APIRouter, UploadFile, File, HTTPException
from bson import ObjectId
from app.db.mongo_clients import db
from app.services.ai_agent_client import post_to_agent
from app.constants.endpoints import AI_PARSE_RESUME
import uuid
import os

router = APIRouter(tags=["Resume"])


@router.post("/{userId}/upload-resume")
async def upload_resume(userId: str, resume: UploadFile = File(...)):
    """
    1. Receive uploaded file for a given userId
    2. Save it under /uploads/resumes/
    3. Send file path to AI Agent for parsing (or mock result if agent offline)
    4. Save parsed resume into the user document
    """

    # Validate userId format
    try:
        obj_id = ObjectId(userId)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID format")

    # Check user exists
    user = await db.users.find_one({"_id": obj_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Ensure save directory exists
    os.makedirs("uploads/resumes", exist_ok=True)

    # Create unique filename
    ext = resume.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    save_path = f"uploads/resumes/{filename}"

    # Save file to local folder
    with open(save_path, "wb") as f:
        f.write(await resume.read())

    # Build payload for AI Agent
    payload = {
        "userId": userId,
        "resumePath": save_path
    }

    # Try contacting AI Agent
    try:
        agent_response = await post_to_agent(AI_PARSE_RESUME, payload)
        parsed_resume = agent_response.get("resumeProfile")
    except Exception:
        # FALLBACK TEMPORARY PARSER — remove once AI Agent is ready
        parsed_resume = {
            "name": user.get("name", "Unknown"),
            "skills": ["Python", "FastAPI", "MongoDB"],
            "experience": "Demo experience (AI Agent unavailable)",
            "education": "Demo education"
        }

    # Update user's resumeProfile
    await db.users.update_one(
        {"_id": obj_id},
        {"$set": {"resumeProfile": parsed_resume}}
    )

    return {
        "message": "Resume uploaded & parsed successfully.",
        "resumeProfile": parsed_resume
    }
