from fastapi import APIRouter, HTTPException
from bson import ObjectId
from datetime import datetime

from app.db.mongo_clients import db
from app.services.ai_agent_client import post_to_agent

from app.constants.endpoints import AI_INIT_INTERVIEW, AI_NEXT_QUESTION
from app.schemas.interview_schema import StartInterviewRequest, AnswerRequest, AnswerResponse

router = APIRouter(tags=["Interview"])


# 1. START INTERVIEW
@router.post("/start")
async def start_interview(payload: StartInterviewRequest):

    # Validate userId
    try:
        user_obj_id = ObjectId(payload.userId)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID format")

    user = await db.users.find_one({"_id": user_obj_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Ensure resume exists
    if not user.get("resumeProfile"):
        raise HTTPException(
            status_code=400,
            detail="Please upload your resume before starting the interview."
        )

    # Create interview session
    session_doc = {
        "userId": payload.userId,
        "resumeProfile": user["resumeProfile"],
        "status": "initiated",
        "createdAt": datetime.utcnow()
    }

    result = await db.interview_sessions.insert_one(session_doc)

    return {
        "sessionId": str(result.inserted_id),
        "message": "Interview session created successfully."
    }


# 2. INIT INTERVIEW (First question)
@router.post("/init/{sessionId}")
async def init_interview(sessionId: str):

    try:
        session_obj_id = ObjectId(sessionId)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid session ID format")

    session = await db.interview_sessions.find_one({"_id": session_obj_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.get("resumeProfile") is None:
        raise HTTPException(
            status_code=400,
            detail="Resume profile missing in this session."
        )

    payload = {
        "sessionId": sessionId,
        "resumeProfile": session["resumeProfile"]
    }

    try:
        ai_response = await post_to_agent(AI_INIT_INTERVIEW, payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Agent Error: {str(e)}")

    first_question = ai_response.get("question")

    if not first_question:
        raise HTTPException(status_code=500, detail="AI did not generate a question")

    # Store first question
    answer_doc = {
        "sessionId": sessionId,
        "questionNumber": 1,
        "question": first_question,
        "answer": None,
        "createdAt": datetime.utcnow()
    }

    await db.interview_answers.insert_one(answer_doc)

    return {
        "message": "Interview initialized",
        "firstQuestion": first_question
    }

# 3. SUBMIT ANSWER → GET NEXT QUESTION
@router.post("/answer/{sessionId}", response_model=AnswerResponse)
async def submit_answer(sessionId: str, payload: AnswerRequest):
    """
    1. Save user's answer for a question
    2. Ask AI agent for the next question (or mock if unavailable)
    3. Store the next question in DB
    4. Return the next question
    """

    # Validate session
    try:
        session_obj_id = ObjectId(sessionId)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid session ID format")

    session = await db.interview_sessions.find_one({"_id": session_obj_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Save answer to DB
    result = await db.interview_answers.update_one(
        {
            "sessionId": sessionId,
            "questionNumber": payload.questionNumber
        },
        {
            "$set": {
                "answer": payload.answer,
                "updatedAt": datetime.utcnow()
            }
        }
    )

    # If no answer doc exists yet, create it
    if result.matched_count == 0:
        await db.interview_answers.insert_one({
            "sessionId": sessionId,
            "questionNumber": payload.questionNumber,
            "question": None,
            "answer": payload.answer,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        })

    # Prepare payload for AI agent
    ai_payload = {
        "sessionId": sessionId,
        "resumeProfile": session.get("resumeProfile"),
        "currentQuestionNumber": payload.questionNumber,
        "currentAnswer": payload.answer
    }

    # Call AI Agent
    try:
        ai_response = await post_to_agent(AI_NEXT_QUESTION, ai_payload)
        next_question = ai_response.get("nextQuestion")
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI Agent Error: {str(e)}. Make sure AI Agent is running on port 5000."
        )

    # If no question is returned → interview finished
    if not next_question:
        return AnswerResponse(
            nextQuestion=None,
            nextQuestionNumber=None,
            message="Answer saved. No further questions."
        )

    # Next question number
    next_q_number = payload.questionNumber + 1

    # Store next question in DB
    await db.interview_answers.insert_one({
        "sessionId": sessionId,
        "questionNumber": next_q_number,
        "question": next_question,
        "answer": None,
        "createdAt": datetime.utcnow()
    })

    # Return next question to frontend
    return AnswerResponse(
        nextQuestion=next_question,
        nextQuestionNumber=next_q_number,
        message="Answer saved. Next question generated."
    )
