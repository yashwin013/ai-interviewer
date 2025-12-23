"""
Job Seeding Script - Complete with Detailed Descriptions
Deletes all existing jobs and inserts 40 new software-related jobs
All jobs include comprehensive descriptions with responsibilities, requirements, and benefits
"""
import asyncio
import sys
import os
from datetime import datetime, timedelta
import random

# Add parent directory to path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

# Import job data from separate file to keep this clean
from scripts.job_descriptions import entry_jobs, mid_jobs, senior_jobs

async def seed_jobs():
    """Delete old jobs and insert 40 new software jobs with detailed descriptions"""
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGO_URI)
    db = client[settings.DB_NAME]
    
    print("🗑️  Deleting all existing jobs...")
    result = await db.jobs.delete_many({})
    print(f"✅ Deleted {result.deleted_count} old jobs")
    
    # Generate jobs
    jobs = []
    
    locations = [
        "San Francisco, CA (Remote)",
        "New York, NY (Hybrid)",
        "Seattle, WA (Remote)",
        "Austin, TX (On-site)",
        "Boston, MA (Hybrid)",
        "Remote (US)",
        "Los Angeles, CA (Remote)",
        "Chicago, IL (Hybrid)",
        "Denver, CO (Remote)",
        "Remote (Global)",
    ]
    
    job_types = ["Full-time", "Full-time", "Full-time", "Contract", "Part-time"]
    
    job_id = 1
    
    # Add entry level jobs
    for job_template in entry_jobs:
        jobs.append({
            "jobId": f"JOB{job_id:03d}",
            "title": job_template["title"],
            "company": job_template["company"],
            "location": random.choice(locations),
            "job_type": random.choice(job_types),
            "experience_level": "Entry",
            "skills": job_template["skills"],
            "description": job_template["description"],
            "salary_range": job_template["salary"],
            "posted_date": (datetime.now() - timedelta(days=random.randint(1, 30))).strftime("%Y-%m-%d"),
            "application_url": f"https://careers.example.com/apply/{job_id}"
        })
        job_id += 1
    
    # Add mid level jobs
    for job_template in mid_jobs:
        jobs.append({
            "jobId": f"JOB{job_id:03d}",
            "title": job_template["title"],
            "company": job_template["company"],
            "location": random.choice(locations),
            "job_type": random.choice(job_types),
            "experience_level": "Mid",
            "skills": job_template["skills"],
            "description": job_template["description"],
            "salary_range": job_template["salary"],
            "posted_date": (datetime.now() - timedelta(days=random.randint(1, 30))).strftime("%Y-%m-%d"),
            "application_url": f"https://careers.example.com/apply/{job_id}"
        })
        job_id += 1
    
    # Add senior level jobs
    for job_template in senior_jobs:
        jobs.append({
            "jobId": f"JOB{job_id:03d}",
            "title": job_template["title"],
            "company": job_template["company"],
            "location": random.choice(locations),
            "job_type": random.choice(job_types),
            "experience_level": "Senior",
            "skills": job_template["skills"],
            "description": job_template["description"],
            "salary_range": job_template["salary"],
            "posted_date": (datetime.now() - timedelta(days=random.randint(1, 30))).strftime("%Y-%m-%d"),
            "application_url": f"https://careers.example.com/apply/{job_id}"
        })
        job_id += 1
    
    # Insert all jobs
    print(f"\n📝 Inserting {len(jobs)} new software jobs with detailed descriptions...")
    result = await db.jobs.insert_many(jobs)
    print(f"✅ Successfully inserted {len(result.inserted_ids)} jobs!")
    
    # Print summary
    print("\n📊 Job Summary:")
    print(f"   Entry Level: {len(entry_jobs)} jobs")
    print(f"   Mid Level: {len(mid_jobs)} jobs")
    print(f"   Senior Level: {len(senior_jobs)} jobs")
    print(f"   Total: {len(jobs)} jobs")
    print("\n✅ All jobs include detailed descriptions!")
    
    client.close()
    print("\n✨ Job seeding completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed_jobs())
