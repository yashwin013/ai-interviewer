"""
AI Agent FastAPI Service
Provides REST API endpoints for resume parsing and interview question generation
"""

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import os
import json
from dotenv import load_dotenv

# LangChain imports
from langchain_community.document_loaders import PyPDFLoader
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

# Load environment variables
load_dotenv()

app = FastAPI(
    title="AI Interview Agent",
    version="1.0.0",
    description="AI-powered resume parsing and interview question generation"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== Pydantic Models ====================

class ResumeData(BaseModel):
    """Extract candidate information from resume."""
    candidate_first_name: str = Field(description="Candidate's First Name.")
    candidate_last_name: str = Field(description="Candidate's Last Name.")
    candidate_email: str = Field(description="Candidate's Email.")
    candidate_linkedin: str = Field(description="Candidate's LinkedIn.")
    experience: str = Field(description="Candidate's work experience.")
    skills: list[str] = Field(description="Key skills for the candidate.")
    seniority_level: str = Field(description="Seniority level: Fresher, Junior, Mid-Senior, Senior, Lead.")


class ParseResumeRequest(BaseModel):
    userId: str
    resumePath: str


class ParseResumeResponse(BaseModel):
    resumeProfile: Dict[str, Any]


class InitInterviewRequest(BaseModel):
    sessionId: str
    resumeProfile: Dict[str, Any]


class InitInterviewResponse(BaseModel):
    question: str


class NextQuestionRequest(BaseModel):
    sessionId: str
    resumeProfile: Dict[str, Any]
    currentQuestionNumber: int
    currentAnswer: str


class NextQuestionResponse(BaseModel):
    nextQuestion: Optional[str]


# ==================== Global LLM Setup ====================

# Initialize OpenAI models
embeddings = OpenAIEmbeddings()
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.7)

# ==================== Helper Functions ====================

def clean_dictionary(data):
    """Remove newlines and extra whitespace from dictionary values."""
    clean_data = {}
    for key, value in data.items():
        if isinstance(value, str):
            clean_data[key] = value.replace('\n', ' ').strip()
        elif isinstance(value, list):
            clean_data[key] = [v.replace('\n', ' ').strip() if isinstance(v, str) else v for v in value]
        else:
            clean_data[key] = value
    return clean_data


def parse_resume_from_pdf(pdf_path: str) -> Dict[str, Any]:
    """
    Parse resume PDF and extract candidate information using LLM.
    
    Args:
        pdf_path: Path to the PDF resume file
        
    Returns:
        Dictionary with candidate information
    """
    # Load PDF
    pdf = PyPDFLoader(pdf_path)
    loader = pdf.load()
    resume_text = "\n".join([page.page_content for page in loader])
    
    # Extract structured data using LLM
    structured_llm = llm.with_structured_output(ResumeData)
    result = structured_llm.invoke(f"Extract the candidate's information: \n\n{resume_text}")
    
    # Convert to dictionary
    profile = {
        "name": f"{result.candidate_first_name} {result.candidate_last_name}",
        "email": result.candidate_email,
        "linkedin": result.candidate_linkedin,
        "experience": result.experience,
        "skills": result.skills,
        "seniority_level": result.seniority_level
    }
    
    return clean_dictionary(profile)


# ==================== Interview Prompt ====================

interviewer_prompt = ChatPromptTemplate.from_messages([
    ("system", """
    The candidate has a seniority of: {seniority_level}.

    YOUR PRIMARY GOAL:
    - Conduct an interview of exactly {max_questions} questions.
    - The difficulty of questions MUST match the seniority level:
        - Fresher: simple, conceptual, basics
        - Junior: basic practical + scenario
        - Mid-level: deeper, practical, applied reasoning
        - Senior: architecture-level, ownership, end-to-end thinking  

    SECONDARY GOAL:
    Ask a balanced variety of:
    1. Experience-based
    2. Skill-based
    3. Behavioral/Profile-based

    RULE:
    - If total_questions_asked == 0, you MUST ask an introductory question:
        Examples:
        * "Tell me about yourself."
        * "Give me a brief introduction."
        * "Walk me through your background."
    """),

    ("human", """
    INTERVIEW STATUS:
    Questions Asked: {total_questions_asked} / {max_questions}

    TRANSCRIPT SO FAR:
    {chat_history}

    INSTRUCTION:
    Generate ONLY the next question.
    Avoid repeating previous questions.
    Make each new question cover a *new area* if possible.
    """)
])


def generate_first_question(resume_profile: Dict[str, Any]) -> str:
    """
    Generate the first interview question based on candidate profile.
    
    Args:
        resume_profile: Dictionary containing candidate information
        
    Returns:
        First interview question as string
    """
    seniority = resume_profile.get('seniority_level', 'Junior').lower()
    
    # Determine max questions based on seniority
    if seniority == "fresher":
        max_questions = 5
    elif seniority == "junior":
        max_questions = 7
    else:
        max_questions = 10
    
    # Create interview chain
    interview_chain = interviewer_prompt | llm | StrOutputParser()
    
    # Generate first question
    context = {
        "seniority_level": resume_profile.get('seniority_level', 'Junior'),
        "max_questions": max_questions,
        "total_questions_asked": 0,
        "chat_history": ""
    }
    
    question = interview_chain.invoke(context)
    return question.strip()


def generate_next_question(
    resume_profile: Dict[str, Any],
    current_question_number: int,
    current_answer: str,
    chat_history: str = ""
) -> Optional[str]:
    """
    Generate the next interview question based on previous Q&A.
    
    Args:
        resume_profile: Dictionary containing candidate information
        current_question_number: Number of the question just answered
        current_answer: Candidate's answer to the current question
        chat_history: Full transcript of previous Q&A
        
    Returns:
        Next question or None if interview should end
    """
    seniority = resume_profile.get('seniority_level', 'Junior').lower()
    
    # Determine max questions
    if seniority == "fresher":
        max_questions = 5
    elif seniority == "junior":
        max_questions = 7
    else:
        max_questions = 10
    
    # Check if interview should end
    if current_question_number >= max_questions:
        return None
    
    # Create interview chain
    interview_chain = interviewer_prompt | llm | StrOutputParser()
    
    # Generate next question
    context = {
        "seniority_level": resume_profile.get('seniority_level', 'Junior'),
        "max_questions": max_questions,
        "total_questions_asked": current_question_number,
        "chat_history": chat_history
    }
    
    question = interview_chain.invoke(context)
    return question.strip()


# ==================== API Endpoints ====================

@app.get("/")
async def root():
    return {
        "message": "AI Interview Agent API",
        "version": "1.0.0",
        "endpoints": ["/parse-resume", "/init-interview", "/next-question"]
    }


@app.post("/parse-resume", response_model=ParseResumeResponse)
async def parse_resume(request: ParseResumeRequest):
    """
    Parse a resume PDF and extract candidate information.
    
    Args:
        request: Contains userId and resumePath
        
    Returns:
        Parsed resume profile with candidate information
    """
    try:
        # Check if file exists
        if not os.path.exists(request.resumePath):
            raise HTTPException(status_code=404, detail=f"Resume file not found: {request.resumePath}")
        
        # Parse resume
        resume_profile = parse_resume_from_pdf(request.resumePath)
        
        return ParseResumeResponse(resumeProfile=resume_profile)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing resume: {str(e)}")


@app.post("/init-interview", response_model=InitInterviewResponse)
async def init_interview(request: InitInterviewRequest):
    """
    Initialize an interview session and generate the first question.
    
    Args:
        request: Contains sessionId and resumeProfile
        
    Returns:
        First interview question
    """
    try:
        # Generate first question
        first_question = generate_first_question(request.resumeProfile)
        
        return InitInterviewResponse(question=first_question)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error initializing interview: {str(e)}")


@app.post("/next-question", response_model=NextQuestionResponse)
async def next_question(request: NextQuestionRequest):
    """
    Generate the next interview question based on the candidate's answer.
    
    Args:
        request: Contains sessionId, resumeProfile, currentQuestionNumber, currentAnswer
        
    Returns:
        Next question or null if interview is complete
    """
    try:
        # Build chat history (simplified - in production, retrieve from database)
        chat_history = f"Question {request.currentQuestionNumber}: [Previous question]\nAnswer: {request.currentAnswer}\n"
        
        # Generate next question
        next_q = generate_next_question(
            resume_profile=request.resumeProfile,
            current_question_number=request.currentQuestionNumber,
            current_answer=request.currentAnswer,
            chat_history=chat_history
        )
        
        return NextQuestionResponse(nextQuestion=next_q)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating next question: {str(e)}")


# ==================== Health Check ====================

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "openai_key_configured": bool(os.getenv("OPENAI_API_KEY"))
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 5000))
    uvicorn.run(app, host="0.0.0.0", port=port)
