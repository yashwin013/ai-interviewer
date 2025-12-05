class SummaryModel:
    """
    Final interview summary generated after user clicks 'Finish Interview'.
    Includes scores, strengths, weaknesses, etc.
    """

    def __init__(
        self,
        sessionId: str,
        overallScore: int,
        technicalScore: int,
        communicationScore: int,
        strengths,
        weaknesses,
        recommendedTopics,
    ):
        self.sessionId = sessionId
        self.overallScore = overallScore
        self.technicalScore = technicalScore
        self.communicationScore = communicationScore
        self.strengths = strengths
        self.weaknesses = weaknesses
        self.recommendedTopics = recommendedTopics

    def to_dict(self):
        return {
            "sessionId": self.sessionId,
            "overallScore": self.overallScore,
            "technicalScore": self.technicalScore,
            "communicationScore": self.communicationScore,
            "strengths": self.strengths,
            "weaknesses": self.weaknesses,
            "recommendedTopics": self.recommendedTopics,
        }
