"""
Job Embeddings Service
Manages pre-computed embeddings for jobs to speed up matching.
"""
import os
import asyncio
from typing import List, Optional
from langchain_openai import OpenAIEmbeddings
from app.db.mongo_clients import db


class JobEmbeddingService:
    """Service for managing job embeddings stored in MongoDB."""
    
    def __init__(self):
        self.embeddings = None
        self._init_embeddings()
    
    def _init_embeddings(self):
        """Initialize OpenAI embeddings if API key is available."""
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key:
            self.embeddings = OpenAIEmbeddings(
                model="text-embedding-3-small",
                openai_api_key=api_key
            )
    
    def build_job_text(self, job: dict) -> str:
        """Build searchable text from job for embedding."""
        title = job.get("title", "")
        description = job.get("description", "")
        skills = ", ".join(job.get("skills", []))
        return f"{title}\n{description}\nSkills: {skills}"
    
    async def compute_single_embedding(self, text: str) -> Optional[List[float]]:
        """Compute embedding for a single text."""
        if not self.embeddings:
            return None
        try:
            # Run in executor since embed_documents is synchronous
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None, 
                lambda: self.embeddings.embed_documents([text])
            )
            return result[0] if result else None
        except Exception as e:
            print(f"Error computing embedding: {e}")
            return None
    
    async def compute_job_embedding(self, job: dict) -> Optional[List[float]]:
        """Compute and store embedding for a single job."""
        job_text = self.build_job_text(job)
        embedding = await self.compute_single_embedding(job_text)
        
        if embedding:
            # Store embedding in database
            await db.jobs.update_one(
                {"_id": job["_id"]},
                {"$set": {"embedding": embedding}}
            )
        
        return embedding
    
    async def compute_all_embeddings(self, batch_size: int = 10) -> dict:
        """
        Compute embeddings for all jobs that don't have them.
        Processes in batches to avoid rate limiting.
        """
        if not self.embeddings:
            return {"error": "OpenAI API key not configured"}
        
        # Find jobs without embeddings
        jobs_cursor = db.jobs.find({"embedding": {"$exists": False}})
        jobs = await jobs_cursor.to_list(length=None)
        
        if not jobs:
            return {"message": "All jobs already have embeddings", "processed": 0}
        
        processed = 0
        failed = 0
        
        # Process in batches
        for i in range(0, len(jobs), batch_size):
            batch = jobs[i:i + batch_size]
            tasks = [self.compute_job_embedding(job) for job in batch]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for result in results:
                if isinstance(result, Exception) or result is None:
                    failed += 1
                else:
                    processed += 1
            
            # Small delay between batches to avoid rate limiting
            if i + batch_size < len(jobs):
                await asyncio.sleep(0.5)
        
        return {
            "message": "Embedding computation complete",
            "processed": processed,
            "failed": failed,
            "total": len(jobs)
        }
    
    async def get_resume_embedding(self, profile: dict) -> Optional[List[float]]:
        """Compute embedding for a resume profile."""
        skills = ", ".join(profile.get("skills", []))
        experience = profile.get("experience", "")
        resume_text = f"Skills: {skills}\nExperience: {experience}"
        return await self.compute_single_embedding(resume_text)


# Singleton instance
job_embedding_service = JobEmbeddingService()
