import asyncio
import sys
sys.path.append('.')

from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

async def check_job():
    client = AsyncIOMotorClient(settings.MONGO_URI)
    db = client[settings.DB_NAME]
    
    # Check a mid-level job (should have detailed description)
    job = await db.jobs.find_one({'jobId': 'JOB011'})
    
    if job:
        print(f"Job Title: {job.get('title')}")
        print(f"Has description field: {'description' in job}")
        print(f"Description length: {len(job.get('description', ''))}")
        print(f"\nDescription preview:")
        print(job.get('description', 'NO DESCRIPTION')[:300])
    else:
        print("Job not found!")
    
    client.close()

asyncio.run(check_job())
