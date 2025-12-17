from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel
from bson import ObjectId

from app.db.mongo_clients import db

router = APIRouter(tags=["Jobs"])


# Response schemas
class JobResponse(BaseModel):
    jobId: str
    title: str
    company: str
    location: Optional[str] = None
    experience_level: Optional[str] = None
    job_type: Optional[str] = None
    skills: List[str] = []
    is_active: bool = True
    
    class Config:
        json_schema_extra = {
            "example": {
                "jobId": "507f1f77bcf86cd799439011",
                "title": "Senior Software Engineer",
                "company": "Google",
                "location": "Mountain View, CA",
                "experience_level": "Senior",
                "job_type": "Full-time",
                "skills": ["Python", "React", "AWS"],
                "is_active": True
            }
        }


class JobsListResponse(BaseModel):
    jobs: List[JobResponse]
    total: int
    page: int
    limit: int
    totalPages: int


@router.get("/", response_model=JobsListResponse)
async def get_all_jobs(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    location: Optional[str] = Query(None, description="Filter by location"),
    experience_level: Optional[str] = Query(None, description="Filter by experience level"),
    skills: Optional[str] = Query(None, description="Filter by skills (comma-separated)")
):
    """
    Get all jobs with pagination and optional filters.
    
    Query Parameters:
    - page: Page number (default: 1)
    - limit: Items per page (default: 20, max: 100)
    - location: Filter by location (case-insensitive partial match)
    - experience_level: Filter by experience level
    - skills: Filter by skills (comma-separated, e.g., "Python,React")
    """
    
    # Build query - TEMPORARILY REMOVED is_active FILTER FOR DEBUGGING
    query = {}
    
    if location:
        query["location"] = {"$regex": location, "$options": "i"}
    
    if experience_level:
        query["experience_level"] = {"$regex": experience_level, "$options": "i"}
    
    if skills:
        skill_list = [s.strip() for s in skills.split(",")]
        query["skills"] = {"$in": skill_list}
    
    # Get total count
    total = await db.jobs.count_documents(query)
    
    # Calculate pagination
    skip = (page - 1) * limit
    total_pages = (total + limit - 1) // limit
    
    # Get jobs
    jobs_cursor = db.jobs.find(query).skip(skip).limit(limit)
    jobs = await jobs_cursor.to_list(length=limit)
    
    # Format response
    formatted_jobs = []
    for job in jobs:
        formatted_jobs.append({
            "jobId": str(job["_id"]),
            "title": job.get("title", ""),
            "company": job.get("company", ""),
            "location": job.get("location"),
            "experience_level": job.get("experience_level"),
            "job_type": job.get("job_type"),
            "skills": job.get("skills", []),
            "is_active": job.get("is_active", True)
        })
    
    return {
        "jobs": formatted_jobs,
        "total": total,
        "page": page,
        "limit": limit,
        "totalPages": total_pages
    }


@router.get("/{jobId}", response_model=JobResponse)
async def get_job_by_id(jobId: str):
    """
    Get a specific job by ID.
    """
    try:
        job_obj_id = ObjectId(jobId)
    except:
        raise HTTPException(status_code=400, detail="Invalid job ID format")
    
    job = await db.jobs.find_one({"_id": job_obj_id})
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return {
        "jobId": str(job["_id"]),
        "title": job.get("title", ""),
        "company": job.get("company", ""),
        "location": job.get("location"),
        "experience_level": job.get("experience_level"),
        "job_type": job.get("job_type"),
        "skills": job.get("skills", []),
        "is_active": job.get("is_active", True)
    }


@router.get("/search/query", response_model=JobsListResponse)
async def search_jobs(
    q: str = Query(..., description="Search query"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    """
    Search jobs by keyword (searches in title and company).
    """
    
    # Text search query
    query = {
        "$text": {"$search": q},
        "is_active": True
    }
    
    # Get total count
    total = await db.jobs.count_documents(query)
    
    # Calculate pagination
    skip = (page - 1) * limit
    total_pages = (total + limit - 1) // limit
    
    # Get jobs with text search score
    jobs_cursor = db.jobs.find(
        query,
        {"score": {"$meta": "textScore"}}
    ).sort([("score", {"$meta": "textScore"})]).skip(skip).limit(limit)
    
    jobs = await jobs_cursor.to_list(length=limit)
    
    # Format response
    formatted_jobs = []
    for job in jobs:
        formatted_jobs.append({
            "jobId": str(job["_id"]),
            "title": job.get("title", ""),
            "company": job.get("company", ""),
            "location": job.get("location"),
            "experience_level": job.get("experience_level"),
            "job_type": job.get("job_type"),
            "skills": job.get("skills", []),
            "is_active": job.get("is_active", True)
        })
    
    return {
        "jobs": formatted_jobs,
        "total": total,
        "page": page,
        "limit": limit,
        "totalPages": total_pages
    }
