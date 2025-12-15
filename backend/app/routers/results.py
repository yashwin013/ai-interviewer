from fastapi import APIRouter, HTTPException
from bson import ObjectId
from typing import List, Optional
from pydantic import BaseModel

from app.db.mongo_clients import db

router = APIRouter(tags=["Results"])


# Response schemas
class AssessmentData(BaseModel):
    candidate_score_percent: Optional[int] = None
    summary: Optional[str] = None
    strengths: Optional[List[str]] = None
    weaknesses: Optional[List[str]] = None
    recommendations: Optional[List[str]] = None


class ResultResponse(BaseModel):
    resultId: str
    userId: str
    sessionId: str
    candidateName: Optional[str] = None
    candidateEmail: Optional[str] = None
    assessment: Optional[AssessmentData] = None
    createdAt: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "resultId": "507f1f77bcf86cd799439011",
                "userId": "507f1f77bcf86cd799439012",
                "sessionId": "507f1f77bcf86cd799439013",
                "candidateName": "John Doe",
                "candidateEmail": "john.doe@example.com",
                "assessment": {
                    "candidate_score_percent": 85,
                    "summary": "Strong technical skills with good communication",
                    "strengths": ["Problem solving", "Technical knowledge"],
                    "weaknesses": ["Could improve on system design"],
                    "recommendations": ["Practice more system design questions"]
                },
                "createdAt": "2024-01-15T10:30:00Z"
            }
        }


@router.get("/user/{userId}", response_model=List[ResultResponse])
async def get_user_results(userId: str):
    """
    Get all interview results for a specific user.
    Returns a list of all completed interview assessments.
    """
    # Validate userId
    try:
        user_obj_id = ObjectId(userId)
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    
    # Check if user exists
    user = await db.users.find_one({"_id": user_obj_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get all results for this user
    results = await db.results.find({"userId": userId}).sort("createdAt", -1).to_list(length=None)
    
    # Format response
    formatted_results = []
    for result in results:
        formatted_results.append({
            "resultId": str(result["_id"]),
            "userId": result.get("userId"),
            "sessionId": result.get("sessionId"),
            "candidateName": result.get("candidateName"),
            "candidateEmail": result.get("candidateEmail"),
            "assessment": result.get("assessment"),
            "createdAt": result.get("createdAt").isoformat() if result.get("createdAt") else None
        })
    
    return formatted_results


@router.get("/session/{sessionId}", response_model=ResultResponse)
async def get_session_result(sessionId: str):
    """
    Get interview result for a specific session.
    Returns the assessment data for a completed interview session.
    """
    # Find result by sessionId
    result = await db.results.find_one({"sessionId": sessionId})
    
    if not result:
        raise HTTPException(
            status_code=404, 
            detail="No results found for this session. The interview may not be completed yet."
        )
    
    # Format response
    return {
        "resultId": str(result["_id"]),
        "userId": result.get("userId"),
        "sessionId": result.get("sessionId"),
        "candidateName": result.get("candidateName"),
        "candidateEmail": result.get("candidateEmail"),
        "assessment": result.get("assessment"),
        "createdAt": result.get("createdAt").isoformat() if result.get("createdAt") else None
    }


@router.get("/latest/{userId}", response_model=ResultResponse)
async def get_latest_result(userId: str):
    """
    Get the most recent interview result for a user.
    Returns the latest completed interview assessment.
    """
    # Validate userId
    try:
        user_obj_id = ObjectId(userId)
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    
    # Check if user exists
    user = await db.users.find_one({"_id": user_obj_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get latest result
    results = await db.results.find({"userId": userId}).sort("createdAt", -1).limit(1).to_list(length=1)
    
    if not results:
        raise HTTPException(
            status_code=404, 
            detail="No results found for this user. Complete an interview first."
        )
    
    result = results[0]
    
    # Format response
    return {
        "resultId": str(result["_id"]),
        "userId": result.get("userId"),
        "sessionId": result.get("sessionId"),
        "candidateName": result.get("candidateName"),
        "candidateEmail": result.get("candidateEmail"),
        "assessment": result.get("assessment"),
        "createdAt": result.get("createdAt").isoformat() if result.get("createdAt") else None
    }
