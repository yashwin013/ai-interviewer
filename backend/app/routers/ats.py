"""
ATS (Applicant Tracking System) Resume Rating Router
Provides endpoints for rule-based resume scoring
"""

from fastapi import APIRouter, HTTPException
from bson import ObjectId
from typing import Optional
from pydantic import BaseModel

from app.db.mongo_clients import db
from app.utils.ats_scorer import calculate_ats_score


router = APIRouter(tags=["ATS"])


class ATSScoreResponse(BaseModel):
    total_score: int
    max_score: int
    percentage: int
    rating: str
    breakdown: dict
    tips: list
    summary: str


@router.get("/score/{userId}", response_model=ATSScoreResponse)
async def get_ats_score(userId: str):
    """
    Get ATS score for user's resume.
    Uses rule-based scoring - NO AI tokens consumed.
    """
    # Validate userId
    try:
        user_obj_id = ObjectId(userId)
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    
    # Get user from database
    user = await db.users.find_one({"_id": user_obj_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get resume profile
    resume_profile = user.get("resumeProfile", {})
    
    # Check if resume text exists (stored in resumeProfile.extracted_text)
    resume_text = resume_profile.get("extracted_text", "")
    if not resume_text:
        raise HTTPException(
            status_code=400, 
            detail="No resume found. Please upload a resume first."
        )
    
    # Calculate ATS score using rule-based engine
    score_result = calculate_ats_score(resume_text, resume_profile)
    
    return score_result



@router.get("/quick-score/{userId}")
async def get_quick_score(userId: str):
    """
    Get a quick ATS score summary (just percentage and rating).
    Useful for dashboard display.
    """
    try:
        user_obj_id = ObjectId(userId)
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    
    user = await db.users.find_one({"_id": user_obj_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    resume_text = user.get("resumeText", "")
    if not resume_text:
        return {
            "hasResume": False,
            "percentage": 0,
            "rating": "No Resume"
        }
    
    resume_profile = user.get("resumeProfile", {})
    score_result = calculate_ats_score(resume_text, resume_profile)
    
    return {
        "hasResume": True,
        "percentage": score_result["percentage"],
        "rating": score_result["rating"]
    }


@router.get("/ai-tips/{userId}")
async def get_ai_tips(userId: str):
    """
    Get AI-powered personalized resume improvement tips.
    Uses approximately 250 tokens for minimal cost.
    This is OPTIONAL - only called when user clicks "Get AI Tips".
    """
    import httpx
    import os
    
    try:
        user_obj_id = ObjectId(userId)
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    
    user = await db.users.find_one({"_id": user_obj_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    resume_text = user.get("resumeText", "")
    if not resume_text:
        raise HTTPException(status_code=400, detail="No resume found")
    
    resume_profile = user.get("resumeProfile", {})
    
    # Get rule-based score first
    score_result = calculate_ats_score(resume_text, resume_profile)
    
    # Prepare minimal context for AI (to reduce tokens)
    skills = resume_profile.get("skills", [])[:5]  # Only top 5 skills
    seniority = resume_profile.get("seniority_level", "Unknown")
    score = score_result["percentage"]
    weak_areas = [k for k, v in score_result["breakdown"].items() 
                  if v["score"] / v["max"] < 0.6]
    
    # Call AI agent for personalized tips (minimal prompt ~100 tokens input)
    ai_agent_url = os.getenv("AI_AGENT_URL", "http://localhost:8001")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{ai_agent_url}/generate-resume-tips",
                json={
                    "score": score,
                    "seniority": seniority,
                    "skills": skills,
                    "weak_areas": weak_areas,
                    "resume_excerpt": resume_text[:500]  # Only first 500 chars
                }
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                # Fallback to rule-based tips if AI fails
                return {
                    "ai_tips": score_result["tips"],
                    "source": "rule-based",
                    "message": "AI unavailable, showing rule-based tips"
                }
    except Exception as e:
        # Fallback to rule-based tips
        return {
            "ai_tips": score_result["tips"],
            "source": "rule-based",
            "message": f"AI unavailable: {str(e)}"
        }
