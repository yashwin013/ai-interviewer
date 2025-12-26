"""
Session Manager for Interview State
Manages in-memory session state without using vectorstore
"""

from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import threading


class SessionManager:
    """Manages interview session state in-memory."""
    
    def __init__(self, session_timeout_minutes: int = 60):
        self._sessions: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.Lock()
        self.session_timeout = timedelta(minutes=session_timeout_minutes)
    
    def create_session(
        self, 
        session_id: str, 
        resume_profile: Dict[str, Any],
        chunks: List[str]
    ) -> None:
        """Create a new interview session."""
        with self._lock:
            self._sessions[session_id] = {
                "resume_profile": resume_profile,
                "chunks": chunks,
                "conversation_history": [],
                "questions_asked": 0,
                "max_questions": self._determine_max_questions(resume_profile),
                "created_at": datetime.utcnow(),
                "last_accessed": datetime.utcnow()
            }
    
    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get session data."""
        with self._lock:
            session = self._sessions.get(session_id)
            if session:
                session["last_accessed"] = datetime.utcnow()
            return session
    
    def update_conversation(
        self, 
        session_id: str, 
        question: str, 
        answer: Optional[str] = None
    ) -> None:
        """Add Q&A to conversation history."""
        with self._lock:
            if session_id in self._sessions:
                self._sessions[session_id]["conversation_history"].append({
                    "question": question,
                    "answer": answer,
                    "timestamp": datetime.utcnow().isoformat()
                })
                if answer:  # Only increment when answer is provided
                    self._sessions[session_id]["questions_asked"] += 1
                self._sessions[session_id]["last_accessed"] = datetime.utcnow()
    
    def get_conversation_history(self, session_id: str) -> List[Dict[str, str]]:
        """Get full conversation history for a session."""
        session = self.get_session(session_id)
        return session["conversation_history"] if session else []
    
    def get_questions_asked(self, session_id: str) -> int:
        """Get number of questions asked in session."""
        session = self.get_session(session_id)
        return session["questions_asked"] if session else 0
    
    def get_max_questions(self, session_id: str) -> int:
        """Get max questions for session."""
        session = self.get_session(session_id)
        return session["max_questions"] if session else 0
    
    def delete_session(self, session_id: str) -> None:
        """Delete a session."""
        with self._lock:
            if session_id in self._sessions:
                del self._sessions[session_id]
    
    def cleanup_expired_sessions(self) -> int:
        """Remove sessions that haven't been accessed recently."""
        with self._lock:
            now = datetime.utcnow()
            expired = [
                sid for sid, session in self._sessions.items()
                if now - session["last_accessed"] > self.session_timeout
            ]
            for sid in expired:
                del self._sessions[sid]
            return len(expired)
    
    def _determine_max_questions(self, resume_profile: Dict[str, Any]) -> int:
        """Determine max questions based on seniority level."""
        seniority = resume_profile.get("seniority_level", "Junior").lower()
        
        if seniority == "fresher":
            return 5
        elif seniority == "junior":
            return 7
        else:  # Mid-Senior, Senior, Lead
            return 10
    
    def get_chunks(self, session_id: str) -> List[str]:
        """Get resume chunks for a session."""
        session = self.get_session(session_id)
        return session["chunks"] if session else []
    
    def get_resume_profile(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get resume profile for a session."""
        session = self.get_session(session_id)
        return session["resume_profile"] if session else None
    
    # ===== PRE-GENERATION METHODS =====
    def set_pregenerated_question(self, session_id: str, question: str) -> None:
        """Store a pre-generated next question for faster response."""
        with self._lock:
            if session_id in self._sessions:
                self._sessions[session_id]["pregenerated_question"] = question
                print(f"[PREGEN] Stored pre-generated question for session {session_id}")
    
    def get_pregenerated_question(self, session_id: str) -> Optional[str]:
        """Get and consume the pre-generated question (returns None if not available)."""
        with self._lock:
            if session_id in self._sessions:
                question = self._sessions[session_id].pop("pregenerated_question", None)
                if question:
                    print(f"[PREGEN] Using pre-generated question for session {session_id}")
                return question
            return None
    
    def has_pregenerated_question(self, session_id: str) -> bool:
        """Check if a pre-generated question is available."""
        session = self.get_session(session_id)
        return session.get("pregenerated_question") is not None if session else False


# Global session manager instance
session_manager = SessionManager(session_timeout_minutes=120)
