from fastapi import APIRouter, HTTPException
from bson import ObjectId
from datetime import datetime

from app.db.mongo_clients import db
from app.services.ai_agent_client import ask_first_question, ask_next_question

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
    user = await db.users.find_one({"_id": user_obj_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

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
    }

    # Request first question
    try:
        ai_response = await ask_first_question(ai_payload)
        first_question = ai_response.get("question")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Agent Error: {str(e)}")

    if not first_question:
        raise HTTPException(status_code=500, detail="AI did not return a question")

    # Save first question to DB
    await db.interview_answers.insert_one({
        "sessionId": sessionId,
        "questionNumber": 1,
        "question": first_question,
        "answer": None,
        "createdAt": datetime.utcnow()
    })

    return InitInterviewResponse(
        firstQuestion=first_question,
        message="Interview initialized."
    )

@router.post("/answer/{sessionId}", response_model=AnswerResponse)
async def submit_answer(sessionId: str, payload: AnswerRequest):

    # Validate session ID
    try:
        session_obj_id = ObjectId(sessionId)
    except:
        raise HTTPException(status_code=400, detail="Invalid session ID format")

    session = await db.interview_sessions.find_one({"_id": session_obj_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

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
    }

    
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
