from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel
from bson import ObjectId
import os
import hashlib
import numpy as np
from cachetools import TTLCache

from app.db.mongo_clients import db
from app.services.Similarity_Jobs import Job_Matcher
from app.services.job_embeddings import job_embedding_service
from langchain_openai import OpenAIEmbeddings

router = APIRouter(tags=["Jobs"])

# Cache for match results: key = f"{userId}_{resume_hash}", TTL = 1 hour
match_cache = TTLCache(maxsize=100, ttl=3600)


# Response schemas
class JobResponse(BaseModel):
    jobId: str
    title: str
    company: str
    location: Optional[str] = None
    experience_level: Optional[str] = None
    job_type: Optional[str] = None
    skills: List[str] = []
    description: Optional[str] = None
    salary_range: Optional[str] = None
    posted_date: Optional[str] = None
    application_url: Optional[str] = None
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
    
    # Get jobs with consistent sorting
    jobs_cursor = db.jobs.find(query).sort("_id", 1).skip(skip).limit(limit)
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
        "description": job.get("description", ""),
        "salary_range": job.get("salary_range"),
        "posted_date": job.get("posted_date"),
        "application_url": job.get("application_url"),
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


@router.get("/recommended/{userId}")
async def get_recommended_jobs(userId: str):
    """
    Get personalized job recommendations based on user's resume.
    Matches jobs using skills, seniority level, and experience.
    """
    # Validate userId
    try:
        user_obj_id = ObjectId(userId)
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    
    # Get user's resume profile
    user = await db.users.find_one({"_id": user_obj_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    resume_profile = user.get("resumeProfile")
    if not resume_profile:
        # No resume - return recent jobs
        jobs_cursor = db.jobs.find({}).sort("posted_date", -1).limit(6)
        jobs = await jobs_cursor.to_list(length=6)
        
        return {
            "jobs": [
                {
                    "jobId": str(job["_id"]),
                    "title": job.get("title", ""),
                    "company": job.get("company", ""),
                    "location": job.get("location"),
                    "experience_level": job.get("experience_level"),
                    "job_type": job.get("job_type"),
                    "skills": job.get("skills", []),
                    "description": job.get("description", ""),
                    "salary_range": job.get("salary_range"),
                    "posted_date": job.get("posted_date"),
                    "match_score": 0
                }
                for job in jobs
            ],
            "message": "Upload resume for personalized recommendations"
        }
    
    # Extract user skills and seniority
    user_skills = set([s.lower() for s in resume_profile.get("skills", [])])
    user_seniority = resume_profile.get("seniority_level", "").lower()
    
    # Seniority level mapping
    seniority_map = {
        "entry": ["entry", "junior", "graduate", "trainee", "intern", "associate"],
        "mid": ["mid", "intermediate", "mid-level"],
        "senior": ["senior", "staff", "principal", "lead", "manager", "tech lead", "engineering manager", "distinguished"]
    }
    
    # Determine user's seniority category
    user_category = "mid"  # default
    for category, keywords in seniority_map.items():
        if any(keyword in user_seniority for keyword in keywords):
            user_category = category
            break
    
    # Fetch all active jobs
    jobs_cursor = db.jobs.find({})
    all_jobs = await jobs_cursor.to_list(length=None)
    
    # Score each job
    scored_jobs = []
    for job in all_jobs:
        job_skills = set([s.lower() for s in job.get("skills", [])])
        job_seniority = job.get("experience_level", "").lower()
        
        # Calculate skill match score (0-1)
        if len(job_skills) > 0:
            matching_skills = user_skills.intersection(job_skills)
            skill_score = len(matching_skills) / len(job_skills)
        else:
            skill_score = 0
        
        # Calculate seniority match score (0-1)
        job_category = "mid"  # default
        for category, keywords in seniority_map.items():
            if any(keyword in job_seniority for keyword in keywords):
                job_category = category
                break
        
        if job_category == user_category:
            seniority_score = 1.0
        elif (user_category == "mid" and job_category in ["entry", "senior"]) or \
             (user_category == "entry" and job_category == "mid") or \
             (user_category == "senior" and job_category == "mid"):
            seniority_score = 0.5
        else:
            seniority_score = 0.2
        
        # Calculate final score (weighted)
        final_score = (skill_score * 0.6) + (seniority_score * 0.3) + (0.1)  # 10% base score
        
        scored_jobs.append({
            "job": job,
            "score": final_score,
            "skill_matches": len(user_skills.intersection(job_skills)) if len(job_skills) > 0 else 0
        })
    
    # Sort by score and get top 6
    scored_jobs.sort(key=lambda x: x["score"], reverse=True)
    top_jobs = scored_jobs[:6]
    
    # Format response
    recommendations = []
    for item in top_jobs:
        job = item["job"]
        recommendations.append({
            "jobId": str(job["_id"]),
            "title": job.get("title", ""),
            "company": job.get("company", ""),
            "location": job.get("location"),
            "experience_level": job.get("experience_level"),
            "job_type": job.get("job_type"),
            "skills": job.get("skills", []),
            "description": job.get("description", ""),
            "salary_range": job.get("salary_range"),
            "posted_date": job.get("posted_date"),
            "match_score": round(item["score"] * 100),  # Convert to percentage
            "matching_skills": item["skill_matches"]
        })
    
    return {
        "jobs": recommendations,
        "message": "Personalized recommendations based on your resume"
    }


@router.get("/matched/{userId}")
async def get_matched_jobs(
    userId: str,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page")
):
    """
    Get all jobs with similarity scores based on user's resume.
    Uses pre-computed embeddings + caching for fast response (<1s).
    Returns jobs sorted by match percentage (descending).
    """
    # Validate userId
    try:
        user_obj_id = ObjectId(userId)
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    
    # Get user's resume profile
    user = await db.users.find_one({"_id": user_obj_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    resume_profile = user.get("resumeProfile")
    
    # Fetch all jobs
    jobs_cursor = db.jobs.find({})
    all_jobs = await jobs_cursor.to_list(length=None)
    
    if not resume_profile or not resume_profile.get("skills"):
        # No resume - return jobs without scores
        total = len(all_jobs)
        total_pages = (total + limit - 1) // limit
        skip = (page - 1) * limit
        
        formatted_jobs = []
        for job in all_jobs[skip:skip+limit]:
            formatted_jobs.append({
                "jobId": str(job["_id"]),
                "title": job.get("title", ""),
                "company": job.get("company", ""),
                "location": job.get("location"),
                "experience_level": job.get("experience_level"),
                "job_type": job.get("job_type"),
                "skills": job.get("skills", []),
                "description": job.get("description", ""),
                "match_percentage": None,
                "matched_skills": [],
                "missing_skills": [],
                "has_match_data": False
            })
        
        return {
            "jobs": formatted_jobs,
            "total": total,
            "page": page,
            "limit": limit,
            "totalPages": total_pages,
            "message": "Upload resume for personalized match scores"
        }
    
    # Create cache key based on userId and resume skills hash
    skills_str = ",".join(sorted(resume_profile.get("skills", [])))
    resume_hash = hashlib.md5(skills_str.encode()).hexdigest()[:8]
    cache_key = f"{userId}_{resume_hash}"
    
    # Check cache for existing results
    if cache_key in match_cache:
        cached_results = match_cache[cache_key]
        # Apply pagination to cached results
        total = len(cached_results)
        total_pages = (total + limit - 1) // limit
        skip = (page - 1) * limit
        return {
            "jobs": cached_results[skip:skip+limit],
            "total": total,
            "page": page,
            "limit": limit,
            "totalPages": total_pages,
            "message": "Jobs sorted by match percentage (cached)"
        }
    
    # User skills for matching
    user_skills = set([s.lower() for s in resume_profile.get("skills", [])])
    
    # Check if we can use embedding-based matching
    # Jobs need pre-computed embeddings, otherwise use skill-only matching
    jobs_with_embeddings = [j for j in all_jobs if j.get("embedding")]
    use_embeddings = len(jobs_with_embeddings) > 0 and job_embedding_service.embeddings
    
    scored_jobs = []
    
    if use_embeddings:
        # Get resume embedding (single API call)
        resume_embedding = await job_embedding_service.get_resume_embedding(resume_profile)
        
        if resume_embedding:
            resume_vec = np.array(resume_embedding)
            
            for job in all_jobs:
                job_skills = job.get("skills", [])
                job_skills_lower = set([s.lower() for s in job_skills])
                
                # Skill matching
                matched_skills = list(user_skills & job_skills_lower)
                missing_skills = list(job_skills_lower - user_skills)
                skill_score = (len(matched_skills) / max(len(job_skills_lower), 1)) * 100
                
                # Embedding matching (if job has pre-computed embedding)
                job_embedding = job.get("embedding")
                if job_embedding:
                    job_vec = np.array(job_embedding)
                    # Cosine similarity
                    embedding_score = float(np.dot(resume_vec, job_vec) / 
                                           (np.linalg.norm(resume_vec) * np.linalg.norm(job_vec) + 1e-10)) * 100
                    # Weighted final score: 65% embedding + 35% skill
                    final_score = 0.65 * embedding_score + 0.35 * skill_score
                else:
                    embedding_score = 0
                    final_score = skill_score
                
                scored_jobs.append({
                    "job": job,
                    "final_score": final_score,
                    "embedding_score": embedding_score,
                    "skill_score": skill_score,
                    "matched_skills": matched_skills,
                    "missing_skills": missing_skills
                })
        else:
            use_embeddings = False
    
    if not use_embeddings:
        # Skill-only matching (fastest)
        for job in all_jobs:
            job_skills = job.get("skills", [])
            job_skills_lower = set([s.lower() for s in job_skills])
            
            matched_skills = list(user_skills & job_skills_lower)
            missing_skills = list(job_skills_lower - user_skills)
            skill_score = (len(matched_skills) / max(len(job_skills_lower), 1)) * 100
            
            scored_jobs.append({
                "job": job,
                "final_score": skill_score,
                "embedding_score": 0,
                "skill_score": skill_score,
                "matched_skills": matched_skills,
                "missing_skills": missing_skills
            })
    
    # Sort by final_score (descending)
    scored_jobs.sort(key=lambda x: x["final_score"], reverse=True)
    
    # Format all results for caching
    all_formatted = []
    for item in scored_jobs:
        job = item["job"]
        all_formatted.append({
            "jobId": str(job["_id"]),
            "title": job.get("title", ""),
            "company": job.get("company", ""),
            "location": job.get("location"),
            "experience_level": job.get("experience_level"),
            "job_type": job.get("job_type"),
            "skills": job.get("skills", []),
            "description": job.get("description", ""),
            "match_percentage": round(item["final_score"]),
            "embedding_score": round(item["embedding_score"]),
            "skill_score": round(item["skill_score"]),
            "matched_skills": item["matched_skills"],
            "missing_skills": item["missing_skills"],
            "has_match_data": True
        })
    
    # Cache the results
    match_cache[cache_key] = all_formatted
    
    # Pagination
    total = len(all_formatted)
    total_pages = (total + limit - 1) // limit
    skip = (page - 1) * limit
    
    return {
        "jobs": all_formatted[skip:skip+limit],
        "total": total,
        "page": page,
        "limit": limit,
        "totalPages": total_pages,
        "message": "Jobs sorted by match percentage"
    }


@router.post("/compute-embeddings")
async def compute_job_embeddings():
    """
    Compute and store embeddings for all jobs that don't have them.
    Run this once to enable fast embedding-based matching.
    """
    result = await job_embedding_service.compute_all_embeddings()
    return result
