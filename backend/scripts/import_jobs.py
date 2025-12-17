"""
Job Data Import Script - Configured for your Excel file
Imports job listings from Excel to MongoDB with filtering and optimization
"""

import pandas as pd
from pymongo import MongoClient
from dotenv import load_dotenv
import os
from datetime import datetime

# Load environment variables
load_dotenv()

# MongoDB connection
MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)
db = client["interview_db"]
jobs_collection = db["jobs"]


def extract_skills_from_title(title):
    """Extract likely skills from job title using keyword matching"""
    if pd.isna(title):
        return []
    
    title_lower = str(title).lower()
    skills = []
    
    # Programming languages
    if 'python' in title_lower: skills.append('Python')
    if 'java' in title_lower and 'javascript' not in title_lower: skills.append('Java')
    if 'javascript' in title_lower or ' js ' in title_lower: skills.append('JavaScript')
    if 'react' in title_lower: skills.append('React')
    if 'node' in title_lower: skills.append('Node.js')
    if 'angular' in title_lower: skills.append('Angular')
    if 'vue' in title_lower: skills.append('Vue.js')
    if 'c++' in title_lower: skills.append('C++')
    if 'c#' in title_lower or 'csharp' in title_lower: skills.append('C#')
    if 'go' in title_lower or 'golang' in title_lower: skills.append('Go')
    if 'php' in title_lower: skills.append('PHP')
    if 'ruby' in title_lower: skills.append('Ruby')
    if 'swift' in title_lower: skills.append('Swift')
    if 'kotlin' in title_lower: skills.append('Kotlin')
    if 'typescript' in title_lower: skills.append('TypeScript')
    
    # Frameworks & Tools
    if 'django' in title_lower: skills.append('Django')
    if 'flask' in title_lower: skills.append('Flask')
    if 'spring' in title_lower: skills.append('Spring')
    if 'docker' in title_lower: skills.append('Docker')
    if 'kubernetes' in title_lower or 'k8s' in title_lower: skills.append('Kubernetes')
    if 'aws' in title_lower: skills.append('AWS')
    if 'azure' in title_lower: skills.append('Azure')
    if 'gcp' in title_lower or 'google cloud' in title_lower: skills.append('GCP')
    
    # Databases
    if 'sql' in title_lower: skills.append('SQL')
    if 'mongodb' in title_lower or 'mongo' in title_lower: skills.append('MongoDB')
    if 'postgres' in title_lower: skills.append('PostgreSQL')
    if 'mysql' in title_lower: skills.append('MySQL')
    
    # Roles/Skills
    if 'frontend' in title_lower or 'front-end' in title_lower or 'front end' in title_lower:
        skills.append('Frontend Development')
    if 'backend' in title_lower or 'back-end' in title_lower or 'back end' in title_lower:
        skills.append('Backend Development')
    if 'full stack' in title_lower or 'fullstack' in title_lower:
        skills.append('Full Stack Development')
    if 'devops' in title_lower: skills.append('DevOps')
    if 'data' in title_lower and ('engineer' in title_lower or 'scientist' in title_lower or 'analyst' in title_lower):
        skills.append('Data Analysis')
    if 'machine learning' in title_lower or ' ml ' in title_lower: skills.append('Machine Learning')
    if ' ai ' in title_lower or 'artificial intelligence' in title_lower: skills.append('AI')
    
    return skills if skills else ['General Software Development']


def import_jobs_from_excel(excel_path, limit=10000):
    """
    Import jobs from Excel file to MongoDB
    
    Args:
        excel_path: Path to Excel file
        limit: Maximum number of jobs to import (default 10000)
    """
    
    print(f"📂 Reading Excel file: {excel_path}")
    
    # Read Excel file
    try:
        df = pd.read_excel(excel_path)
        print(f"✅ Loaded {len(df)} jobs from Excel")
    except Exception as e:
        print(f"❌ Error reading Excel: {e}")
        return
    
    # Display columns
    print(f"\n📋 Columns found: {list(df.columns)}")
    print("\n✅ Column mapping configured for your Excel file!\n")
    
    # Column mapping - CONFIGURED FOR YOUR EXCEL FILE
    column_mapping = {
        'job_title': 'title',
        'company_name': 'company',
        'location': 'location',
        'seniority_level': 'experience_level',
        'employment_type': 'job_type'
    }
    
    # Rename columns
    try:
        df = df.rename(columns=column_mapping)
    except Exception as e:
        print(f"⚠️  Column mapping error: {e}")
        print("   Please update column_mapping in the script")
        return
    
    # Keep only essential columns
    essential_cols = ['title', 'company', 'location', 'experience_level', 'job_type']
    available_cols = [col for col in essential_cols if col in df.columns]
    df = df[available_cols]
    
    print(f"📊 Keeping columns: {available_cols}")
    
    # Remove duplicates
    initial_count = len(df)
    df = df.drop_duplicates(subset=['title', 'company'], keep='first')
    print(f"🧹 Removed {initial_count - len(df)} duplicates")
    
    # Remove rows with missing critical data
    df = df.dropna(subset=['title', 'company'])
    print(f"🧹 Removed rows with missing title/company")
    
    # Extract skills from job titles
    print("\n🤖 Extracting skills from job titles...")
    df['skills'] = df['title'].apply(extract_skills_from_title)
    print(f"✅ Skills extracted for {len(df)} jobs")
    
    # Filter to top jobs (by relevance)
    if len(df) > limit:
        print(f"\n🎯 Filtering to top {limit} jobs...")
        
        # Calculate relevance score based on extracted skills
        df['skill_count'] = df['skills'].apply(lambda x: len(x) if x else 0)
        
        # Sort by skill count and take top N
        df = df.nlargest(limit, 'skill_count')
        df = df.drop('skill_count', axis=1)
        
        print(f"✅ Filtered to {len(df)} most relevant jobs")
    
    # Add metadata
    df['imported_at'] = datetime.utcnow()
    df['is_active'] = True
    
    # Convert to dict
    jobs = df.to_dict('records')
    
    print(f"\n💾 Preparing to insert {len(jobs)} jobs into MongoDB...")
    
    # Clear existing jobs (optional - comment out to keep existing)
    # jobs_collection.delete_many({})
    # print("🗑️  Cleared existing jobs")
    
    # Insert jobs in batches
    batch_size = 1000
    total_inserted = 0
    
    for i in range(0, len(jobs), batch_size):
        batch = jobs[i:i + batch_size]
        try:
            result = jobs_collection.insert_many(batch, ordered=False)
            total_inserted += len(result.inserted_ids)
            print(f"✅ Inserted batch {i//batch_size + 1}: {len(result.inserted_ids)} jobs")
        except Exception as e:
            print(f"⚠️  Batch {i//batch_size + 1} error: {e}")
    
    print(f"\n🎉 Successfully imported {total_inserted} jobs!")
    
    # Create indexes for fast queries
    print("\n🔍 Creating indexes...")
    jobs_collection.create_index([('skills', 1)])
    jobs_collection.create_index([('location', 1)])
    jobs_collection.create_index([('experience_level', 1)])
    jobs_collection.create_index([('title', 'text'), ('company', 'text')])
    print("✅ Indexes created")
    
    # Display sample job
    print("\n📄 Sample job:")
    sample = jobs_collection.find_one()
    if sample:
        sample.pop('_id', None)
        for key, value in sample.items():
            print(f"   {key}: {value}")
    
    print(f"\n✅ Import complete! Total jobs in database: {jobs_collection.count_documents({})}")


if __name__ == "__main__":
    # Path to your Excel file (CONFIGURED)
    EXCEL_FILE_PATH = r"C:\Users\Yashwin\Documents\Projects\AI-Powered Mock Interviewer\jobs.xlsx"
    
    # Set how many jobs to import (10000 recommended)
    MAX_JOBS = 10000
    
    print("=" * 60)
    print("🚀 JOB DATA IMPORT SCRIPT")
    print("=" * 60)
    print(f"\nExcel file: {EXCEL_FILE_PATH}")
    print(f"Max jobs to import: {MAX_JOBS}")
    print(f"MongoDB URI: {MONGO_URI[:30] if MONGO_URI else 'NOT SET'}...")
    print("\n" + "=" * 60 + "\n")
    
    # Run import
    import_jobs_from_excel(EXCEL_FILE_PATH, limit=MAX_JOBS)
