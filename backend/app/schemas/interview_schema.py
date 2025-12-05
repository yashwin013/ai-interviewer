from pydantic import BaseModel


class StartInterviewRequest(BaseModel):
    userId: str
    


class StartInterviewResponse(BaseModel):
    sessionId: str
    message: str

class AnswerRequest(BaseModel):
    questionNumber: int  # which question is being answered (1, 2, 3, ...)
    answer: str          # user's answer text


class AnswerResponse(BaseModel):
    nextQuestionNumber: int | None  # None if no more questions
    nextQuestion: str | None        # Next question text or None
    message: str
