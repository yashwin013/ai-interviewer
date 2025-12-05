from datetime import datetime
from typing import Optional, Dict


class InterviewSessionModel:
    """
    Represents one interview session in MongoDB.

    We store:
    - userId (optional)
    - interviewMode (text or voice)
    - resumeProfile (filled after resume is parsed)
    - status (initiated, in_progress, completed)
    - createdAt (timestamp)
    """

    def __init__(
        self,
        userId: Optional[str],
        interviewMode: str,
        resumeProfile: Optional[Dict] = None,
        status: str = "initiated",
        createdAt: datetime = datetime.utcnow(),
    ):
        self.userId = userId
        self.interviewMode = interviewMode
        self.resumeProfile = resumeProfile
        self.status = status
        self.createdAt = createdAt

    def to_dict(self):
        """Convert class to dictionary to store in MongoDB."""
        return {
            "userId": self.userId,
            "interviewMode": self.interviewMode,
            "resumeProfile": self.resumeProfile,
            "status": self.status,
            "createdAt": self.createdAt,
        }
