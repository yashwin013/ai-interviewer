"""
Unified Interview Pipeline with FastAPI and FastRTC for Real-Time Voice Interview
- Integrates original pipeline with web-based real-time audio via WebRTC.
- Resume upload -> Voice interview -> Assessment -> PDF download.
- Uses OpenAI for STT (Whisper) and TTS.
- Assumes single session for simplicity; extend for multi-user with session IDs.

Installation:
pip install fastapi uvicorn fastrtc openai langchain-openai langchain-core pydantic reportlab pypdf soundfile numpy

Run: uvicorn this_file:app --reload
Access: http://localhost:8000
"""

import os
import json
import tempfile
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from fastapi import FastAPI, UploadFile, File, HTTPException, Response
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastrtc import Stream, ReplyOnPause
import numpy as np
import soundfile as sf
from openai import OpenAI

# LangChain imports (assuming installed)
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_community.document_loaders import PyPDFLoader
from langchain_core.documents import Document
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings

# PDF generator imports
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch

# === Data Models (from original) ===
class ResumeData(BaseModel):
    """Extract candidate information."""
    candidate_first_name: str = Field(description="Candidate's First Name.")
    candidate_last_name: str = Field(description="Candidate's Last Name.")
    candidate_email: str = Field(description="Candidate's Email.")
    candidate_linkedin: str = Field(description="Candidate's LinkedIn.")
    experience: str = Field(description="Candidate's work experience.")
    skills: List[str] = Field(description="Key skills for the candidate.")
    seniority_level: str = Field(description="One of: Fresher, Junior, Mid-Senior, Senior, Lead.")

class InterviewAssessment(BaseModel):
    """Generating the assessment and recommendations after the interview."""
    candidate_score_percent: str = Field(description="Score for the candidate out of 100.")
    hiring_recommendation: str = Field(description="Hiring recommendation: 'Definitely Hire!', 'Proceed with caution', 'Dont hire'")
    strengths: List[str] = Field(description="Strengths the candidate displayed.")
    improvement_areas: List[str] = Field(description="Improvement areas.")
    next_steps: str = Field(description="Suggested next steps.")

# === Interview State (adapted for session) ===
class InterviewState(BaseModel):
    profile: Optional[Dict[str, Any]] = None
    vectorstore: Optional[Any] = None
    transcript: List[Dict[str, str]] = []
    questions_asked: int = 0
    max_questions: int = 0
    assessment: Optional[Dict[str, Any]] = None
    pdf_path_out: Optional[str] = None

# Global state for simplicity (single user); use dict with session IDs for multi-user
state = InterviewState()

# Configure LLMs & embeddings
llm_main = ChatOpenAI(model="gpt-4o-mini")  # Use mini for speed
embeddings = OpenAIEmbeddings()
openai_client = OpenAI()

# Build prompt templates (from original)
interviewer_system = """
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
"""
interviewer_human = """
INTERVIEW STATUS:
Questions Asked: {total_questions_asked} / {max_questions}

TRANSCRIPT SO FAR:
{chat_history}

INSTRUCTION:
Generate ONLY the next question.
Avoid repeating previous questions.
Make each new question cover a *new area* if possible.
"""
interviewer_prompt = ChatPromptTemplate.from_messages([
    ("system", interviewer_system),
    ("human", interviewer_human),
])

assessment_system = """
You are an experienced Hiring Manager and Technical Assessor. Analyze the interview transcript and the candidate profile and generate a structured assessment JSON conforming to the InterviewAssessment schema.
"""
assessment_human = """
CANDIDATE PROFILE:
{profile_doc}

--- COMPLETE INTERVIEW TRANSCRIPT ---
{chat_history}
"""
assessment_prompt = ChatPromptTemplate.from_messages([
    ("system", assessment_system),
    ("human", assessment_human),
])

# === Helper Functions ===
def extract_resume(pdf_path: str) -> Dict[str, Any]:
    """Extract profile using ResumeData structured output LLM."""
    loader = PyPDFLoader(pdf_path)
    pages = loader.load()
    resume_text = "\n".join([p.page_content for p in pages])

    structured_llm = llm_main.with_structured_output(ResumeData)
    prompt_text = f"Extract the candidate's information from the resume below:\n\n{resume_text}"
    result = structured_llm.invoke(prompt_text)

    profile = result.dict()

    # Build simple Document list for vectorstore (optional)
    documents = [
        Document(page_content=f"Name: {profile['candidate_first_name']} {profile['candidate_last_name']}"),
        Document(page_content=f"Email: {profile['candidate_email']}"),
        Document(page_content=f"LinkedIn: {profile['candidate_linkedin']}"),
        Document(page_content=f"Experience: {profile['experience']}"),
        Document(page_content=f"Skills: {', '.join(profile['skills'])}"),
        Document(page_content=f"Seniority: {profile['seniority_level']}"),
    ]
    vectorstore = FAISS.from_documents(documents=documents, embedding=embeddings)
    return {"profile": profile, "vectorstore": vectorstore}

def generate_next_question():
    """Generate next interview question using LLM."""
    chat_history_text = "\n".join(
        [f"Interviewer: {qa['q']}\nCandidate: {qa['a']}" for qa in state.transcript]
    )
    inputs = {
        "seniority_level": state.profile["seniority_level"],
        "total_questions_asked": state.questions_asked,
        "max_questions": state.max_questions,
        "chat_history": chat_history_text
    }
    interview_chain = interviewer_prompt | llm_main | StrOutputParser()
    return interview_chain.invoke(inputs)

def generate_assessment() -> Dict[str, Any]:
    """Generate assessment using structured LLM."""
    structured_assessor = llm_main.with_structured_output(InterviewAssessment)
    inputs = {
        "profile_doc": json.dumps(state.profile, indent=2),
        "chat_history": "\n".join([f"Q: {qa['q']}\nA: {qa['a']}" for qa in state.transcript])
    }
    chain = assessment_prompt | structured_assessor
    assessment = chain.invoke(inputs)
    return assessment.dict()

def generate_pdf(filename: str):
    styles = getSampleStyleSheet()
    story = []

    title = Paragraph(f"<b>Final Candidate Assessment for {state.profile['candidate_first_name']} {state.profile['candidate_last_name']}</b>", styles["Title"])
    story.append(title)
    story.append(Spacer(1, 0.3 * inch))

    story.append(Paragraph(f"<b>Overall Score:</b> {state.assessment['candidate_score_percent']}/100", styles["Normal"]))
    story.append(Paragraph(f"<b>Hiring Recommendation:</b> {state.assessment['hiring_recommendation']}", styles["Normal"]))
    story.append(Spacer(1, 0.2 * inch))

    story.append(Paragraph("<b>Key Strengths:</b>", styles["Heading3"]))
    for s in state.assessment["strengths"]:
        story.append(Paragraph(f"• {s}", styles["Normal"]))
    story.append(Spacer(1, 0.2 * inch))

    story.append(Paragraph("<b>Areas for Improvement:</b>", styles["Heading3"]))
    for i in state.assessment["improvement_areas"]:
        story.append(Paragraph(f"• {i}", styles["Normal"]))
    story.append(Spacer(1, 0.2 * inch))

    story.append(Paragraph("<b>Suggested Next Steps:</b>", styles["Heading3"]))
    story.append(Paragraph(state.assessment["next_steps"], styles["Normal"]))

    pdf = SimpleDocTemplate(filename, pagesize=letter)
    pdf.build(story)
    return filename

# === FastRTC Handler for Voice Interview ===
def voice_interview_handler(audio_chunks):
    # Determine max questions if not set
    if state.max_questions == 0:
        seniority = state.profile.get("seniority_level", "mid").lower()
        state.max_questions = 5 if seniority == "fresher" else 7 if seniority == "junior" else 10

    for sample_rate, audio_np in audio_chunks:
        if state.questions_asked >= state.max_questions:
            yield (sample_rate, np.zeros((1, 1), dtype=np.int16))  # Silent audio to end
            break

        # Transcribe incoming audio (user answer)
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            sf.write(tmp.name, audio_np.flatten(), sample_rate)
            tmp_path = tmp.name

        with open(tmp_path, "rb") as audio_file:
            transcription = openai_client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file
            ).text

        os.remove(tmp_path)

        # Add to transcript (assuming previous Q was asked)
        if state.transcript and "a" not in state.transcript[-1]:
            state.transcript[-1]["a"] = transcription
        else:
            # If first, perhaps skip or handle intro
            pass

        # Generate next question
        question = generate_next_question()
        state.transcript.append({"q": question})
        state.questions_asked += 1

        # TTS the question
        tts_response = openai_client.audio.speech.create(
            model="tts-1",
            voice="alloy",
            input=question
        )
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp_tts:
            tts_response.write_to_file(tmp_tts.name)
            tmp_tts_path = tmp_tts.name

        # Load MP3 as numpy array (convert to WAV-like)
        data, sr = sf.read(tmp_tts_path)
        audio_array = (data * 32767).astype(np.int16)  # To 16-bit
        os.remove(tmp_tts_path)

        yield (sr, audio_array.reshape(-1, 1))  # Yield audio back

    # After interview, generate assessment and PDF
    state.assessment = generate_assessment()
    state.pdf_path_out = generate_pdf("assessment.pdf")

# Wrap handler with ReplyOnPause for turn-taking
stream = Stream(
    modality="audio",
    mode="send-receive",
    handler=ReplyOnPause(voice_interview_handler),
)

"""
# === FastAPI App ===
app = FastAPI()

# Mount static files for PDF download
app.mount("/static", StaticFiles(directory="."), name="static")

@app.post("/upload_resume")
async def upload_resume(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files allowed")
    
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(await file.read())
        pdf_path = tmp.name
    
    extraction = extract_resume(pdf_path)
    state.profile = extraction["profile"]
    state.vectorstore = extraction["vectorstore"]
    state.transcript = []
    state.questions_asked = 0
    state.max_questions = 0  # Reset
    os.remove(pdf_path)
    
    return {"message": "Resume processed. Start interview via WebRTC."}

@app.get("/assessment_pdf")
async def get_assessment_pdf():
    if not state.pdf_path_out or not os.path.exists(state.pdf_path_out):
        raise HTTPException(status_code=404, detail="Assessment not ready")
    return FileResponse(state.pdf_path_out, media_type="application/pdf", filename="assessment.pdf")

@app.get("/")
async def home():
    return stream.ui

# Mount FastRTC stream (handles WebRTC/WebSockets)
stream.mount(app)
"""

stream.ui.launch(share = False, server_name = "0.0.0.0", server_port = 8000)
