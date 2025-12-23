"""
Complete Job Seeding Script with ALL Detailed Descriptions
40 software jobs with comprehensive descriptions
"""
import asyncio
import sys
import os
from datetime import datetime, timedelta
import random

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

async def seed_jobs():
    client = AsyncIOMotorClient(settings.MONGO_URI)
    db = client[settings.DB_NAME]
    
    print("🗑️  Deleting all existing jobs...")
    result = await db.jobs.delete_many({})
    print(f"✅ Deleted {result.deleted_count} old jobs")
    
    # All job data with detailed descriptions
    all_jobs_data = [
        # ENTRY LEVEL JOBS (10)
        {"title": "Junior Frontend Developer", "company": "StartupHub", "level": "Entry", "skills": ["React", "JavaScript", "HTML", "CSS", "Git"], "salary": "$60,000 - $80,000",
         "desc": "We are seeking a motivated Junior Frontend Developer to join our dynamic team. Work closely with senior developers to build responsive web applications.\n\n**Responsibilities:**\n• Develop web applications using React\n• Collaborate with designers on UI components\n• Write clean, maintainable code\n• Participate in code reviews\n\n**Requirements:**\n• Bachelor's in CS or equivalent\n• Strong HTML, CSS, JavaScript skills\n• React experience\n• Git knowledge\n\n**Benefits:**\n• Competitive salary\n• Health insurance\n• Remote options\n• Professional development"},
        
        {"title": "Software Engineer Intern", "company": "TechCorp", "level": "Entry", "skills": ["Python", "Java", "Git", "SQL"], "salary": "$50,000 - $65,000",
         "desc": "Join TechCorp's internship program and gain hands-on experience building real-world software solutions.\n\n**What You'll Do:**\n• Contribute to production code\n• Learn best practices\n• Participate in agile development\n• Attend technical workshops\n\n**Qualifications:**\n• Pursuing CS degree\n• Strong programming foundation\n• Understanding of data structures\n• SQL familiarity\n\n**Perks:**\n• Mentorship program\n• Real project ownership\n• Full-time conversion potential\n• Competitive compensation"},
        
        {"title": "Junior Full Stack Developer", "company": "WebSolutions", "level": "Entry", "skills": ["React", "Node.js", "MongoDB", "Express"], "salary": "$65,000 - $85,000",
         "desc": "Build and maintain web applications working on both frontend and backend.\n\n**Key Responsibilities:**\n• Build responsive interfaces with React\n• Develop RESTful APIs with Node.js\n• Work with MongoDB databases\n• Implement authentication features\n\n**Required Skills:**\n• 1-2 years experience or strong portfolio\n• JavaScript/TypeScript proficiency\n• React and Node.js experience\n• MongoDB knowledge\n\n**What We Offer:**\n• Mentorship opportunities\n• Modern tech stack\n• Flexible remote work\n• Learning budget"},
        
        {"title": "Graduate Software Developer", "company": "InnovateTech", "level": "Entry", "skills": ["JavaScript", "TypeScript", "React", "REST APIs"], "salary": "$55,000 - $75,000",
         "desc": "Graduate Program offering structured training while contributing to real projects from day one.\n\n**Program Highlights:**\n• 6-month structured training\n• Team rotations\n• Production feature development\n• Modern development practices\n\n**Requirements:**\n• Recent graduate (within 2 years)\n• Strong programming fundamentals\n• JavaScript and TypeScript experience\n• Excellent communication skills\n\n**Benefits:**\n• Competitive salary\n• Health coverage\n• Development budget\n• Flexible working"},
        
        {"title": "Entry Level Backend Developer", "company": "CloudFirst", "level": "Entry", "skills": ["Python", "Django", "PostgreSQL", "Docker"], "salary": "$60,000 - $80,000",
         "desc": "Build scalable backend services powering our cloud platform used by thousands of customers.\n\n**What You'll Build:**\n• RESTful APIs with Python/Django\n• Database schemas with PostgreSQL\n• Microservices components\n• CI/CD pipelines\n\n**Qualifications:**\n• Bachelor's in CS or equivalent\n• Strong Python skills\n• Django framework experience\n• PostgreSQL understanding\n\n**Why Join Us:**\n• High-impact projects\n• Experienced mentors\n• Modern practices\n• Remote-first culture"},
        
        {"title": "Junior Mobile Developer", "company": "AppMakers", "level": "Entry", "skills": ["React Native", "JavaScript", "iOS", "Android"], "salary": "$65,000 - $85,000",
         "desc": "Create amazing mobile experiences using React Native for iOS and Android.\n\n**Responsibilities:**\n• Develop mobile apps with React Native\n• Implement UI/UX designs\n• Integrate with backend APIs\n• Optimize app performance\n\n**Requirements:**\n• 1+ year mobile development\n• React Native proficiency\n• iOS/Android understanding\n• Mobile deployment experience\n\n**Perks:**\n• Latest devices for testing\n• Flexible environment\n• Health insurance\n• Development support"},
        
        {"title": "Junior DevOps Engineer", "company": "InfraStack", "level": "Entry", "skills": ["Linux", "Docker", "Git", "CI/CD"], "salary": "$70,000 - $90,000",
         "desc": "Maintain and improve infrastructure and deployment pipelines while learning modern DevOps practices.\n\n**Key Duties:**\n• Maintain production infrastructure\n• Build CI/CD pipelines\n• Automate deployments\n• Troubleshoot system issues\n\n**Required Experience:**\n• Linux system administration\n• Docker understanding\n• Git familiarity\n• Scripting skills (Bash, Python)\n\n**Benefits:**\n• Learn cutting-edge tools\n• Senior mentorship\n• Hands-on experience\n• Remote options"},
        
        {"title": "Associate Software Engineer", "company": "DataFlow", "level": "Entry", "skills": ["Java", "Spring Boot", "MySQL", "REST APIs"], "salary": "$60,000 - $80,000",
         "desc": "Develop backend services for our data processing platform handling large-scale operations.\n\n**What You'll Do:**\n• Develop with Java/Spring Boot\n• Design REST APIs\n• Optimize MySQL queries\n• Build data pipelines\n\n**Qualifications:**\n• Bachelor's in CS\n• Strong Java skills\n• Spring Boot experience\n• SQL understanding\n\n**We Offer:**\n• Training program\n• Modern environment\n• Health benefits\n• Career growth"},
        
        {"title": "Junior QA Engineer", "company": "QualityFirst", "level": "Entry", "skills": ["Selenium", "Python", "Testing", "Automation"], "salary": "$55,000 - $75,000",
         "desc": "Ensure software quality through automated testing and collaboration with developers.\n\n**Responsibilities:**\n• Design test plans\n• Develop automated tests\n• Perform manual testing\n• Track bugs and issues\n\n**Requirements:**\n• 1+ year QA experience\n• Testing methodologies knowledge\n• Selenium experience\n• Python skills\n\n**Benefits:**\n• Learn automation best practices\n• Modern testing tools\n• Flexible schedule\n• Professional development"},
        
        {"title": "Frontend Developer Trainee", "company": "DesignTech", "level": "Entry", "skills": ["Vue.js", "JavaScript", "CSS", "Figma"], "salary": "$50,000 - $70,000",
         "desc": "Perfect for starting your web development career. Build beautiful interfaces with experienced designers.\n\n**Training Program:**\n• 3-month structured onboarding\n• Real production features\n• Vue.js training\n• Design collaboration\n\n**Ideal Candidate:**\n• Recent graduate or career changer\n• HTML, CSS, JavaScript basics\n• Passion for frontend development\n• Figma familiarity\n\n**What We Provide:**\n• Comprehensive mentorship\n• Real project work\n• Full-time path\n• Competitive compensation"},
        
        # MID LEVEL JOBS (15)
        {"title": "Full Stack Developer", "company": "TechVentures", "level": "Mid", "skills": ["React", "Node.js", "TypeScript", "AWS", "MongoDB"], "salary": "$100,000 - $130,000",
         "desc": "Build end-to-end features for our SaaS platform serving enterprise clients.\n\n**Responsibilities:**\n• Architect full-stack solutions\n• Lead feature development\n• Mentor junior developers\n• Optimize application performance\n\n**Requirements:**\n• 3-5 years full-stack experience\n• Expert in React and Node.js\n• TypeScript proficiency\n• AWS cloud experience\n\n**Benefits:**\n• Equity compensation\n• Unlimited PTO\n• Remote-first\n• $5K learning budget"},
        
        {"title": "Software Engineer", "company": "CloudNative", "level": "Mid", "skills": ["Python", "FastAPI", "PostgreSQL", "Docker", "Kubernetes"], "salary": "$110,000 - $140,000",
         "desc": "Design and build microservices for our cloud-native platform.\n\n**What You'll Do:**\n• Build scalable microservices\n• Design system architecture\n• Implement CI/CD pipelines\n• Collaborate across teams\n\n**Qualifications:**\n• 3+ years backend development\n• Python and FastAPI expertise\n• Kubernetes experience\n• Strong system design skills\n\n**Perks:**\n• Stock options\n• Premium health coverage\n• Home office stipend\n• Conference attendance"},
        
        {"title": "Backend Developer", "company": "DataSystems", "level": "Mid", "skills": ["Java", "Spring Boot", "Microservices", "Kafka", "Redis"], "salary": "$105,000 - $135,000",
         "desc": "Build high-performance backend systems processing millions of transactions daily.\n\n**Key Responsibilities:**\n• Design microservices architecture\n• Implement event-driven systems\n• Optimize database performance\n• Ensure system reliability\n\n**Required Skills:**\n• 4+ years Java development\n• Microservices expertise\n• Kafka and Redis experience\n• Strong problem-solving\n\n**What We Offer:**\n• Competitive salary\n• 401(k) matching\n• Flexible schedule\n• Career advancement"},
        
        {"title": "Frontend Engineer", "company": "UIExperts", "level": "Mid", "skills": ["React", "TypeScript", "Next.js", "Tailwind CSS", "GraphQL"], "salary": "$95,000 - $125,000",
         "desc": "Create exceptional user experiences with modern frontend technologies.\n\n**Responsibilities:**\n• Build responsive web applications\n• Implement design systems\n• Optimize frontend performance\n• Lead UI architecture decisions\n\n**Requirements:**\n• 3+ years frontend development\n• React and TypeScript mastery\n• Next.js experience\n• GraphQL knowledge\n\n**Benefits:**\n• Remote work\n• Health/dental/vision\n• Stock options\n• Professional growth"},
        
        {"title": "DevOps Engineer", "company": "InfraCloud", "level": "Mid", "skills": ["AWS", "Terraform", "Kubernetes", "Docker", "CI/CD"], "salary": "$115,000 - $145,000",
         "desc": "Manage and scale our cloud infrastructure supporting millions of users.\n\n**What You'll Build:**\n• Infrastructure as Code\n• Kubernetes clusters\n• CI/CD automation\n• Monitoring systems\n\n**Qualifications:**\n• 3-5 years DevOps experience\n• AWS certification preferred\n• Terraform expertise\n• Strong automation skills\n\n**Perks:**\n• Generous PTO\n• Remote-first culture\n• Latest tools and tech\n• Learning opportunities"},
        
        {"title": "Mobile Developer", "company": "MobileFirst", "level": "Mid", "skills": ["React Native", "TypeScript", "iOS", "Android", "Firebase"], "salary": "$100,000 - $130,000",
         "desc": "Lead mobile app development reaching millions of users worldwide.\n\n**Responsibilities:**\n• Architect mobile applications\n• Implement complex features\n• Optimize app performance\n• Mentor junior developers\n\n**Requirements:**\n• 3+ years mobile development\n• React Native expertise\n• Native iOS/Android knowledge\n• Firebase experience\n\n**Benefits:**\n• Equity package\n• Health insurance\n• Remote flexibility\n• Device allowance"},
        
        {"title": "Data Engineer", "company": "BigDataCo", "level": "Mid", "skills": ["Python", "Spark", "Airflow", "SQL", "AWS"], "salary": "$110,000 - $140,000",
         "desc": "Build data pipelines processing petabytes of data for analytics and ML.\n\n**Key Duties:**\n• Design data pipelines\n• Optimize ETL processes\n• Build data warehouses\n• Ensure data quality\n\n**Required Experience:**\n• 3+ years data engineering\n• Spark and Airflow expertise\n• SQL mastery\n• AWS data services knowledge\n\n**What We Offer:**\n• Competitive compensation\n• Stock options\n• Remote work\n• Cutting-edge projects"},
        
        {"title": "Machine Learning Engineer", "company": "AI Solutions", "level": "Mid", "skills": ["Python", "TensorFlow", "PyTorch", "ML", "AWS"], "salary": "$120,000 - $150,000",
         "desc": "Develop and deploy ML models powering our AI-driven products.\n\n**Responsibilities:**\n• Build ML models\n• Deploy to production\n• Optimize model performance\n• Collaborate with data scientists\n\n**Qualifications:**\n• 3+ years ML engineering\n• TensorFlow/PyTorch expertise\n• MLOps experience\n• Strong Python skills\n\n**Benefits:**\n• Top-tier compensation\n• GPU resources\n• Conference budget\n• Research time"},
        
        {"title": "Cloud Engineer", "company": "CloudScale", "level": "Mid", "skills": ["AWS", "Azure", "Terraform", "Python", "Kubernetes"], "salary": "$105,000 - $135,000",
         "desc": "Design and implement multi-cloud solutions for enterprise clients.\n\n**What You'll Do:**\n• Architect cloud solutions\n• Migrate applications to cloud\n• Implement security best practices\n• Optimize cloud costs\n\n**Requirements:**\n• 3-5 years cloud experience\n• AWS and Azure certifications\n• Terraform proficiency\n• Strong networking knowledge\n\n**Perks:**\n• Certification reimbursement\n• Remote work\n• Health benefits\n• Career development"},
        
        {"title": "Site Reliability Engineer", "company": "ReliableOps", "level": "Mid", "skills": ["Python", "Kubernetes", "Monitoring", "Linux", "Terraform"], "salary": "$115,000 - $145,000",
         "desc": "Ensure reliability and performance of production systems at scale.\n\n**Responsibilities:**\n• Monitor system health\n• Implement SLOs/SLIs\n• Automate operations\n• Incident response\n\n**Qualifications:**\n• 3+ years SRE experience\n• Kubernetes expertise\n• Strong scripting skills\n• Monitoring tool knowledge\n\n**Benefits:**\n• On-call compensation\n• Flexible schedule\n• Stock options\n• Professional growth"},
        
        {"title": "iOS Developer", "company": "AppleExperts", "level": "Mid", "skills": ["Swift", "SwiftUI", "iOS", "Xcode", "REST APIs"], "salary": "$100,000 - $130,000",
         "desc": "Build beautiful iOS applications using the latest Apple technologies.\n\n**Key Responsibilities:**\n• Develop iOS apps with Swift\n• Implement SwiftUI interfaces\n• Integrate with backend APIs\n• Ensure app quality\n\n**Required Skills:**\n• 3+ years iOS development\n• Swift and SwiftUI mastery\n• App Store deployment\n• Strong UI/UX sense\n\n**What We Offer:**\n• MacBook Pro + iPhone\n• Health insurance\n• Remote work\n• WWDC attendance"},
        
        {"title": "Android Developer", "company": "DroidMasters", "level": "Mid", "skills": ["Kotlin", "Android", "Jetpack Compose", "MVVM"], "salary": "$100,000 - $130,000",
         "desc": "Create cutting-edge Android applications with modern architecture.\n\n**Responsibilities:**\n• Build Android apps with Kotlin\n• Implement Jetpack Compose UI\n• Follow MVVM architecture\n• Optimize performance\n\n**Requirements:**\n• 3+ years Android development\n• Kotlin expertise\n• Jetpack Compose experience\n• Play Store deployment\n\n**Benefits:**\n• Latest Android devices\n• Health coverage\n• Remote flexibility\n• Conference budget"},
        
        {"title": "Platform Engineer", "company": "PlatformOps", "level": "Mid", "skills": ["Kubernetes", "Docker", "Go", "Python", "CI/CD"], "salary": "$110,000 - $140,000",
         "desc": "Build internal platforms and tools empowering engineering teams.\n\n**What You'll Build:**\n• Developer platforms\n• Internal tooling\n• Kubernetes operators\n• Automation systems\n\n**Qualifications:**\n• 3-5 years platform engineering\n• Kubernetes expertise\n• Go or Python proficiency\n• Strong system design\n\n**Perks:**\n• Equity compensation\n• Remote-first\n• Learning budget\n• Latest technology"},
        
        {"title": "Security Engineer", "company": "SecureStack", "level": "Mid", "skills": ["Security", "Python", "Penetration Testing", "AWS"], "salary": "$115,000 - $145,000",
         "desc": "Protect our infrastructure and applications from security threats.\n\n**Responsibilities:**\n• Conduct security assessments\n• Implement security controls\n• Respond to incidents\n• Security training\n\n**Requirements:**\n• 3+ years security engineering\n• Penetration testing skills\n• Cloud security knowledge\n• Security certifications\n\n**Benefits:**\n• Certification reimbursement\n• Security conference attendance\n• Remote work\n• Competitive salary"},
        
        {"title": "QA Automation Engineer", "company": "TestPro", "level": "Mid", "skills": ["Selenium", "Python", "Cypress", "CI/CD", "Testing"], "salary": "$90,000 - $120,000",
         "desc": "Lead test automation efforts ensuring product quality at scale.\n\n**Key Duties:**\n• Build automation frameworks\n• Implement E2E testing\n• Integrate with CI/CD\n• Mentor QA team\n\n**Required Experience:**\n• 3+ years QA automation\n• Selenium and Cypress expertise\n• Python proficiency\n• CI/CD integration skills\n\n**What We Offer:**\n• Remote work\n• Health benefits\n• Professional development\n• Quality-first culture"},
        
        # SENIOR LEVEL JOBS (15)
        {"title": "Senior Full Stack Engineer", "company": "TechGiants", "level": "Senior", "skills": ["React", "Node.js", "TypeScript", "AWS", "Microservices", "System Design"], "salary": "$150,000 - $200,000",
         "desc": "Lead architecture and development of our flagship product serving millions of users.\n\n**Leadership Responsibilities:**\n• Architect scalable systems\n• Lead technical initiatives\n• Mentor engineering team\n• Drive technical excellence\n\n**Requirements:**\n• 7+ years full-stack experience\n• Expert system design skills\n• Proven leadership ability\n• Strong communication\n\n**Compensation:**\n• $150K-$200K base\n• Significant equity\n• Unlimited PTO\n• Premium benefits"},
        
        {"title": "Senior Software Engineer", "company": "EnterpriseCloud", "level": "Senior", "skills": ["Java", "Spring Boot", "Kubernetes", "Microservices", "AWS"], "salary": "$160,000 - $210,000",
         "desc": "Drive technical strategy for enterprise-scale cloud platform.\n\n**What You'll Lead:**\n• System architecture decisions\n• Technical roadmap planning\n• Cross-team collaboration\n• Engineering best practices\n\n**Qualifications:**\n• 8+ years software engineering\n• Microservices architecture expert\n• Kubernetes production experience\n• Leadership track record\n\n**Benefits:**\n• Top-tier compensation\n• Stock options\n• Remote-first\n• Executive coaching"},
        
        {"title": "Staff Software Engineer", "company": "ScaleUp", "level": "Senior", "skills": ["Python", "System Design", "Distributed Systems", "AWS", "Leadership"], "salary": "$180,000 - $240,000",
         "desc": "Shape technical direction and mentor engineers across the organization.\n\n**Responsibilities:**\n• Define technical strategy\n• Solve complex problems\n• Mentor senior engineers\n• Drive innovation\n\n**Requirements:**\n• 10+ years experience\n• Distributed systems expertise\n• Proven technical leadership\n• Excellent communication\n\n**Package:**\n• $180K-$240K base\n• Large equity grant\n• Flexible schedule\n• Executive benefits"},
        
        {"title": "Senior Backend Engineer", "company": "DataPlatform", "level": "Senior", "skills": ["Go", "Microservices", "Kafka", "PostgreSQL", "Redis", "System Design"], "salary": "$155,000 - $205,000",
         "desc": "Build high-performance backend systems processing billions of events.\n\n**Technical Leadership:**\n• Design scalable architecture\n• Optimize system performance\n• Lead technical reviews\n• Mentor backend team\n\n**Qualifications:**\n• 7+ years backend engineering\n• Go language expertise\n• Event-driven architecture\n• Strong system design\n\n**Compensation:**\n• Competitive base salary\n• Equity package\n• Health/dental/vision\n• Remote flexibility"},
        
        {"title": "Senior Frontend Engineer", "company": "UserExperience", "level": "Senior", "skills": ["React", "TypeScript", "Next.js", "Performance", "Architecture"], "salary": "$145,000 - $195,000",
         "desc": "Lead frontend architecture and deliver exceptional user experiences.\n\n**Leadership Responsibilities:**\n• Define frontend architecture\n• Optimize web performance\n• Establish coding standards\n• Mentor frontend team\n\n**Requirements:**\n• 7+ years frontend development\n• React ecosystem mastery\n• Performance optimization expert\n• Strong design sense\n\n**Benefits:**\n• Generous compensation\n• Stock options\n• Remote work\n• Conference speaking"},
        
        {"title": "Principal Engineer", "company": "TechLeaders", "level": "Senior", "skills": ["System Design", "Architecture", "Leadership", "Multiple Languages", "Cloud"], "salary": "$200,000 - $280,000",
         "desc": "Drive technical vision and strategy across the entire engineering organization.\n\n**Strategic Leadership:**\n• Set technical direction\n• Influence company strategy\n• Mentor staff engineers\n• Solve hardest problems\n\n**Qualifications:**\n• 12+ years experience\n• Multiple domain expertise\n• Proven technical leadership\n• Industry recognition\n\n**Package:**\n• $200K-$280K base\n• Executive equity\n• Unlimited PTO\n• Executive perks"},
        
        {"title": "Senior DevOps Engineer", "company": "CloudOps", "level": "Senior", "skills": ["AWS", "Kubernetes", "Terraform", "Python", "Architecture"], "salary": "$165,000 - $215,000",
         "desc": "Lead infrastructure strategy and operations for global platform.\n\n**Leadership Responsibilities:**\n• Design cloud architecture\n• Lead DevOps initiatives\n• Establish SRE practices\n• Mentor DevOps team\n\n**Requirements:**\n• 7+ years DevOps experience\n• AWS Solutions Architect\n• Kubernetes CKA certified\n• Strong leadership skills\n\n**Compensation:**\n• Excellent base salary\n• Stock options\n• Remote-first\n• Certification budget"},
        
        {"title": "Senior ML Engineer", "company": "AI Research", "level": "Senior", "skills": ["Python", "TensorFlow", "PyTorch", "MLOps", "System Design"], "salary": "$170,000 - $230,000",
         "desc": "Lead ML infrastructure and deploy models powering AI products.\n\n**Technical Leadership:**\n• Design ML systems\n• Build MLOps platforms\n• Lead model deployment\n• Mentor ML engineers\n\n**Qualifications:**\n• 7+ years ML engineering\n• Production ML experience\n• MLOps expertise\n• Strong system design\n\n**Benefits:**\n• Top compensation\n• Research time\n• GPU resources\n• Conference budget"},
        
        {"title": "Tech Lead - Backend", "company": "ScaleSystems", "level": "Senior", "skills": ["Java", "System Design", "Leadership", "Microservices", "AWS"], "salary": "$175,000 - $225,000",
         "desc": "Lead backend team and drive technical excellence.\n\n**Leadership Responsibilities:**\n• Manage backend team\n• Define technical roadmap\n• Architect solutions\n• Drive delivery\n\n**Requirements:**\n• 8+ years backend development\n• 2+ years tech lead experience\n• Strong people skills\n• Excellent communication\n\n**Package:**\n• Competitive salary\n• Management bonus\n• Stock options\n• Leadership training"},
        
        {"title": "Senior Data Engineer", "company": "DataWarehouse", "level": "Senior", "skills": ["Python", "Spark", "Airflow", "Data Modeling", "AWS"], "salary": "$160,000 - $210,000",
         "desc": "Lead data platform development and architecture.\n\n**Technical Leadership:**\n• Design data architecture\n• Build scalable pipelines\n• Optimize data systems\n• Mentor data team\n\n**Qualifications:**\n• 7+ years data engineering\n• Spark and Airflow expertise\n• Data modeling mastery\n• Strong leadership\n\n**Compensation:**\n• Excellent base pay\n• Equity package\n• Remote work\n• Learning budget"},
        
        {"title": "Engineering Manager", "company": "TeamFirst", "level": "Senior", "skills": ["Leadership", "System Design", "Agile", "Multiple Languages"], "salary": "$180,000 - $240,000",
         "desc": "Lead and grow high-performing engineering team.\n\n**Management Responsibilities:**\n• Manage 8-12 engineers\n• Drive team performance\n• Career development\n• Technical strategy\n\n**Requirements:**\n• 10+ years engineering\n• 3+ years management\n• Strong technical background\n• Excellent people skills\n\n**Benefits:**\n• Management compensation\n• Performance bonus\n• Stock options\n• Executive coaching"},
        
        {"title": "Senior Cloud Architect", "company": "CloudArchitects", "level": "Senior", "skills": ["AWS", "Azure", "Architecture", "Terraform", "Security"], "salary": "$170,000 - $230,000",
         "desc": "Design enterprise cloud solutions and lead cloud strategy.\n\n**Strategic Leadership:**\n• Design cloud architecture\n• Lead cloud migration\n• Establish best practices\n• Advise executives\n\n**Qualifications:**\n• 8+ years cloud experience\n• Multiple cloud certifications\n• Architecture expertise\n• Strong communication\n\n**Package:**\n• Top-tier salary\n• Equity compensation\n• Remote flexibility\n• Certification budget"},
        
        {"title": "Senior Mobile Engineer", "company": "MobileExperts", "level": "Senior", "skills": ["React Native", "iOS", "Android", "Architecture", "Performance"], "salary": "$150,000 - $200,000",
         "desc": "Lead mobile architecture and deliver world-class mobile experiences.\n\n**Leadership Responsibilities:**\n• Define mobile architecture\n• Optimize app performance\n• Lead mobile team\n• Drive mobile strategy\n\n**Requirements:**\n• 7+ years mobile development\n• React Native expertise\n• Native platform knowledge\n• Strong leadership\n\n**Compensation:**\n• Competitive base salary\n• Stock options\n• Device allowance\n• Remote work"},
        
        {"title": "Senior Security Engineer", "company": "CyberSec", "level": "Senior", "skills": ["Security", "Penetration Testing", "AWS", "Python", "Architecture"], "salary": "$165,000 - $220,000",
         "desc": "Lead security initiatives and protect company infrastructure.\n\n**Security Leadership:**\n• Design security architecture\n• Lead security assessments\n• Incident response\n• Security training\n\n**Qualifications:**\n• 7+ years security engineering\n• Advanced certifications (OSCP, CISSP)\n• Cloud security expertise\n• Strong leadership\n\n**Benefits:**\n• Excellent compensation\n• Security conference budget\n• Certification reimbursement\n• Remote work"},
        
        {"title": "Distinguished Engineer", "company": "TechInnovators", "level": "Senior", "skills": ["System Design", "Architecture", "Leadership", "Innovation", "Multiple Domains"], "salary": "$220,000 - $300,000",
         "desc": "Highest technical role - drive innovation and technical excellence company-wide.\n\n**Strategic Impact:**\n• Set technical vision\n• Influence industry\n• Solve impossible problems\n• Mentor principal engineers\n\n**Qualifications:**\n• 15+ years experience\n• Industry-recognized expert\n• Multiple patents/publications\n• Exceptional leadership\n\n**Executive Package:**\n• $220K-$300K base\n• Executive equity\n• Unlimited PTO\n• Full executive benefits"},
    ]
    
    locations = ["San Francisco, CA (Remote)", "New York, NY (Hybrid)", "Seattle, WA (Remote)", 
                 "Austin, TX (On-site)", "Boston, MA (Hybrid)", "Remote (US)", 
                 "Los Angeles, CA (Remote)", "Chicago, IL (Hybrid)", "Denver, CO (Remote)", "Remote (Global)"]
    
    job_types = ["Full-time", "Full-time", "Full-time", "Contract", "Part-time"]
    
    jobs = []
    for idx, job_data in enumerate(all_jobs_data, 1):
        jobs.append({
            "jobId": f"JOB{idx:03d}",
            "title": job_data["title"],
            "company": job_data["company"],
            "location": random.choice(locations),
            "job_type": random.choice(job_types),
            "experience_level": job_data["level"],
            "skills": job_data["skills"],
            "description": job_data["desc"],
            "salary_range": job_data["salary"],
            "posted_date": (datetime.now() - timedelta(days=random.randint(1, 30))).strftime("%Y-%m-%d"),
            "application_url": f"https://careers.example.com/apply/{idx}"
        })
    
    print(f"\n📝 Inserting {len(jobs)} jobs with detailed descriptions...")
    result = await db.jobs.insert_many(jobs)
    print(f"✅ Successfully inserted {len(result.inserted_ids)} jobs!")
    
    print("\n📊 Job Summary:")
    print(f"   Entry Level: 10 jobs")
    print(f"   Mid Level: 15 jobs")
    print(f"   Senior Level: 15 jobs")
    print(f"   Total: {len(jobs)} jobs")
    print("\n✅ ALL jobs include detailed descriptions!")
    
    client.close()
    print("\n✨ Job seeding completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed_jobs())
