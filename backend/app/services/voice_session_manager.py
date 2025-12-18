"""
Voice interview session manager.
Orchestrates the real-time voice interview pipeline: STT → LLM → Response
"""

import asyncio
from typing import Dict, Optional, Callable
from datetime import datetime
from bson import ObjectId

from app.db.mongo_clients import db
from app.services.realtime_stt import RealtimeSTTService
from app.services.ai_agent_client import ask_first_question, ask_next_question, generate_assessment


class VoiceSessionManager:
    """Manages a single voice interview session."""
    
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.stt_service: Optional[RealtimeSTTService] = None
        self.current_question_number = 0
        self.is_active = False
        self.current_transcript_buffer = ""
        self.is_processing = False
        
        # Transcript accumulation for complete answers
        self.accumulated_transcript = ""
        self.silence_timer: Optional[asyncio.Task] = None
        self.silence_duration = 6.0  # Wait 6 seconds of silence before processing answer
        
        # Callbacks
        self.on_question_ready: Optional[Callable[[str, int], None]] = None
        self.on_interview_complete: Optional[Callable[[dict], None]] = None
        self.on_error: Optional[Callable[[str], None]] = None
    
    async def initialize(self):
        """Initialize the session and get first question."""
        try:
            # Validate session exists
            session_obj_id = ObjectId(self.session_id)
            session = await db.interview_sessions.find_one({"_id": session_obj_id})
            
            if not session:
                raise ValueError(f"Session {self.session_id} not found")
            
            # Get user's resume profile
            user_id = session["userId"]
            user_obj_id = ObjectId(user_id)
            user = await db.users.find_one({"_id": user_obj_id})
            
            if not user:
                raise ValueError(f"User not found for session {self.session_id}")
            
            resume_profile = user.get("resumeProfile")
            if not resume_profile:
                raise ValueError("No resume uploaded for this user")
            
            # Store resume data for later use
            self.resume_text = resume_profile.get("extracted_text", "")
            self.chunks = resume_profile.get("chunks", [])
            self.user_id = user_id
            
            # Get first question from AI agent
            payload = {
                "sessionId": self.session_id,
                "resumeText": self.resume_text,
                "chunks": self.chunks
            }
            
            response = await ask_first_question(payload)
            first_question = response.get("question")
            
            # Save first question to database
            await db.interview_answers.insert_one({
                "sessionId": self.session_id,
                "questionNumber": 1,
                "question": first_question,
                "answer": None,
                "createdAt": datetime.utcnow()
            })
            
            self.current_question_number = 1
            self.is_active = True
            
            print(f"[SESSION {self.session_id}] Initialized with first question")
            
            return first_question
            
        except Exception as e:
            error_msg = f"Failed to initialize session: {str(e)}"
            print(f"[SESSION ERROR] {error_msg}")
            if self.on_error:
                await self.on_error(error_msg)
            raise
    
    async def start_stt(self):
        """Start the STT streaming service."""
        try:
            self.stt_service = RealtimeSTTService()
            
            await self.stt_service.start_streaming(
                on_transcript=self._handle_transcript,
                on_error=self._handle_stt_error
            )
            
            print(f"[SESSION {self.session_id}] STT streaming started")
            
        except Exception as e:
            error_msg = f"Failed to start STT: {str(e)}"
            print(f"[SESSION ERROR] {error_msg}")
            if self.on_error:
                await self.on_error(error_msg)
            raise
    
    async def process_audio_chunk(self, audio_data: bytes):
        """Process incoming audio chunk."""
        if not self.stt_service:
            raise Exception("STT service not started")
        
        try:
            await self.stt_service.send_audio(audio_data)
        except Exception as e:
            print(f"[SESSION ERROR] Failed to process audio: {str(e)}")
            if self.on_error:
                await self.on_error(str(e))
    
    async def _handle_transcript(self, text: str, is_final: bool):
        """Handle transcription results from STT with proper accumulation."""
        if not text.strip():
            return
        
        if is_final:
            # Accumulate final transcripts
            if self.accumulated_transcript:
                self.accumulated_transcript += " " + text
            else:
                self.accumulated_transcript = text
            
            print(f"[SESSION {self.session_id}] Accumulated: {self.accumulated_transcript}")
            
            # Cancel existing silence timer
            if self.silence_timer and not self.silence_timer.done():
                self.silence_timer.cancel()
            
            # Start new silence timer
            self.silence_timer = asyncio.create_task(self._silence_timeout())
        else:
            # Interim result - just log for debugging
            print(f"[SESSION {self.session_id}] Interim: {text}")
    
    async def _silence_timeout(self):
        """Wait for silence, then process the accumulated answer."""
        try:
            await asyncio.sleep(self.silence_duration)
            
            # Silence detected - process the complete answer
            if self.accumulated_transcript and not self.is_processing:
                complete_answer = self.accumulated_transcript.strip()
                print(f"[SESSION {self.session_id}] Complete answer after silence: {complete_answer}")
                
                # Reset accumulator
                self.accumulated_transcript = ""
                
                # Process the complete answer
                await self._process_answer(complete_answer)
        except asyncio.CancelledError:
            # Timer was cancelled because more speech came in
            print(f"[SESSION {self.session_id}] Silence timer cancelled (user still speaking)")
        except Exception as e:
            print(f"[SESSION ERROR] Silence timeout error: {str(e)}")

    
    async def _process_answer(self, answer: str):
        """Process user's answer and get next question."""
        if self.is_processing:
            print(f"[SESSION {self.session_id}] Already processing, skipping")
            return
        
        self.is_processing = True
        
        try:
            # Save the answer to current question
            await db.interview_answers.update_one(
                {"sessionId": self.session_id, "questionNumber": self.current_question_number},
                {"$set": {"answer": answer}}
            )
            
            print(f"[SESSION {self.session_id}] Saved answer for Q{self.current_question_number}")
            
            # Ask AI agent for next question
            print(f"[SESSION {self.session_id}] Requesting next question from AI agent...")
            import time
            start_time = time.time()
            
            payload = {
                "sessionId": self.session_id,
                "resumeText": self.resume_text,
                "chunks": self.chunks,
                "currentQuestionNumber": self.current_question_number,
                "currentAnswer": answer
            }
            
            response = await ask_next_question(payload)
            elapsed_time = time.time() - start_time
            print(f"[SESSION {self.session_id}] AI agent responded in {elapsed_time:.2f} seconds")
            
            next_question = response.get("nextQuestion")
            
            if not next_question:
                # Interview completed
                print(f"[SESSION {self.session_id}] Interview completed, generating assessment")
                await self._complete_interview()
            else:
                # Save next question
                next_q_number = self.current_question_number + 1
                
                await db.interview_answers.insert_one({
                    "sessionId": self.session_id,
                    "questionNumber": next_q_number,
                    "question": next_question,
                    "answer": None,
                    "createdAt": datetime.utcnow()
                })
                
                self.current_question_number = next_q_number
                
                print(f"[SESSION {self.session_id}] Next question (Q{next_q_number}): {next_question}")
                
                # Notify frontend
                if self.on_question_ready:
                    await self.on_question_ready(next_question, next_q_number)
            
        except Exception as e:
            error_msg = f"Failed to process answer: {str(e)}"
            print(f"[SESSION ERROR] {error_msg}")
            if self.on_error:
                await self.on_error(error_msg)
        finally:
            self.is_processing = False
    
    async def _complete_interview(self):
        """Complete the interview and generate assessment."""
        try:
            # Get all Q&A pairs
            all_qa_pairs = await db.interview_answers.find(
                {"sessionId": self.session_id}
            ).sort("questionNumber", 1).to_list(length=None)
            
            transcript = [
                {"question": qa.get("question", ""), "answer": qa.get("answer", "")}
                for qa in all_qa_pairs if qa.get("answer")
            ]
            
            # Get user for resume profile
            user = await db.users.find_one({"_id": ObjectId(self.user_id)})
            resume_profile = user.get("resumeProfile", {})
            
            # Generate assessment
            assessment_payload = {
                "sessionId": self.session_id,
                "resumeText": self.resume_text,
                "chunks": self.chunks,
                "transcript": transcript,
                "seniorityLevel": resume_profile.get("seniority_level", "Mid-Senior")
            }
            
            assessment_response = await generate_assessment(assessment_payload)
            assessment_data = assessment_response.get("assessment", {})
            
            # Update session status
            await db.interview_sessions.update_one(
                {"_id": ObjectId(self.session_id)},
                {
                    "$set": {
                        "status": "completed",
                        "completedAt": datetime.utcnow()
                    }
                }
            )
            
            # Save results
            result_doc = {
                "userId": self.user_id,
                "sessionId": self.session_id,
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
            
            await db.results.insert_one(result_doc)
            
            self.is_active = False
            
            print(f"[SESSION {self.session_id}] Assessment completed and saved")
            
            # Notify frontend
            if self.on_interview_complete:
                await self.on_interview_complete(assessment_data)
            
        except Exception as e:
            error_msg = f"Failed to complete interview: {str(e)}"
            print(f"[SESSION ERROR] {error_msg}")
            if self.on_error:
                await self.on_error(error_msg)
    
    async def _handle_stt_error(self, error: str):
        """Handle STT errors."""
        print(f"[SESSION {self.session_id}] STT Error: {error}")
        if self.on_error:
            await self.on_error(f"STT Error: {error}")
    
    async def cleanup(self):
        """Clean up session resources."""
        if self.stt_service:
            await self.stt_service.stop_streaming()
        
        self.is_active = False
        print(f"[SESSION {self.session_id}] Cleaned up")


# Active sessions registry
_active_sessions: Dict[str, VoiceSessionManager] = {}


def get_session(session_id: str) -> Optional[VoiceSessionManager]:
    """Get an active session."""
    return _active_sessions.get(session_id)


def create_session(session_id: str) -> VoiceSessionManager:
    """Create a new voice session."""
    session = VoiceSessionManager(session_id)
    _active_sessions[session_id] = session
    return session


async def remove_session(session_id: str):
    """Remove and cleanup a session."""
    session = _active_sessions.pop(session_id, None)
    if session:
        await session.cleanup()
