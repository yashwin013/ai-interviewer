"""
AI Agent FastAPI Service
Provides REST API endpoints for resume parsing and interview question generation
"""

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import os
import json
import logging
import time
import random
from dotenv import load_dotenv

import sqlite3
from memori import Memori

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("ai_agent")

# LangChain imports
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_openai import OpenAIEmbeddings

# OpenAI native client for Memori integration
from openai import OpenAI

# Session manager
from session_manager import session_manager

# Load environment variables
load_dotenv()

# ==================== Memori Setup ====================
from pymongo import MongoClient
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from app.config import settings

def get_memori_db():
    client = MongoClient(settings.MONGO_URI, tlsAllowInvalidCertificates=True)
    return client.get_database("memori_interviews")



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
    resumeText: Optional[str] = None  # Optional - AI agent uses cached data
    chunks: Optional[List[str]] = None  # Optional - AI agent uses cached data
    currentQuestionNumber: int
    currentAnswer: str


class NextQuestionResponse(BaseModel):
    nextQuestion: Optional[str]
    isComplete: bool = False  # True when interview is finished
    closingMessage: Optional[str] = None  # Farewell message when interview ends
    isRepeat: bool = False  # True if question is a repeat due to clarifying


class InterviewAssessment(BaseModel):
    """Assessment generated after interview completion."""
    candidate_score_percent: int = Field(description="Score from 0-100 based on answer quality")
    hiring_recommendation: str = Field(description="'Strongly Recommend', 'Recommend', 'Consider with Reservations', or 'Do Not Recommend'")
    strengths: List[str] = Field(description="3-5 specific strengths demonstrated in answers")
    improvement_areas: List[str] = Field(description="2-4 specific areas needing improvement")
    next_steps: str = Field(description="Recommended next steps for hiring process")
    answer_quality_analysis: str = Field(description="Brief analysis of answer depth and relevance")


class GenerateAssessmentRequest(BaseModel):
    sessionId: str
    resumeText: str
    chunks: List[str]
    transcript: List[Dict[str, str]]  # List of {question, answer} pairs
    seniorityLevel: str


class GenerateAssessmentResponse(BaseModel):
    assessment: Dict[str, Any]


# ==================== Global LLM Setup ====================

# Initialize Memori memory layer with OpenAI client registration FIRST
# This must happen before creating LangChain models so they can use the registered client
openai_client = None
memori = None

try:
    # Create native OpenAI client for Memori to track
    openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    # Initialize Memori with MongoDB connection
    # Memori automatically picks up MEMORI_API_KEY from environment variables
    memori = Memori(conn=get_memori_db)
    
    # Build storage schema (creates collections if not exist)
    memori.config.storage.build()
    
    # Register the OpenAI client with Memori for automatic conversation tracking
    # This enables Memori to intercept LLM calls and store conversations, facts, etc.
    memori.llm.register(openai_client)
    
    logger.info("Memori memory layer initialized and OpenAI client registered successfully")
except Exception as e:
    logger.warning(f"Memori initialization failed: {e}. Continuing without memory layer.")
    memori = None
    # If Memori fails, still create a regular OpenAI client
    if openai_client is None:
        openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Note: LangChain ChatOpenAI creates its own internal client
# Memori will track calls made through the registered openai_client directly
llm = ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0.7,
    api_key=os.getenv("OPENAI_API_KEY")
)

# Note: Embeddings not needed for current implementation, but keeping for future use
embeddings = OpenAIEmbeddings() if os.getenv("OPENAI_API_KEY") else None


# ==================== Memori Storage Helper ====================

def store_memory_via_llm(entity_id: str, memory_text: str, async_store: bool = True):
    """
    Store a memory by making a simple OpenAI call that Memori can intercept.
    This triggers Memori's Advanced Augmentation to extract facts.
    
    Args:
        entity_id: Usually the session ID to attribute the memory to
        memory_text: The text containing facts to store
        async_store: If True, run in background thread to avoid blocking
    """
    if not memori or not openai_client:
        logger.debug("Memori not available, skipping memory storage")
        return
    
    def _store():
        try:
            memori.attribution(entity_id=entity_id, process_id="mock-interviewer")
            # Make a simple completion that Memori will intercept and extract facts from
            openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a memory storage assistant. Acknowledge the information provided."},
                    {"role": "user", "content": memory_text}
                ],
                max_tokens=50  # Keep response short since we don't need it
            )
            logger.info(f"[MEMORI] Stored memory for entity {entity_id[:20]}...")
        except Exception as e:
            logger.warning(f"[MEMORI] Failed to store memory: {e}")
    
    if async_store:
        import threading
        thread = threading.Thread(target=_store, daemon=True)
        thread.start()
    else:
        _store()


def recall_memories(entity_id: str, query: str, limit: int = 5) -> str:
    """
    Recall relevant facts from Memori using semantic search.
    Returns formatted string of memories to inject into prompts.
    
    Args:
        entity_id: The entity (session/user) to recall memories for
        query: Search query for semantic matching
        limit: Maximum number of facts to retrieve
        
    Returns:
        Formatted string of relevant memories, or empty string if none found
    """
    if not memori:
        return ""
    
    try:
        memori.attribution(entity_id=entity_id, process_id="mock-interviewer")
        facts = memori.recall(query, limit=limit)
        
        if not facts:
            logger.debug(f"[MEMORI] No memories found for query: {query[:50]}...")
            return ""
        
        # Filter by similarity threshold and format
        memories = []
        for fact in facts:
            similarity = fact.get('similarity', 0)
            content = fact.get('content', '')
            
            # Only include facts with reasonable similarity
            if similarity > 0.25 and content:
                memories.append(f"• {content[:200]}")  # Limit length per fact
        
        if memories:
            logger.info(f"[MEMORI] Recalled {len(memories)} relevant facts for entity {entity_id[:20]}...")
            return "\n".join(memories[:5])  # Cap at 5 memories
        
        return ""
        
    except Exception as e:
        logger.warning(f"[MEMORI] Recall failed: {e}")
        return ""


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


def format_conversation_history(history: List[Dict[str, str]], keep_recent: int = 2) -> str:
    """
    Format conversation history with rolling summary to reduce prompt size.
    Keeps recent Q&A verbatim, summarizes older exchanges.
    
    This reduces prompt tokens by ~25-40% after 2 questions(for now).
    
    Args:
        history: List of {"question": str, "answer": str} dicts
        keep_recent: Number of recent Q&A pairs to keep in full
        
    Returns:
        Formatted string with summarized older history + full recent history
    """
    if not history:
        return "No previous conversation."
    
    # If short history, return everything
    if len(history) <= keep_recent:
        return _format_full_history(history)
    
    # Split into older (to summarize) and recent (keep full)
    older = history[:-keep_recent]
    recent = history[-keep_recent:]
    
    # Create compact summary of older exchanges
    topics_covered = []
    for qa in older:
        # Extract just the topic/theme of each question (first 40 chars)
        q_summary = qa.get('question', '')[:40].strip()
        if q_summary:
            topics_covered.append(q_summary + "...")
    
    summary_text = f"[Earlier: {len(older)} questions covered topics: {', '.join(topics_covered)}]\n\n"
    
    # Add full recent exchanges
    summary_text += "RECENT EXCHANGES:\n"
    summary_text += _format_full_history(recent)
    
    return summary_text


def _format_full_history(history: List[Dict[str, str]]) -> str:
    """Format Q&A history as readable text."""
    lines = []
    for i, qa in enumerate(history, 1):
        q = qa.get('question', 'No question')
        a = qa.get('answer', 'No answer')
        lines.append(f"Q{i}: {q}")
        lines.append(f"A{i}: {a}")
        lines.append("")
    return "\n".join(lines)


CLARIFY_TAG = "[CLARIFY]"


def is_clarifying_question(question: str) -> bool:
    """
    Check if a question is a clarifying follow-up (prefixed with [CLARIFY]).
    
    Args:
        question: The generated question text
        
    Returns:
        True if this is a clarifying question that shouldn't count toward quota
    """
    if not question:
        return False
    return question.strip().upper().startswith(CLARIFY_TAG)


def strip_clarify_tag(question: str) -> str:
    """
    Remove the [CLARIFY] tag from a question before sending to user.
    
    Args:
        question: The generated question (may contain [CLARIFY] prefix)
        
    Returns:
        Clean question without the tag
    """
    if not question:
        return question
    
    # Case-insensitive removal of the tag
    stripped = question.strip()
    if stripped.upper().startswith(CLARIFY_TAG):
        stripped = stripped[len(CLARIFY_TAG):].strip()
    return stripped


def get_relevant_resume_chunks(chunks: List[str], max_chunks: int = 3) -> str:
    """
    Get most relevant resume chunks to reduce context size.
    For now, uses first N chunks. Could be enhanced with semantic search.
    
    Args:
        chunks: All resume chunks
        max_chunks: Maximum chunks to include
        
    Returns:
        Concatenated relevant chunks
    """
    relevant = chunks[:max_chunks]
    total_chars = sum(len(c) for c in relevant)
    
    # Cap total size to ~2000 chars
    if total_chars > 2000:
        result = ""
        for chunk in relevant:
            if len(result) + len(chunk) > 2000:
                break
            result += chunk + "\n\n"
        return result
    
    return "\n\n".join(relevant)

def is_repeat_request(text: Optional[str]) -> bool:
    """
    Heuristic to detect if the user's reply requests the agent to repeat the current question.
    Returns True for phrases like "repeat", "can you repeat", "say that again", etc.
    """
    if not text:
        return False
    import re
    t = text.strip().lower()
    patterns = [
        r"\brepeat\b",
        r"say that again",
        r"can you repeat",
        r"could you repeat",
        r"one more time",
        r"please repeat",
        r"again please",
        r"what was the question",
        r"what is the question",
        r"repeat the question",
    ]
    for p in patterns:
        if re.search(p, t):
            return True
    return False




def parse_resume_from_chunks(resume_text: str, chunks: List[str]) -> Dict[str, Any]:
    """
    Parse resume from text chunks and extract candidate information using LLM.
    
    Args:
        resume_text: Full extracted resume text
        chunks: List of text chunks from the resume
        
    Returns:
        Dictionary with candidate information
    """
    start_time = time.time()
    logger.info("[RESUME_PARSE] Starting resume extraction...")
    
    # Improved prompt with XML delimiters and explicit fallback rules
    prompt = f"""Extract candidate information from the resume below.

<RESUME>
{resume_text[:8000]}
</RESUME>

EXTRACTION RULES:
1. If a field cannot be found, use "unknown" for strings or [] for arrays
2. Normalize email to lowercase
3. For LinkedIn: extract URL or just the username/profile path
4. For skills: Try to extract all skills, but adhere to the limit of top 15 most relevant
5. Determine seniority_level based on years of experience:
    - 0-1 years experience: "Fresher"
    - 1-3 years experience: "Junior"
    - 3-7 years experience: "Mid-Senior"
    - 7-12 years experience: "Senior"
    - 12+ years experience: "Lead"

Return a JSON object with EXACTLY these fields:
{{
    "candidate_first_name": "string or 'unknown'",
    "candidate_last_name": "string or 'unknown'",
    "candidate_email": "lowercase email or 'unknown'",
    "candidate_linkedin": "LinkedIn URL/username or 'unknown'",
    "experience": "brief summary of work experience (2-3 sentences)",
    "skills": ["array", "of", "technical", "skills"],
    "seniority_level": "one of: Fresher, Junior, Mid-Senior, Senior, Lead"
}}

Return ONLY valid JSON, no other text."""
    
    try:
        # Use JSON mode with OpenAI
        llm_json = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.3,  # Lower temperature for more consistent extraction
            api_key=os.getenv("OPENAI_API_KEY"),
            model_kwargs={"response_format": {"type": "json_object"}}
        )
        
        response = llm_json.invoke(prompt)
        result_json = json.loads(response.content)
        
        # Safely extract with fallbacks
        profile = {
            "candidate_first_name": result_json.get('candidate_first_name', 'unknown'),
            "candidate_last_name": result_json.get('candidate_last_name', 'unknown'),
            "name": f"{result_json.get('candidate_first_name', 'unknown')} {result_json.get('candidate_last_name', 'unknown')}",
            "email": result_json.get('candidate_email', 'unknown').lower() if result_json.get('candidate_email') else 'unknown',
            "linkedin": result_json.get('candidate_linkedin', 'unknown'),
            "experience": result_json.get('experience', 'No experience information available'),
            "skills": result_json.get('skills', [])[:15],  # Cap at 15 skills
            "seniority_level": result_json.get('seniority_level', 'Junior')
        }
        
        elapsed = time.time() - start_time
        logger.info(f"[RESUME_PARSE] Completed in {elapsed:.2f}s | Skills: {len(profile['skills'])} | Seniority: {profile['seniority_level']}")
        
        return clean_dictionary(profile)
        
    except Exception as e:
        elapsed = time.time() - start_time
        logger.error(f"[RESUME_PARSE] Failed after {elapsed:.2f}s: {str(e)}")
        
        # Return fallback profile instead of crashing
        return {
            "candidate_first_name": "unknown",
            "candidate_last_name": "unknown",
            "name": "Unknown Candidate",
            "email": "unknown",
            "linkedin": "unknown",
            "experience": "Could not extract experience",
            "skills": [],
            "seniority_level": "Junior"
        }


# ==================== Interview Prompt ====================

interviewer_prompt = ChatPromptTemplate.from_messages([
    ("system", """
    You are a friendly, experienced technical interviewer conducting a {max_questions}-question interview.
    
    CANDIDATE PROFILE:
    - Seniority Level: {seniority_level}
    - Resume Context: {resume_chunks}
    
    RECALLED MEMORIES (facts from earlier in this interview or previous sessions):
    {recalled_memories}
    
    MEMORY INTELLIGENCE RULES (VERY IMPORTANT):

    RESUME PRECEDENCE RULE (CRITICAL):
    - Resume Context defines WHAT topics must be covered
    - Recalled Memories define HOW deeply to explore a topic
    - Never skip a resume-relevant topic solely due to memory

    MEMORY PRIORITY:
    - Treat recalled memories as accurate, high-confidence facts
    - Use memories to deepen or continue resume-based topics
    - Never invent facts not present in memory bank or resume

    MEMORY → QUESTION STRATEGY:
    - Skills mentioned → ask deeper usage or edge cases
    - Experiences mentioned → ask decisions, trade-offs, outcomes
    - Preferences mentioned → validate with examples
    - Weaknesses mentioned → probe gently or pivot

    MEMORY ACKNOWLEDGMENT:
    - Reference memories subtly and naturally
    - Use short phrases like "Earlier you mentioned..."
    - Never mention memory systems or past sessions explicitly in the conversation

    MEMORY ABSENCE:
    - If no relevant memory exists, rely on resume context
    - Ask exploratory resume-based questions to create new memory

    MEMORY + CLARIFY:
    - Clarify only if answer conflicts with memory
    - Do not clarify answers that repeat known memory

    
    YOUR PERSONALITY:
    - Warm and encouraging, never intimidating
    - Professional but conversational
    - Patient and supportive
    - Sound like a real person having a conversation
    - Use natural, spoken language (you're, we'll, let's, I'd)
    
    SPEAKING STYLE (optimized for voice):
    - Try to keep questions under 25 words for clarity
    - Use simple, clear sentences
    - Speak naturally - use contractions
    - Avoid complex jargon unless necessary
    - Sound more like a realhuman, not like a robot
    - Use brief acknowledgments like "Great", "Interesting", "I see", "I understand", "Let's move ahead"

    QUESTION DIFFICULTY (STRICT):
    - Fresher: Basic concepts, simple scenarios, fundamentals
    - Junior: Practical application, common problems, hands-on tasks
    - Mid-level: System design, trade-offs, best practices, deeper reasoning
    - Senior: Architecture, leadership, complex decisions, end-to-end ownership
    
    
    QUESTION PLANNING RULE (IMPORTANT):
    - Decide the category of the next question BEFORE writing it
    - Use this mapping based on {total_questions_asked}:
    - Questions 1 to 2 → Experience / Background
    - Questions 3 to 4 → Technical (resume-based)
    - Questions 5 to 6 → Problem-solving
    - Final question → Behavioral / reflection
    - When the interview has MORE than 7 QUESTIONS, try to ask questions from technical, problem-solving areas only. The end question should always be behavioral/reflection. 
    - If {max_questions} < 7, still include AT LEAST one question from each category


    CONVERSATION FLOW RULES:
    - Acknowledge answers briefly when appropriate
    - If answer is excellent, give brief positive feedback
    - Keep the conversation flow natural, adhering to the speaking style and personality style provided to you.
    - Be encouraging throughout the interview conversation.
    - If candidate asks to repeat or clarify a question you asked, rephrase it slightly instead of repeating verbatim.
    
    CLARIFYING QUESTIONS (IMPORTANT):
    When the candidate gives ANY of these types of answers, you MUST ask a clarifying follow-up question just once:
    - One-word answers (e.g., "yes", "no", "maybe")
    - Very short/vague answers (under 5 words)
    - Off-topic or unclear responses
    
    Rules for Clarifying Questions:
    - PREFIX your question with [CLARIFY] tag (e.g., "[CLARIFY] Could you give me a specific example?")
    - Ask at most 1 clarifying follow-up per original question
    - Keep clarifying questions short and encouraging
    - Some example templates which you can use are: "[CLARIFY] Let me rephrase that - can you share a specific example?"
                                                    "[CLARIFY] I'd love to hear more. What was your approach?"
                                                    "[CLARIFY] No worries! How about we try a simpler version - have you worked with...?"
                                                    "[CLARIFY] I'd like to hear more about that. Can you elaborate?"
    
    CRITICAL RULES:
    - Strictly adhere to the question variety rules given to you. The interview must contain questions from all areas mentioned under "QUESTION VARIETY" section, with Technical and Experience-based questions making up the majority of the interview.
    
    
            
    
    - The second question you ask (when total_questions_asked == 1) should start with {candidate_first_name} (if available). Some examples, which can be used are: 
            *"Thanks, {candidate_first_name}. Can you elaborate on..."
            *"Great to meet you, {candidate_first_name}. Let's dive into..."
            *"Nice to hear that, {candidate_first_name}. Could you tell me more about..."

    - Never repeat questions unless it's a clarifying follow-up
    - Reference specific items from their resume when possible
    - Ask open-ended questions that encourage detailed answers
    - Keep questions conversational and natural for voice
    
    """),

    ("human", """
    INTERVIEW STATUS:
    Questions Asked: {total_questions_asked} / {max_questions}

    CONVERSATION HISTORY:
    {chat_history}

    INSTRUCTION:
    Generate ONLY the next question.
    Make it conversational and natural for voice.
    Avoid repeating previous topics unless a concise follow-up is required to clarify or deepen an earlier answer.
    
    ANALYZING THE LAST ANSWER:
    - If the last question was [CLARIFY] and the answer is still brief/vague → Move to a new topic (NO [CLARIFY] tag)
    - If the last answer was very brief (under 5 words) → Ask a [CLARIFY] question for elaboration
    - If the last answer was strong and detailed → Move to a new topic (NO [CLARIFY] tag)
    
    REMEMBER: 
    - [CLARIFY] questions do NOT count toward the main question count
    - Maximum 1 clarifying follow-ups per original question
    - Keep questions under 25 words
    """)
])


# ==================== Assessment Prompt ====================

assessment_prompt = ChatPromptTemplate.from_messages([
    ("system", """
    You are an expert Technical Hiring Manager with 15+ years of experience.
    Your task is to provide an ACCURATE and DIFFERENTIATED assessment based on actual answer quality.
    
    SCORING RUBRIC (be strict and accurate):
    
    90-100%: EXCEPTIONAL
    - Demonstrates deep expertise with specific examples
    - Answers go beyond the question with valuable insights
    - Shows leadership thinking and strategic perspective
    - Perfect communication and structure
    
    75-89%: STRONG
    - Solid technical knowledge with good examples
    - Clear, well-structured answers
    - Shows practical experience
    - Minor gaps in depth or breadth
    
    60-74%: COMPETENT
    - Adequate knowledge but lacks depth
    - Answers are correct but somewhat generic
    - Limited specific examples
    - Communication is clear but not compelling
    
    40-59%: DEVELOPING
    - Basic understanding with notable gaps
    - Answers are vague or lack specificity
    - Limited practical experience evident
    - Needs significant development
    
    0-39%: INSUFFICIENT
    - Major knowledge gaps
    - Incorrect or irrelevant answers
    - Poor communication
    - Not ready for this level
    
    SENIORITY EXPECTATIONS:
    - Fresher: Basic concepts, learning attitude, potential
    - Junior: Practical skills, can execute tasks independently
    - Mid-Senior: Deep expertise, can design solutions, mentors others
    - Senior: Strategic thinking, architecture decisions, leadership
    - Lead: Vision, cross-team impact, business alignment
    
    IMPORTANT: Score based on ACTUAL answer quality, not potential. Be specific in your analysis.
    """),
    ("human", """
    CANDIDATE PROFILE:
    {profile_doc}
    
    EXPECTED SENIORITY LEVEL: {difficulty_level}
    
    =====================
    INTERVIEW TRANSCRIPT
    =====================
    {chat_history}
    
    =====================
    ASSESSMENT INSTRUCTIONS
    =====================
    1. Evaluate EACH answer against the seniority expectations
    2. Note specific quotes that support your scoring
    3. Be ACCURATE - don't default to middle scores
    4. If answers are excellent, score 80+. If poor, score below 40.
    5. Provide actionable, specific feedback
    
    Generate a comprehensive assessment following the InterviewAssessment schema.
    """)
])


def generate_first_question(session_id: str, chunks: List[str], seniority_level: str, max_questions: int, candidate_first_name: str = "Candidate") -> str:
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
    start_time = time.time()
    logger.info(f"[{session_id}] Generating first question for {seniority_level}...")
    
    # Create interview chain
    interview_chain = interviewer_prompt | llm | StrOutputParser()
    
    # Use optimized resume context (limited chunks to reduce tokens)
    resume_context = get_relevant_resume_chunks(chunks, max_chunks=3)
    
    # Recall relevant memories for first question
    recalled = recall_memories(
        entity_id=session_id,
        query=f"candidate profile background skills {seniority_level}",
        limit=3
    )

    # Generate first question
    context = {
        "seniority_level": seniority_level,
        "max_questions": max_questions,
        "total_questions_asked": 0,
        "chat_history": "No previous conversation.",
        "resume_chunks": resume_context,
        "candidate_first_name": candidate_first_name,
        "recalled_memories": recalled if recalled else "No previous memories."
    }
    
    try:
        question = interview_chain.invoke(context)
        elapsed = time.time() - start_time
        logger.info(f"[{session_id}] First question generated in {elapsed:.2f}s")
        return question.strip()
    except Exception as e:
        elapsed = time.time() - start_time
        logger.error(f"[{session_id}] First question failed after {elapsed:.2f}s: {e}")
        return "Tell me about yourself and your background in technology."


def generate_next_question(
    session_id: str,
    chunks: List[str],
    seniority_level: str,
    max_questions: int,
    questions_asked: int,
    chat_history: str,
    conversation_history: List[Dict[str, str]] = None,
    candidate_first_name: str = "Candidate"
) -> Optional[str]:
    """
    Generate the next interview question based on previous Q&A and resume chunks.
    
    Uses rolling conversation summary to reduce prompt size by 25-40%.
    
    Args:
        session_id: Session identifier
        chunks: Resume text chunks for context
        seniority_level: Candidate's seniority level
        max_questions: Maximum questions for this interview
        questions_asked: Number of questions already asked
        chat_history: Full transcript of previous Q&A (used if conversation_history not provided)
        conversation_history: Structured list of Q&A dicts (preferred)
        
    Returns:
        Next question or None if interview should end
    """
    start_time = time.time()
    
    # ENFORCE max questions in code (don't rely on LLM)
    if questions_asked >= max_questions:
        logger.info(f"[{session_id}] Interview complete - reached {max_questions} questions")
        return None
    
    logger.info(f"[{session_id}] Generating question {questions_asked + 1}/{max_questions}...")
    
    # Create interview chain
    interview_chain = interviewer_prompt | llm | StrOutputParser()
    
    # OPTIMIZATION 1: Use limited resume chunks (not all)
    resume_context = get_relevant_resume_chunks(chunks, max_chunks=3)
    
    # OPTIMIZATION 2: Use rolling conversation summary if we have structured history
    if conversation_history:
        formatted_history = format_conversation_history(conversation_history, keep_recent=2)
    else:
        # Fallback to raw chat_history (less optimized)
        formatted_history = chat_history if chat_history else "No previous conversation."

    # Also provide the most recent Q/A explicitly so the model can focus follow-ups
    try:
        conv_full = session_manager.get_conversation_history(session_id)
    except Exception:
        conv_full = None

    if conv_full and len(conv_full) > 0:
        last_qa = conv_full[-1]
        last_question = last_qa.get("question", "")
        last_answer = last_qa.get("answer", "") or ""
    else:
        last_question = ""
        last_answer = ""

    # Recall relevant memories based on current context
    # We query for skills/experience related to the last answer or general seniority
    query_text = f"{seniority_level} skills experience {last_answer[:50]}"
    recalled = recall_memories(
        entity_id=session_id,
        query=query_text,
        limit=5
    )

    # Generate next question
    context = {
        "seniority_level": seniority_level,
        "max_questions": max_questions,
        "total_questions_asked": questions_asked,
        "chat_history": formatted_history,
        "last_question": last_question,
        "last_answer": last_answer,
        "resume_chunks": resume_context,
        "candidate_first_name": candidate_first_name,
        "recalled_memories": recalled if recalled else "No previous memories."
    }
    
    try:
        question = interview_chain.invoke(context)
        question = question.strip()
        
        # VALIDATION: Ensure question isn't too long (for voice)
        if len(question) > 200:
            question = question[:200].rsplit(' ', 1)[0] + "?"
            logger.warning(f"[{session_id}] Question truncated to 200 chars")
        
        elapsed = time.time() - start_time
        logger.info(f"[{session_id}] Question {questions_asked + 1} generated in {elapsed:.2f}s")
        return question
        
    except Exception as e:
        elapsed = time.time() - start_time
        logger.error(f"[{session_id}] Question generation failed after {elapsed:.2f}s: {e}")
        
        # Fallback question instead of crash
        fallback_questions = [
            "Can you tell me more about your experience with your primary technology?",
            "What's a challenging problem you've solved recently?",
            "How do you approach learning new technologies?",
            "Tell me about a project you're particularly proud of.",
        ]
        import random
        return random.choice(fallback_questions)


def stream_next_question(
    session_id: str,
    chunks: List[str],
    seniority_level: str,
    max_questions: int,
    questions_asked: int,
    chat_history: str
):
    """
    Stream the next interview question word-by-word for faster perceived response.
    Returns a generator that yields text chunks.
    """
    from langchain_core.output_parsers import StrOutputParser
    
    # Check if interview should end
    if questions_asked >= max_questions:
        return None
    
    # Create interview chain
    interview_chain = interviewer_prompt | llm | StrOutputParser()
    
    resume_context = "\n\n".join(chunks)
    
    context = {
        "seniority_level": seniority_level,
        "max_questions": max_questions,
        "total_questions_asked": questions_asked,
        "chat_history": chat_history,
        "resume_chunks": resume_context
    }
    
    # Stream the response
    for chunk in interview_chain.stream(context):
        yield chunk



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
    Initialize an interview session with instant introductory question.
    
    Flow:
    1. Immediately return intro question (no LLM call - instant!)
    2. Parse resume and generate first real question in background
    3. First question is ready when user finishes answering intro
    """
    import asyncio
    
    try:
        print(f"[DEBUG] Initializing interview for session: {request.sessionId}")

        if memori:
            memori.attribution(
                entity_id=request.sessionId,
                process_id="mock-interviewer"
            )
        
        # ===== INSTANT INTRO QUESTION =====
        #This requires NO LLM call - returns immediately!
        intro_question = (
            "Welcome! Before we begin with the interview, I would like to recommend you to sit in a quiet place with no disturbances. Please ensure that your microphone and speakers are working properly. During the interview, please answer the questions to the best of your ability. If you need me to repeat or clarify any question, feel free to ask. Let's get started!"
            "I'd like to get to know you a little better. "
            "Could you please introduce yourself and tell me what excites you most about your career?"
        )
        
        # Create a minimal session first (will be updated in background)
        session_manager.create_session(
            session_id=request.sessionId,
            resume_profile={"seniority_level": "Junior", "name": "", "skills": []},  # Placeholder
            chunks=request.chunks
        )
        
        # Store intro question in session
        session_manager.update_conversation(
            session_id=request.sessionId,
            question=intro_question,
            answer=None
        )
        
        print(f"[INSTANT] Returning intro question immediately!")
        print(f"[BACKGROUND] Starting resume parsing and Q1 generation in background...")
        
        # ===== BACKGROUND: Parse resume + Generate Q1 =====
        # This runs while user answers the intro question
        asyncio.create_task(
            generate_first_question_background(
                session_id=request.sessionId,
                resume_text=request.resumeText,
                chunks=request.chunks
            )
        )
        
        return InitInterviewResponse(question=intro_question)
        
    except Exception as e:
        import traceback
        print(f"[ERROR] Exception occurred while initializing interview:")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error initializing interview: {str(e)}")


async def generate_first_question_background(session_id: str, resume_text: str, chunks: List[str]):
    """
    Background task to parse resume and generate first real question.
    Runs while user answers the introductory question.
    """
    try:
        import time
        start_time = time.time()
        print(f"[BACKGROUND] Starting resume parsing for session {session_id}")
        
        # Parse resume (takes ~1-2 seconds)
        resume_profile = parse_resume_from_chunks(resume_text, chunks)
        
        elapsed = time.time() - start_time
        print(f"[BACKGROUND] Resume parsed in {elapsed:.2f}s")
        
        # Determine max questions based on seniority
        seniority = resume_profile.get('seniority_level', 'Junior').lower()
        if seniority == "fresher":
            max_questions = 5
        elif seniority == "junior":
            max_questions = 7
        else:
            max_questions = 10
        
        # Update session with actual profile
        session = session_manager.get_session(session_id)
        if session:
            session["resume_profile"] = resume_profile
            session["max_questions"] = max_questions
            print(f"[BACKGROUND] Session updated with profile: {resume_profile.get('seniority_level')}")
        
        # Store candidate profile in Memori
        skills_str = ', '.join(resume_profile.get('skills', [])[:10])  # Limit to 10 skills for memory
        memory_text = f"""
Candidate Profile for Interview:
- Name: {resume_profile.get('name', 'Unknown')}
- Email: {resume_profile.get('email', 'Unknown')}
- Seniority Level: {resume_profile.get('seniority_level', 'Unknown')}
- Key Skills: {skills_str}
- Experience Summary: {resume_profile.get('experience', 'No experience available')[:500]}
"""
        store_memory_via_llm(entity_id=session_id, memory_text=memory_text)
        
        # Generate first real question (takes ~1-2 seconds)
        print(f"[BACKGROUND] Generating first real question...")
        first_question = generate_first_question(
            session_id=session_id,
            chunks=chunks,
            seniority_level=resume_profile['seniority_level'],
            max_questions=max_questions,
            candidate_first_name=resume_profile.get('candidate_first_name', 'Candidate')
        )
        
        # Store as pre-generated question (will be used when user finishes intro)
        session_manager.set_pregenerated_question(session_id, first_question)
        
        total_elapsed = time.time() - start_time
        print(f"[BACKGROUND] First question pre-generated in {total_elapsed:.2f}s total")
        print(f"[BACKGROUND] Q1: {first_question[:100]}...")
        
    except Exception as e:
        print(f"[BACKGROUND ERROR] Failed to generate first question: {str(e)}")
        import traceback
        traceback.print_exc()


@app.post("/next-question", response_model=NextQuestionResponse)
async def next_question(request: NextQuestionRequest):
    """
    Generate the next interview question based on the candidate's answer.
    Uses pre-generated questions for instant response when available.
    """
    import asyncio
    import time
    
    try:
        start_time = time.time()
        print(f"[DEBUG] Generating next question for session: {request.sessionId}")

        if memori:
            memori.attribution(
                entity_id=request.sessionId,
                process_id="mock-interviewer"
            )
        
        # Get session data
        session = session_manager.get_session(request.sessionId)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Update conversation with the answer to current question
        # Use update_answer_only which correctly handles clarifying questions
        conversation = session_manager.get_conversation_history(request.sessionId)
        # If the user asked to repeat the current question, do NOT store this as the answer
        # and simply return the current question unchanged (do not increment question count).
        if conversation and len(conversation) > 0 and is_repeat_request(request.currentAnswer):
            last_qa = conversation[-1]
            repeat_q = last_qa.get("question") or ""
            prefix = ["Sure, I will repeat the question: ", "Sure, here is the question again: ", "No problem, my question was: "]
            print(f"[REPEAT] User requested repeat. Re-sending last question for session {request.sessionId}")
            return NextQuestionResponse(nextQuestion=f"{random.choice(prefix)}{repeat_q}", isRepeat=True)
        
        # Normal flow: record the candidate's answer for the last question if missing
        if conversation and len(conversation) > 0:
            last_qa = conversation[-1]
            if last_qa.get("answer") is None:
                # Use update_answer_only which checks is_clarifying flag
                session_manager.update_answer_only(
                    session_id=request.sessionId,
                    answer=request.currentAnswer
                )
                
                # Store Q&A exchange in Memori
                last_question = last_qa.get("question", "Unknown question")
                memory_text = f"""
Interview Q&A Exchange:
Question: {last_question[:500]}
Candidate's Answer: {request.currentAnswer[:1000]}
"""
                store_memory_via_llm(entity_id=request.sessionId, memory_text=memory_text)
        
        # Check for pre-generated question (instant response!)
        pregenerated = session_manager.get_pregenerated_question(request.sessionId)
        
        if pregenerated:
            # Use pre-generated question - nearly instant!
            next_q = pregenerated
            elapsed = time.time() - start_time
            print(f"[PREGEN] Used pre-generated question in {elapsed:.3f}s (instant!)")
        else:
            # No pre-generated question, generate normally
            questions_asked = session_manager.get_questions_asked(request.sessionId)
            max_questions = session_manager.get_max_questions(request.sessionId)
            resume_profile = session_manager.get_resume_profile(request.sessionId)
            chunks = session_manager.get_chunks(request.sessionId)
            
            if questions_asked >= max_questions:
                # Get candidate name for personalized closing
                candidate_name = resume_profile.get('candidate_first_name', '')
                if candidate_name and candidate_name.lower() != 'unknown':
                    closing = f"Thank you so much, {candidate_name}! That concludes our interview. You did a great job, and I really enjoyed our conversation. Best of luck!"
                else:
                    closing = "Thank you so much! That concludes our interview. You did a great job, and I really enjoyed our conversation.s Best of luck!"
                
                return NextQuestionResponse(
                    nextQuestion=None,
                    isComplete=True,
                    closingMessage=closing
                )
            
            conversation = session_manager.get_conversation_history(request.sessionId)
            chat_history = "\n\n".join([
                f"{qa['question']}\nA: {qa.get('answer', 'No answer yet')}"
                for qa in conversation
            ])
            
            next_q = generate_next_question(
                session_id=request.sessionId,
                chunks=chunks,
                seniority_level=resume_profile['seniority_level'],
                max_questions=max_questions,
                questions_asked=questions_asked,
                chat_history=chat_history,
                candidate_first_name=resume_profile.get('candidate_first_name', 'Candidate')
            )
            elapsed = time.time() - start_time
            print(f"[DEBUG] Generated question normally in {elapsed:.2f}s")
        
        if next_q:
            # Check if this is a clarifying question (shouldn't count toward quota)
            is_clarify = is_clarifying_question(next_q)
            
            # Count consecutive clarifying questions to prevent infinite loop
            conversation = session_manager.get_conversation_history(request.sessionId)
            consecutive_clarify = 0
            for qa in reversed(conversation):
                if qa.get("is_clarifying", False):
                    consecutive_clarify += 1
                else:
                    break
            
            # Force regular question after 2 consecutive clarifying questions
            MAX_CONSECUTIVE_CLARIFY = 2
            if is_clarify and consecutive_clarify >= MAX_CONSECUTIVE_CLARIFY:
                print(f"[CLARIFY] Hit max consecutive clarify limit ({MAX_CONSECUTIVE_CLARIFY}). Treating as regular question.")
                is_clarify = False
            
            if is_clarify:
                # Strip the [CLARIFY] tag before storing/returning
                next_q = strip_clarify_tag(next_q)
                print(f"[CLARIFY] Detected clarifying question ({consecutive_clarify + 1}/{MAX_CONSECUTIVE_CLARIFY}) - will NOT count toward quota")
                
                # Store clarifying question WITHOUT incrementing counter
                # We store it directly in session without using update_conversation's increment
                session_manager.add_clarifying_question(
                    session_id=request.sessionId,
                    question=next_q
                )
            else:
                # Regular question - store normally (will increment counter when answered)
                # Strip [CLARIFY] tag if present (in case we forced it to be regular)
                next_q = strip_clarify_tag(next_q)
                session_manager.update_conversation(
                    session_id=request.sessionId,
                    question=next_q,
                    answer=None
                )
            
            # Trigger background pre-generation for NEXT-NEXT question
            asyncio.create_task(
                pregenerate_next_question_background(request.sessionId)
            )
        else:
            # Interview is complete - provide closing message
            print(f"[DEBUG] Interview completed - max questions reached")
            resume_profile = session_manager.get_resume_profile(request.sessionId)
            candidate_name = resume_profile.get('candidate_first_name', '') if resume_profile else ''
            if candidate_name and candidate_name.lower() != 'unknown':
                closing = f"Thank you so much, {candidate_name}! That concludes our interview. You did a great job, and I really enjoyed our conversation. We'll be in touch soon with your results. Best of luck!"
            else:
                closing = "Thank you so much! That concludes our interview. You did a great job, and I really enjoyed our conversation. We'll be in touch soon with your results. Best of luck!"
            
            return NextQuestionResponse(
                nextQuestion=None,
                isComplete=True,
                closingMessage=closing
            )
        
        return NextQuestionResponse(nextQuestion=next_q, isComplete=False)
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"[ERROR] Exception occurred while generating next question:")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error generating next question: {str(e)}")


async def pregenerate_next_question_background(session_id: str):
    """Background task to pre-generate the next question while user is answering."""
    try:
        import asyncio
        # Small delay to let current response complete
        await asyncio.sleep(0.5)
        
        session = session_manager.get_session(session_id)
        if not session:
            return
        
        questions_asked = session_manager.get_questions_asked(session_id)
        max_questions = session_manager.get_max_questions(session_id)
        
        # Don't pre-generate if interview is about to end
        if questions_asked >= max_questions - 1:
            print(f"[PREGEN] Skipping pre-generation - interview near end")
            return
        
        resume_profile = session_manager.get_resume_profile(session_id)
        chunks = session_manager.get_chunks(session_id)
        conversation = session_manager.get_conversation_history(session_id)
        
        chat_history = "\n\n".join([
            f"{qa['question']}\nA: {qa.get('answer', 'No answer yet')}"
            for qa in conversation
        ])
        
        print(f"[PREGEN] Starting background pre-generation for session {session_id}")
        
        pregenerated_question = generate_next_question(
            session_id=session_id,
            chunks=chunks,
            seniority_level=resume_profile['seniority_level'],
            max_questions=max_questions,
            questions_asked=questions_asked + 1,  # For the NEXT question
            chat_history=chat_history,
            candidate_first_name=resume_profile.get('candidate_first_name', 'Candidate')
        )
        
        if pregenerated_question:
            session_manager.set_pregenerated_question(session_id, pregenerated_question)
            print(f"[PREGEN] Background pre-generation complete for session {session_id}")
    
    except Exception as e:
        print(f"[PREGEN ERROR] Background pre-generation failed: {str(e)}")


# ==================== Streaming Endpoint ====================

@app.post("/next-question-stream")
async def next_question_stream(request: NextQuestionRequest):
    """
    Stream the next interview question word-by-word for faster perceived response.
    Uses Server-Sent Events (SSE) format.
    """
    import time
    
    session = session_manager.get_session(request.sessionId)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Update conversation with answer
    conversation = session_manager.get_conversation_history(request.sessionId)
    # If user asked to repeat, stream the last question again and do not record an answer
    if conversation and len(conversation) > 0 and is_repeat_request(request.currentAnswer):
        last_qa = conversation[-1]
        repeat_q = last_qa.get("question", "") or ""
        # Stream the repeat as small chunks for SSE clients, with a spoken prefix
        prefix = ["Sure, I will repeat the question: ", "Certainlly, here is the question again: ", "Sure thing, here is the question again: "]
        full_text = f"{random.choice(prefix)}{repeat_q}"
        def repeat_generator():
            # Yield small chunks for better streaming behavior
            q = full_text
            chunk_size = 50
            for i in range(0, len(q), chunk_size):
                chunk = q[i:i+chunk_size]
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"

            yield f"data: {json.dumps({'done': True, 'fullQuestion': full_text.strip(), 'isRepeat': True})}\n\n"

        return StreamingResponse(
            repeat_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            }
        )

    # Normal flow: record the candidate's answer for the last question if missing
    if conversation and len(conversation) > 0:
        last_qa = conversation[-1]
        if last_qa.get("answer") is None:
            session_manager.update_conversation(
                session_id=request.sessionId,
                question=last_qa["question"],
                answer=request.currentAnswer
            )
    
    questions_asked = session_manager.get_questions_asked(request.sessionId)
    max_questions = session_manager.get_max_questions(request.sessionId)
    resume_profile = session_manager.get_resume_profile(request.sessionId)
    chunks = session_manager.get_chunks(request.sessionId)
    
    conversation = session_manager.get_conversation_history(request.sessionId)
    chat_history = "\n\n".join([
        f"{qa['question']}\nA: {qa.get('answer', 'No answer yet')}"
        for qa in conversation
    ])
    
    def generate():
        """Generator that streams the question."""
        full_question = ""
        
        for chunk in stream_next_question(
            session_id=request.sessionId,
            chunks=chunks,
            seniority_level=resume_profile['seniority_level'],
            max_questions=max_questions,
            questions_asked=questions_asked,
            chat_history=chat_history
        ):
            full_question += chunk
            # SSE format: data: <chunk>\n\n
            yield f"data: {json.dumps({'chunk': chunk})}\n\n"
        
        # Send completion signal with full question
        yield f"data: {json.dumps({'done': True, 'fullQuestion': full_question.strip()})}\n\n"
        
        # Store in session
        session_manager.update_conversation(
            session_id=request.sessionId,
            question=full_question.strip(),
            answer=None
        )
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


# ==================== Health Check ====================



@app.post("/generate-assessment", response_model=GenerateAssessmentResponse)
async def generate_assessment_endpoint(request: GenerateAssessmentRequest):
    """
    Generate interview assessment after all questions answered.
    Returns structured assessment with ratings and recommendations.
    """
    try:
        print(f"[DEBUG] Generating assessment for session: {request.sessionId}")

        if memori:
            memori.attribution(
                entity_id=request.sessionId,
                process_id="mock-interviewer"
            )
        
        # Create structured LLM for assessment
        structured_assessor = llm.with_structured_output(InterviewAssessment)
        
        # Prepare detailed profile document with more context
        profile_doc = {
            "resume_summary": request.resumeText[:2000],  # Include more resume context
            "seniority_level": request.seniorityLevel,
            "key_skills_from_resume": request.chunks[:3] if request.chunks else []  # First 3 resume chunks
        }
        
        # Format chat history with clear structure
        chat_history = "\n\n".join([
            f"QUESTION {i+1}:\n{qa.get('question', 'N/A')}\n\nCANDIDATE ANSWER {i+1}:\n{qa.get('answer', 'N/A')}" 
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
            "summary": f"{assessment.answer_quality_analysis} Overall recommendation: {assessment.hiring_recommendation}.",
            "strengths": assessment.strengths,
            "weaknesses": assessment.improvement_areas,
            "recommendations": [assessment.next_steps] if isinstance(assessment.next_steps, str) else assessment.next_steps,
            "answer_quality_analysis": assessment.answer_quality_analysis
        }
        
        print(f"[DEBUG] Assessment generated successfully")
        print(f"[DEBUG] Score: {assessment_dict['candidate_score_percent']}/100")
        print(f"[DEBUG] Recommendation: {assessment_dict['hiring_recommendation']}")
        
        # Store assessment results in Memori
        strengths_str = ', '.join(assessment_dict.get('strengths', [])[:5])
        weaknesses_str = ', '.join(assessment_dict.get('weaknesses', [])[:5])
        memory_text = f"""
Interview Assessment Results:
- Candidate Score: {assessment_dict['candidate_score_percent']}%
- Hiring Recommendation: {assessment_dict['hiring_recommendation']}
- Key Strengths: {strengths_str}
- Areas for Improvement: {weaknesses_str}
- Assessment Summary: {assessment_dict.get('answer_quality_analysis', 'No summary available')[:500]}
"""
        store_memory_via_llm(entity_id=request.sessionId, memory_text=memory_text)
        
        # Cleanup session cache after assessment is complete
        session_manager.delete_session(request.sessionId)
        print(f"[CACHE] Session {request.sessionId} cleaned up from cache")
        
        return GenerateAssessmentResponse(assessment=assessment_dict)
    
    except Exception as e:
        print(f"[ERROR] Exception occurred while generating assessment:")
        print(f"[ERROR] {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error generating assessment: {str(e)}")


# ==================== Resume Tips Endpoint (Minimal Tokens) ====================

class ResumeTipsRequest(BaseModel):
    score: int
    seniority: str
    skills: List[str]
    weak_areas: List[str]
    resume_excerpt: str


@app.post("/generate-resume-tips")
async def generate_resume_tips(request: ResumeTipsRequest):
    """
    Generate 3 personalized resume improvement tips.
    Uses minimal tokens (~250 total) for cost efficiency.
    """
    try:
        # Build a minimal, token-efficient prompt
        weak_areas_str = ", ".join(request.weak_areas) if request.weak_areas else "none identified"
        skills_str = ", ".join(request.skills[:5]) if request.skills else "not specified"
        
        prompt = f"""Resume Analysis:
- ATS Score: {request.score}%
- Level: {request.seniority}
- Skills: {skills_str}
- Weak Areas: {weak_areas_str}

Give exactly 3 specific, actionable tips to improve this resume.
Each tip must be 1 short sentence.
Focus on the weak areas.
Format: numbered list only, no intro."""

        # Use a lighter model or lower max_tokens for efficiency
        response = llm.invoke(prompt)
        
        # Parse the response into tips
        tips_text = response.content.strip()
        tips = [line.strip() for line in tips_text.split('\n') if line.strip()]
        
        # Clean up numbering if present
        cleaned_tips = []
        for tip in tips[:3]:
            # Remove leading numbers like "1.", "1)", etc.
            import re
            cleaned = re.sub(r'^[\d]+[\.\)\-\s]+', '', tip).strip()
            if cleaned:
                cleaned_tips.append(cleaned)
        
        return {
            "ai_tips": cleaned_tips[:3],
            "source": "ai",
            "tokens_used": "~250",
            "message": "Personalized tips based on your resume analysis"
        }
        
    except Exception as e:
        print(f"[ERROR] Failed to generate AI tips: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate tips: {str(e)}")


# ==================== Health Check ====================

@app.get("/health")
async def health_check():

    """Health check endpoint."""
    return {
        "status": "healthy",
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 5000))
    uvicorn.run(app, host="0.0.0.0", port=port)
