from fastapi import APIRouter, HTTPException, UploadFile, File
from bson import ObjectId
from datetime import datetime
import tempfile
import os
from openai import OpenAI

from app.db.mongo_clients import db
from app.services.ai_agent_client import ask_first_question, ask_next_question
<<<<<<< HEAD
=======
from app.config import settings
>>>>>>> ac34ecb8c408d76a300d6a884b6ad3c131614131

from app.schemas.interview_schema import (
    StartInterviewRequest,
    StartInterviewResponse,
    InitInterviewResponse,
    AnswerRequest,
    AnswerResponse
)

router = APIRouter(tags=["Interview"])

@router.post("/start", response_model=StartInterviewResponse)
async def start_interview(payload: StartInterviewRequest):

    # Validate userId
    try:
        user_obj_id = ObjectId(payload.userId)
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID format")

    # User must exist
<<<<<<< HEAD
=======
    user = await db.users.find_one({"_id": user_obj_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Create a new interview session
    session_doc = {
        "userId": payload.userId,
        "status": "active",
        "createdAt": datetime.utcnow(),
        "completedAt": None
    }

    result = await db.interview_sessions.insert_one(session_doc)
    session_id = str(result.inserted_id)

    return StartInterviewResponse(
        sessionId=session_id,
        message="Interview session created successfully."
    )


@router.post("/init/{sessionId}", response_model=InitInterviewResponse)
async def init_interview(sessionId: str):

    # Validate sessionId
    try:
        session_obj_id = ObjectId(sessionId)
    except:
        raise HTTPException(status_code=400, detail="Invalid session ID format")

    # Session must exist
    session = await db.interview_sessions.find_one({"_id": session_obj_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Get user's resume profile
    user_id = session["userId"]
    try:
        user_obj_id = ObjectId(user_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID in session")

>>>>>>> ac34ecb8c408d76a300d6a884b6ad3c131614131
    user = await db.users.find_one({"_id": user_obj_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

<<<<<<< HEAD
    # Resume must be uploaded before starting interview
    if not user.get("resumeProfile"):
        raise HTTPException(
            status_code=400,
            detail="Resume not uploaded. Please upload your resume first."
        )

    # Create new interview session
    session_doc = {
        "userId": payload.userId,
        "resumeProfile": user["resumeProfile"],  # contains extracted_text + chunks
        "status": "initiated",
        "createdAt": datetime.utcnow()
    }

    result = await db.interview_sessions.insert_one(session_doc)

    return StartInterviewResponse(
        sessionId=str(result.inserted_id),
        message="Interview session created successfully."
    )


@router.post("/init/{sessionId}", response_model=InitInterviewResponse)
async def init_interview(sessionId: str):

    # Validate session ID
    try:
        session_obj_id = ObjectId(sessionId)
    except:
        raise HTTPException(status_code=400, detail="Invalid session ID format")

    # Ensure session exists
    session = await db.interview_sessions.find_one({"_id": session_obj_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    resume_profile = session.get("resumeProfile")
    if not resume_profile:
        raise HTTPException(status_code=400, detail="Resume profile missing.")

    # Build payload for AI Agent
    ai_payload = {
        "sessionId": sessionId,
        "resumeText": resume_profile.get("extracted_text"),
        "chunks": resume_profile.get("chunks")
=======
    resume_profile = user.get("resumeProfile")
    if not resume_profile:
        raise HTTPException(status_code=400, detail="No resume uploaded for this user")

    # Extract chunks and text
    chunks = resume_profile.get("chunks", [])
    resume_text = resume_profile.get("extracted_text", "")

    if not chunks:
        raise HTTPException(status_code=400, detail="Resume chunks not found")

    # Call AI agent to get first question
    payload = {
        "sessionId": sessionId,
        "resumeText": resume_text,
        "chunks": chunks
>>>>>>> ac34ecb8c408d76a300d6a884b6ad3c131614131
    }
    response = await ask_first_question(payload)
    first_question = response.get("question")

<<<<<<< HEAD
    # Request first question
    try:
        ai_response = await ask_first_question(ai_payload)
        first_question = ai_response.get("question")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Agent Error: {str(e)}")

    if not first_question:
        raise HTTPException(status_code=500, detail="AI did not return a question")

    # Save first question to DB
=======
    # Save first question in database
>>>>>>> ac34ecb8c408d76a300d6a884b6ad3c131614131
    await db.interview_answers.insert_one({
        "sessionId": sessionId,
        "questionNumber": 1,
        "question": first_question,
        "answer": None,
        "createdAt": datetime.utcnow()
    })

    return InitInterviewResponse(
        firstQuestion=first_question,
<<<<<<< HEAD
        message="Interview initialized."
    )

@router.post("/answer/{sessionId}", response_model=AnswerResponse)
async def submit_answer(sessionId: str, payload: AnswerRequest):

    # Validate session ID
=======
        message="Interview initialized successfully."
    )


@router.post("/answer/{sessionId}", response_model=AnswerResponse)
async def submit_answer(sessionId: str, payload: AnswerRequest):

    # Validate sessionId
>>>>>>> ac34ecb8c408d76a300d6a884b6ad3c131614131
    try:
        session_obj_id = ObjectId(sessionId)
    except:
        raise HTTPException(status_code=400, detail="Invalid session ID format")

    # Session must exist
    session = await db.interview_sessions.find_one({"_id": session_obj_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

<<<<<<< HEAD
    resume_profile = session.get("resumeProfile")
    if not resume_profile:
        raise HTTPException(status_code=400, detail="Missing resume profile.")

    result = await db.interview_answers.update_one(
        {"sessionId": sessionId, "questionNumber": payload.questionNumber},
        {
            "$set": {
                "answer": payload.answer,
                "updatedAt": datetime.utcnow()
            }
        }
    )

    # In case question doc didn't exist (edge-case)
    if result.matched_count == 0:
        await db.interview_answers.insert_one({
            "sessionId": sessionId,
            "questionNumber": payload.questionNumber,
            "question": None,
            "answer": payload.answer,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        })

    
    ai_payload = {
        "sessionId": sessionId,
        "resumeText": resume_profile.get("extracted_text"),
        "chunks": resume_profile.get("chunks"),
        "currentQuestionNumber": payload.questionNumber,
        "currentAnswer": payload.answer
=======
    # Get user's resume profile
    user_id = session["userId"]
    try:
        user_obj_id = ObjectId(user_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID in session")

    user = await db.users.find_one({"_id": user_obj_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    resume_profile = user.get("resumeProfile")
    if not resume_profile:
        raise HTTPException(status_code=400, detail="No resume uploaded for this user")

    # Extract chunks and text
    chunks = resume_profile.get("chunks", [])
    resume_text = resume_profile.get("extracted_text", "")

    # 1. Save the user's answer to the current question
    current_q_number = payload.questionNumber
    user_answer = payload.answer

    # Update the answer for the current question
    await db.interview_answers.update_one(
        {"sessionId": sessionId, "questionNumber": current_q_number},
        {"$set": {"answer": user_answer}}
    )

    # 2. Ask AI agent for the next question
    payload = {
        "sessionId": sessionId,
        "resumeText": resume_text,
        "chunks": chunks,
        "currentQuestionNumber": current_q_number,
        "currentAnswer": user_answer
>>>>>>> ac34ecb8c408d76a300d6a884b6ad3c131614131
    }
    response = await ask_next_question(payload)
    next_question = response.get("nextQuestion")

<<<<<<< HEAD
<<<<<<< HEAD
    
    try:
        ai_response = await ask_next_question(ai_payload)
        next_question = ai_response.get("nextQuestion")
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI Agent Error: {str(e)}"
        )

    if not next_question:
        return AnswerResponse(
            nextQuestion=None,
            nextQuestionNumber=None,
            message="Interview completed."
        )

    next_q_number = payload.questionNumber + 1
=======
    # 3. If no next question, mark interview as completed
=======
    # 3. If no next question, mark interview as completed and generate assessment
>>>>>>> 00704b1aff7843ddd94eb3a15aca4bfa0876d6d5
    if not next_question:
        # Get all Q&A pairs for assessment
        all_qa_pairs = await db.interview_answers.find(
            {"sessionId": sessionId}
        ).sort("questionNumber", 1).to_list(length=None)
        
        # Build transcript for assessment
        transcript = [
            {"question": qa.get("question", ""), "answer": qa.get("answer", "")}
            for qa in all_qa_pairs if qa.get("answer")
        ]
        
        print(f"[ASSESSMENT] Generating assessment for {len(transcript)} Q&A pairs")
        
        # Call AI agent for assessment
        assessment_payload = {
            "sessionId": sessionId,
            "resumeText": resume_text,
            "chunks": chunks,
            "transcript": transcript,
            "seniorityLevel": resume_profile.get("seniority_level", "Mid-Senior")
        }
        
        try:
            from app.services.ai_agent_client import generate_assessment
            assessment_response = await generate_assessment(assessment_payload)
            assessment_data = assessment_response.get("assessment", {})
            print(f"[ASSESSMENT] Generated successfully: {assessment_data.get('candidate_score_percent')}/100")
        except Exception as e:
            print(f"[ASSESSMENT ERROR] {str(e)}")
            assessment_data = None
        
        # Save assessment to session
        await db.interview_sessions.update_one(
            {"_id": session_obj_id},
            {
                "$set": {
                    "status": "completed",
                    "completedAt": datetime.utcnow()
                }
            }
        )
        
        # Save results to dedicated results collection
        if assessment_data:
            result_doc = {
                "userId": user_id,
                "sessionId": sessionId,
                "candidateName": user.get("name", ""),
                "candidateEmail": user.get("email", ""),
                "assessment": assessment_data,
                "transcript": transcript,
                "resumeProfile": {
                    "seniorityLevel": resume_profile.get("seniority_level", "Mid-Senior"),
                    "skills": resume_profile.get("skills", []),
                    "experience": resume_profile.get("experience", [])
                },
                "createdAt": datetime.utcnow()
            }
            
            result = await db.results.insert_one(result_doc)
            print(f"[RESULTS] Saved to results collection with ID: {result.inserted_id}")
        
        return AnswerResponse(
            nextQuestion=None,
            nextQuestionNumber=None,
            message="Interview completed successfully.",
            assessment=assessment_data
        )

    # 4. Save next question in database
    next_q_number = current_q_number + 1
>>>>>>> ac34ecb8c408d76a300d6a884b6ad3c131614131

    # Save next question in database
    await db.interview_answers.insert_one({
        "sessionId": sessionId,
        "questionNumber": next_q_number,
        "question": next_question,
        "answer": None,
        "createdAt": datetime.utcnow()
    })

    
    # 5. Return next question
    return AnswerResponse(   
        nextQuestion=next_question,
        nextQuestionNumber=next_q_number,
        message="Next question generated."
    )


#======================= WHISPER API TRANSCRIPTION ======================

@router.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    """
    Transcribe audio using OpenAI Whisper API.
    
    Accepts audio file (webm, mp3, wav, etc.)
    Returns transcribed text for voice-based interviews.
    """
    # Initialize OpenAI client
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    
    # Validate file type
    allowed_types = ['audio/webm', 'audio/mp3', 'audio/wav', 'audio/mpeg', 'audio/ogg']
    if audio.content_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid audio format. Allowed: webm, mp3, wav, mpeg, ogg"
        )
    
    # Check file size (Whisper max: 25MB)
    MAX_FILE_SIZE = 25 * 1024 * 1024  # 25MB
    content = await audio.read()
    
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Audio file too large. Maximum size: 25MB. Try recording a shorter answer."
        )
    
    # Save uploaded audio to temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
        tmp.write(content)
        tmp_path = tmp.name
    
    print(f"\n[TRANSCRIBE DEBUG]")
    print(f"Audio file size: {len(content)} bytes")
    print(f"Temp file path: {tmp_path}")
    
    try:
        # Transcribe with Whisper API
        with open(tmp_path, "rb") as audio_file:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language="en",  # Specify language for better accuracy
                response_format="text"
            )
        
        # Check if transcription is empty or too short
        transcribed_text = transcript.strip() if isinstance(transcript, str) else transcript.text.strip()
        
        print(f"Transcribed text: '{transcribed_text}'")
        print(f"Text length: {len(transcribed_text)} characters")
        print(f"[END TRANSCRIBE DEBUG]\n")
        
        if not transcribed_text or len(transcribed_text) < 3:
            return {
                "text": "",
                "success": False,
                "error": "No speech detected. Please speak louder or check your microphone."
            }
        
        return {
            "text": transcribed_text,
            "success": True
        }
    
    except Exception as e:
        print(f"Transcription error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Transcription failed: {str(e)}"
        )
    
    finally:
        # Clean up temporary file
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except:
                pass  # Ignore cleanup errors
