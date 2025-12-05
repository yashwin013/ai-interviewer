from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import interview, resume, auth

app = FastAPI(
    title="AI Interview",
    version="1.0.0",
    description="Backend for AI interviewer."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth routes
app.include_router(auth.router, prefix="/api/auth")

# Interview routes
app.include_router(interview.router, prefix="/api/interview")

# Resume routes
app.include_router(resume.router, prefix="/api/resume")

@app.get("/")
async def root():
    return {"message": "Backend running successfully"}
