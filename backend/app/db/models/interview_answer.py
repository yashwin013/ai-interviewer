class InterviewAnswerModel:
    """
    Stores each question & answer pair during the interview.
    The AI agent generates the questions one by one.
    """

    def __init__(
        self,
        sessionId: str,
        questionNumber: int,
        question: str,
        answer: str = None,
        suggestions=None,
        metrics=None,
    ):
        self.sessionId = sessionId
        self.questionNumber = questionNumber
        self.question = question
        self.answer = answer
        self.suggestions = suggestions
        self.metrics = metrics

    def to_dict(self):
        return {
            "sessionId": self.sessionId,
            "questionNumber": self.questionNumber,
            "question": self.question,
            "answer": self.answer,
            "suggestions": self.suggestions,
            "metrics": self.metrics,
        }
