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
                    "timestamp": datetime.utcnow().isoformat(),
                    "is_clarifying": False  # Regular question
                })
                if answer:  # Only increment when answer is provided
                    self._sessions[session_id]["questions_asked"] += 1
                self._sessions[session_id]["last_accessed"] = datetime.utcnow()
    
    def add_clarifying_question(
        self, 
        session_id: str, 
        question: str
    ) -> None:
        """
        Add a clarifying question to conversation history WITHOUT incrementing the counter.
        Used for follow-up questions when candidate gives vague/skip answers.
        """
        with self._lock:
            if session_id in self._sessions:
                self._sessions[session_id]["conversation_history"].append({
                    "question": question,
                    "answer": None,
                    "timestamp": datetime.utcnow().isoformat(),
                    "is_clarifying": True  # Clarifying question - doesn't count
                })
                self._sessions[session_id]["last_accessed"] = datetime.utcnow()
                print(f"[CLARIFY] Added clarifying question for session {session_id} (NOT counted)")
    
    def update_answer_only(
        self, 
        session_id: str, 
        answer: str
    ) -> None:
        """
        Update only the answer of the last unanswered question WITHOUT incrementing the counter.
        Used for clarifying questions where we don't want to count toward the quota.
        
        Args:
            session_id: The session identifier
            answer: The candidate's answer
        """
        with self._lock:
            if session_id in self._sessions:
                history = self._sessions[session_id]["conversation_history"]
                # Find the last question without an answer
                for i in range(len(history) - 1, -1, -1):
                    if history[i].get("answer") is None:
                        history[i]["answer"] = answer
                        was_clarifying = history[i].get("is_clarifying", False)
                        if was_clarifying:
                            print(f"[CLARIFY] Updated answer for clarifying question (NOT counted)")
                        else:
                            # If it wasn't a clarifying question, increment the counter
                            self._sessions[session_id]["questions_asked"] += 1
                        break
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
    
    # ===== ERROR TRACKING METHODS =====
    def set_error(self, session_id: str, error: str) -> None:
        """Store an error in session state for graceful handling."""
        with self._lock:
            if session_id in self._sessions:
                self._sessions[session_id]["last_error"] = {
                    "message": error,
                    "timestamp": datetime.utcnow().isoformat()
                }
    
    def get_error(self, session_id: str) -> Optional[str]:
        """Get the last error for a session."""
        session = self.get_session(session_id)
        if session and "last_error" in session:
            return session["last_error"].get("message")
        return None
    
    def clear_error(self, session_id: str) -> None:
        """Clear the error state for a session."""
        with self._lock:
            if session_id in self._sessions and "last_error" in self._sessions[session_id]:
                del self._sessions[session_id]["last_error"]
    
    # ===== QUESTION TOPIC TRACKING (prevent duplicates) =====
    def add_question_topic(self, session_id: str, question: str) -> None:
        """Track question topics to prevent repetition."""
        with self._lock:
            if session_id in self._sessions:
                if "question_topics" not in self._sessions[session_id]:
                    self._sessions[session_id]["question_topics"] = []
                
                # Extract key words from question for topic matching
                topic = self._extract_topic(question)
                self._sessions[session_id]["question_topics"].append(topic)
    
    def is_duplicate_topic(self, session_id: str, question: str) -> bool:
        """Check if a question covers an already-asked topic."""
        session = self.get_session(session_id)
        if not session or "question_topics" not in session:
            return False
        
        new_topic = self._extract_topic(question)
        existing_topics = session["question_topics"]
        
        # Check for significant overlap
        for existing in existing_topics:
            overlap = len(set(new_topic) & set(existing))
            if overlap >= 3:  # 3+ words in common = duplicate
                return True
        return False
    
    def _extract_topic(self, question: str) -> List[str]:
        """Extract key topic words from a question."""
        # Remove common words and punctuation
        stop_words = {'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 
                      'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
                      'would', 'could', 'should', 'may', 'might', 'must', 'shall',
                      'can', 'about', 'your', 'you', 'me', 'tell', 'what', 'how',
                      'why', 'when', 'where', 'which', 'who', 'with', 'and', 'or',
                      'to', 'of', 'in', 'for', 'on', 'at', 'by', 'from', 'that',
                      'this', 'it', 'its', 'more', 'some', 'any', 'most'}
        
        words = question.lower().replace('?', '').replace('.', '').split()
        return [w for w in words if w not in stop_words and len(w) > 2]


# Global session manager instance
session_manager = SessionManager(session_timeout_minutes=120)
