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
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_openai import OpenAIEmbeddings

# Session manager
from session_manager import session_manager

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
    resumeText: str
    chunks: List[str]


class ParseResumeResponse(BaseModel):
    resumeProfile: Dict[str, Any]


class InitInterviewRequest(BaseModel):
    sessionId: str
    resumeText: str
    chunks: List[str]


class InitInterviewResponse(BaseModel):
    question: str


class NextQuestionRequest(BaseModel):
    sessionId: str
    resumeText: str
    chunks: List[str]
    currentQuestionNumber: int
    currentAnswer: str


class NextQuestionResponse(BaseModel):
    nextQuestion: Optional[str]


class InterviewAssessment(BaseModel):
    """Assessment generated after interview completion."""
    candidate_score_percent: str = Field(description="Score out of 100")
    hiring_recommendation: str = Field(description="'Definitely Hire!', 'Proceed with caution', or 'Dont hire'")
    strengths: List[str] = Field(description="Candidate's strengths")
    improvement_areas: List[str] = Field(description="Areas needing improvement")
    next_steps: str = Field(description="Recommended next steps")


class GenerateAssessmentRequest(BaseModel):
    sessionId: str
    resumeText: str
    chunks: List[str]
    transcript: List[Dict[str, str]]  # List of {question, answer} pairs
    seniorityLevel: str


class GenerateAssessmentResponse(BaseModel):
    assessment: Dict[str, Any]


# ==================== Global LLM Setup ====================

# Initialize OpenAI models
llm = ChatOpenAI(
    model="gpt-4o",  # OpenAI GPT-4o model
    temperature=0.7,
    api_key=os.getenv("OPENAI_API_KEY")
)

# Note: Embeddings not needed for current implementation, but keeping for future use
embeddings = OpenAIEmbeddings() if os.getenv("OPENAI_API_KEY") else None

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


def parse_resume_from_chunks(resume_text: str, chunks: List[str]) -> Dict[str, Any]:
    """
    Parse resume from text chunks and extract candidate information using LLM.
    
    Args:
        resume_text: Full extracted resume text
        chunks: List of text chunks from the resume
        
    Returns:
        Dictionary with candidate information
    """
    # Use the full resume text for extraction (chunks are for context later)
    # Create prompt for JSON extraction
    prompt = f"""Extract the candidate's information from the following resume and return it as JSON.

Resume:
{resume_text}

Return a JSON object with these exact fields:
- candidate_first_name: string
- candidate_last_name: string
- candidate_email: string
- candidate_linkedin: string
- experience: string (summary of work experience)
- skills: array of strings
- seniority_level: string (one of: Fresher, Junior, Mid-Senior, Senior, Lead)

Return ONLY the JSON object, no other text."""
    
    # Create prompt for JSON extraction
    prompt = f"""Extract the candidate's information from the following resume and return it as JSON.

Resume:
{resume_text}

Return a JSON object with these exact fields:
- candidate_first_name: string
- candidate_last_name: string
- candidate_email: string
- candidate_linkedin: string
- experience: string (summary of work experience)
- skills: array of strings
- seniority_level: string (one of: Fresher, Junior, Mid-Senior, Senior, Lead)

Return ONLY the JSON object, no other text."""
    
    # Use JSON mode for structured output
    llm_json = ChatOpenAI(
        model="gpt-4o",
        temperature=0.7,
        api_key=os.getenv("OPENAI_API_KEY"),
        model_kwargs={"response_format": {"type": "json_object"}}
    )
    
    response = llm_json.invoke(prompt)
    result_json = json.loads(response.content)
    
    # Convert to expected format
    profile = {
        "name": f"{result_json['candidate_first_name']} {result_json['candidate_last_name']}",
        "email": result_json['candidate_email'],
        "linkedin": result_json['candidate_linkedin'],
        "experience": result_json['experience'],
        "skills": result_json['skills'],
        "seniority_level": result_json['seniority_level']
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

    RESUME CONTEXT (use this to ask relevant questions):
    {resume_chunks}

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
    Use the resume context to ask specific, relevant questions about the candidate's experience and skills.
    """)
])


# ==================== Assessment Prompt ====================

assessment_prompt = ChatPromptTemplate.from_messages([
    ("system", """
    You are an experienced Hiring Manager and Technical Assessor.
    Analyze the complete interview transcript and the candidate profile to generate a structured assessment.
    
    Consider:
    - Technical knowledge demonstrated in answers
    - Communication skills and clarity
    - Problem-solving approach
    - Depth of experience
    - Alignment with stated seniority level
    - Overall performance across all questions
    
    Be fair but critical. Provide actionable feedback.
    """),
    ("human", """
    CANDIDATE PROFILE:
    {profile_doc}
    
    SENIORITY LEVEL: {difficulty_level}
    
    --- COMPLETE INTERVIEW TRANSCRIPT ---
    {chat_history}
    
    Generate a comprehensive assessment following the InterviewAssessment schema.
    Include specific examples from the transcript to support your evaluation.
    """)
])


def generate_first_question(session_id: str, chunks: List[str], seniority_level: str, max_questions: int) -> str:
    """
    Generate the first interview question based on candidate profile and resume chunks.
    
    Args:
        session_id: Session identifier
        chunks: Resume text chunks for context
        seniority_level: Candidate's seniority level
        max_questions: Maximum number of questions for this interview
        
    Returns:
        First interview question as string
    """
    # Create interview chain
    interview_chain = interviewer_prompt | llm | StrOutputParser()
    
    # Prepare resume chunks as context (first 3-5 chunks for initial question)
    resume_context = "\n\n".join(chunks[:5])
    
    # Generate first question
    context = {
        "seniority_level": seniority_level,
        "max_questions": max_questions,
        "total_questions_asked": 0,
        "chat_history": "",
        "resume_chunks": resume_context
    }
    
    question = interview_chain.invoke(context)
    return question.strip()


def generate_next_question(
    session_id: str,
    chunks: List[str],
    seniority_level: str,
    max_questions: int,
    questions_asked: int,
    chat_history: str
) -> Optional[str]:
    """
    Generate the next interview question based on previous Q&A and resume chunks.
    
    Args:
        session_id: Session identifier
        chunks: Resume text chunks for context
        seniority_level: Candidate's seniority level
        max_questions: Maximum questions for this interview
        questions_asked: Number of questions already asked
        chat_history: Full transcript of previous Q&A
        
    Returns:
        Next question or None if interview should end
    """
    # Check if interview should end
    if questions_asked >= max_questions:
        return None
    
    # Create interview chain
    interview_chain = interviewer_prompt | llm | StrOutputParser()
    
    # Select relevant chunks based on conversation (simple approach: use all chunks)
    # In a more advanced version, you could use semantic search here
    resume_context = "\n\n".join(chunks)
    
    # Generate next question
    context = {
        "seniority_level": seniority_level,
        "max_questions": max_questions,
        "total_questions_asked": questions_asked,
        "chat_history": chat_history,
        "resume_chunks": resume_context
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
    Parse resume from text chunks and extract candidate information.
    
    Args:
        request: Contains userId, resumeText, and chunks
        
    Returns:
        Parsed resume profile with candidate information
    """
    try:
        print(f"[DEBUG] Received resume parse request for user: {request.userId}")
        print(f"[DEBUG] Resume text length: {len(request.resumeText)} characters")
        print(f"[DEBUG] Number of chunks: {len(request.chunks)}")
        
        # Parse resume from chunks
        resume_profile = parse_resume_from_chunks(request.resumeText, request.chunks)
        
        print(f"[DEBUG] Resume parsed successfully")
        print(f"[DEBUG] Extracted profile: {resume_profile}")
        
        return ParseResumeResponse(resumeProfile=resume_profile)
        
    except Exception as e:
        import traceback
        print(f"[ERROR] Exception occurred while parsing resume:")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error parsing resume: {str(e)}")


@app.post("/init-interview", response_model=InitInterviewResponse)
async def init_interview(request: InitInterviewRequest):
    """
    Initialize an interview session and generate the first question.
    
    Args:
        request: Contains sessionId, resumeText, and chunks
        
    Returns:
        First interview question
    """
    try:
        print(f"[DEBUG] Initializing interview for session: {request.sessionId}")
        print(f"[DEBUG] Resume text length: {len(request.resumeText)}")
        print(f"[DEBUG] Number of chunks: {len(request.chunks)}")
        
        # Parse resume to get profile
        resume_profile = parse_resume_from_chunks(request.resumeText, request.chunks)
        
        # Determine max questions based on seniority
        seniority = resume_profile.get('seniority_level', 'Junior').lower()
        if seniority == "fresher":
            max_questions = 5
        elif seniority == "junior":
            max_questions = 7
        else:
            max_questions = 10
        
        # Create session in session manager
        session_manager.create_session(
            session_id=request.sessionId,
            resume_profile=resume_profile,
            chunks=request.chunks
        )
        
        print(f"[DEBUG] Session created with max_questions: {max_questions}")
        
        # Generate first question
        first_question = generate_first_question(
            session_id=request.sessionId,
            chunks=request.chunks,
            seniority_level=resume_profile['seniority_level'],
            max_questions=max_questions
        )
        
        # Store first question in session
        session_manager.update_conversation(
            session_id=request.sessionId,
            question=first_question,
            answer=None
        )
        
        print(f"[DEBUG] First question generated: {first_question}")
        
        return InitInterviewResponse(question=first_question)
        
    except Exception as e:
        import traceback
        print(f"[ERROR] Exception occurred while initializing interview:")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error initializing interview: {str(e)}")


@app.post("/next-question", response_model=NextQuestionResponse)
async def next_question(request: NextQuestionRequest):
    """
    Generate the next interview question based on the candidate's answer.
    
    Args:
        request: Contains sessionId, resumeText, chunks, currentQuestionNumber, currentAnswer
        
    Returns:
        Next question or null if interview is complete
    """
    try:
        print(f"[DEBUG] Generating next question for session: {request.sessionId}")
        print(f"[DEBUG] Current question number: {request.currentQuestionNumber}")
        print(f"[DEBUG] Current answer: {request.currentAnswer[:100]}...")
        
        # Get session data
        session = session_manager.get_session(request.sessionId)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Update conversation with the answer to current question
        conversation = session_manager.get_conversation_history(request.sessionId)
        if conversation and len(conversation) > 0:
            # Update the last question with the answer
            last_qa = conversation[-1]
            if last_qa.get("answer") is None:
                session_manager.update_conversation(
                    session_id=request.sessionId,
                    question=last_qa["question"],
                    answer=request.currentAnswer
                )
        
        # Get updated session data
        questions_asked = session_manager.get_questions_asked(request.sessionId)
        max_questions = session_manager.get_max_questions(request.sessionId)
        resume_profile = session_manager.get_resume_profile(request.sessionId)
        chunks = session_manager.get_chunks(request.sessionId)
        
        print(f"[DEBUG] Questions asked: {questions_asked}/{max_questions}")
        
        # Build chat history for context
        conversation = session_manager.get_conversation_history(request.sessionId)
        chat_history = "\n\n".join([
            f"Q: {qa['question']}\nA: {qa.get('answer', 'No answer yet')}"
            for qa in conversation
        ])
        
        # Generate next question
        next_q = generate_next_question(
            session_id=request.sessionId,
            chunks=chunks,
            seniority_level=resume_profile['seniority_level'],
            max_questions=max_questions,
            questions_asked=questions_asked,
            chat_history=chat_history
        )
        
        if next_q:
            # Store next question in session
            session_manager.update_conversation(
                session_id=request.sessionId,
                question=next_q,
                answer=None
            )
            print(f"[DEBUG] Next question generated: {next_q}")
        else:
            print(f"[DEBUG] Interview completed - max questions reached")
        
        return NextQuestionResponse(nextQuestion=next_q)
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"[ERROR] Exception occurred while generating next question:")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error generating next question: {str(e)}")


# ==================== Health Check ====================



@app.post("/generate-assessment", response_model=GenerateAssessmentResponse)
async def generate_assessment_endpoint(request: GenerateAssessmentRequest):
    """
    Generate interview assessment after all questions answered.
    Returns structured assessment with ratings and recommendations.
    """
    try:
        print(f"[DEBUG] Generating assessment for session: {request.sessionId}")
        
        # Create structured LLM for assessment
        structured_assessor = llm.with_structured_output(InterviewAssessment)
        
        # Prepare profile document
        profile_doc = {
            "resume_text": request.resumeText[:500],  # First 500 chars for context
            "seniority_level": request.seniorityLevel
        }
        
        # Format chat history
        chat_history = "\n\n".join([
            f"Q{i+1}: {qa.get('question', 'N/A')}\nA{i+1}: {qa.get('answer', 'N/A')}" 
            for i, qa in enumerate(request.transcript)
        ])
        
        print(f"[DEBUG] Transcript length: {len(chat_history)} characters")
        print(f"[DEBUG] Number of Q&A pairs: {len(request.transcript)}")
        
        # Prepare inputs for assessment
        inputs = {
            "difficulty_level": request.seniorityLevel,
            "profile_doc": json.dumps(profile_doc, indent=2),
            "chat_history": chat_history
        }
        
        # Generate assessment
        print("[DEBUG] Invoking assessment LLM...")
        chain = assessment_prompt | structured_assessor
        assessment = chain.invoke(inputs)
        
        # Convert Pydantic model to dict and map field names to match frontend
        assessment_dict = {
            "candidate_score_percent": assessment.candidate_score_percent,
            "hiring_recommendation": assessment.hiring_recommendation,
            "summary": f"{assessment.hiring_recommendation}. The candidate demonstrated {len(assessment.strengths)} key strengths.",
            "strengths": assessment.strengths,
            "weaknesses": assessment.improvement_areas,  # Map improvement_areas to weaknesses
            "recommendations": [assessment.next_steps] if isinstance(assessment.next_steps, str) else assessment.next_steps  # Map next_steps to recommendations
        }
        
        print(f"[DEBUG] Assessment generated successfully")
        print(f"[DEBUG] Score: {assessment_dict['candidate_score_percent']}/100")
        print(f"[DEBUG] Recommendation: {assessment_dict['hiring_recommendation']}")
        
        return GenerateAssessmentResponse(assessment=assessment_dict)
    
    except Exception as e:
        print(f"[ERROR] Exception occurred while generating assessment:")
        print(f"[ERROR] {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error generating assessment: {str(e)}")


# ==================== Health Check ====================

@app.get("/health")
async def health_check():

    """Health check endpoint."""
    return {
        "status": "healthy",
        "api_key_configured": bool(os.getenv("OPENAI_API_KEY")),
        "api_provider": "OpenAI"
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 5000))
    uvicorn.run(app, host="0.0.0.0", port=port)



