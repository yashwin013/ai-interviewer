from pydantic import BaseModel
from typing import List, Optional
# 1. START INTERVIEW
class StartInterviewRequest(BaseModel):
    userId: str


class StartInterviewResponse(BaseModel):
    sessionId: str
    message: str


# 2. INIT INTERVIEW (First Question)

class InitInterviewResponse(BaseModel):
    firstQuestion: str
    message: str

# 3. SUBMIT ANSWER → GET NEXT QUESTION

class AnswerRequest(BaseModel):
    questionNumber: int
    answer: str


class AnswerResponse(BaseModel):
    nextQuestionNumber: Optional[int]   
    nextQuestion: Optional[str]         
    message: str

class ResumeTextProfile(BaseModel):
    extracted_text: str
    chunks: List[str]
    file_path: str
