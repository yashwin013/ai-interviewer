"""
Unified Interview Pipeline (LangGraph-style orchestration)
- Extract resume -> Interview loop -> Assessment -> PDF
- Single orchestrator coordinates all steps (like a single agent)
- Uses ChatOpenAI structured outputs (ResumeData, InterviewAssessment)

Notes:
- Adjust model names, API keys (OPENAI_API_KEY env var or your provider config) as required.
- Optional audio (TTS/STT) uses gTTS, playsound, sounddevice, SpeechRecognition; errors handled gracefully.
"""

import os
import json
import tempfile
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
# New imports added on 8th December(Mainly for vectorstore). May or may not be used.
#from qdrant_client import QdrantClient
from langchain_community.vectorstores import Qdrant
from app.services.Similarity_Jobs import Job_Matcher

# === External LLM / embeddings imports ===
try:
    from langchain_openai import ChatOpenAI, OpenAIEmbeddings
    from langchain_core.prompts import ChatPromptTemplate
    from langchain_core.output_parsers import StrOutputParser
    from langchain_community.document_loaders import PyPDFLoader
    from langchain_core.documents import Document
    from langchain_community.vectorstores import FAISS
except Exception as e:
    print("Warning: Some langchain-related imports failed. Ensure required packages are installed.")
    print("Import error (non-fatal now):", e)


# === Optional audio imports ===
AUDIO_AVAILABLE = True
try:
    from gtts import gTTS
    from playsound3 import playsound
    import speech_recognition as sr
    import sounddevice as sd
    import numpy as np
    from scipy.io.wavfile import write
except Exception as e:
    AUDIO_AVAILABLE = False
    # Will continue but audio functions will be no-ops or fallback to text input.
    print("Audio libraries missing or failed to import. Audio features will be disabled. Error:", e)

# === PDF generator imports ===
try:
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.units import inch
except Exception as e:
    print("Warning: reportlab not installed. PDF generation will fail unless installed. Error:", e)


# ---------------------------
# === Data Models
# ---------------------------
class ResumeData(BaseModel):
    """Extract candidate information."""
    candidate_first_name: str = Field(description="Candidate's First Name.")
    candidate_last_name: str = Field(description="Candidate's Last Name.")
    candidate_email: str = Field(description="Candidate's Email.")
    candidate_linkedin: str = Field(description="Candidate's LinkedIn.")
    experience: str = Field(description="Candidate's work experience.")
    skills: List[str] = Field(description="Key skills for the candidate.")
    seniority_level: str = Field(description="One of: Fresher, Junior, Mid-Senior, Senior, Lead.")


class InterviewAssessment(BaseModel):
    """Generating the assessment and recommendations after the interview."""
    candidate_score_percent: str = Field(description="Score for the candidate out of 100.")
    hiring_recommendation: str = Field(description="Hiring recommendation: 'Definitely Hire!', 'Proceed with caution', 'Dont hire'")
    strengths: List[str] = Field(description="Strengths the candidate displayed.")
    improvement_areas: List[str] = Field(description="Improvement areas.")
    next_steps: str = Field(description="Suggested next steps.")


# ---------------------------
# === Simple Orchestrator (Graph-like)
# ---------------------------
class InterviewState(BaseModel):
    pdf_path: str
    profile: Optional[Dict[str, Any]] = None
    vectorstore: Optional[Any] = None
    transcript: List[Dict[str, str]] = []
    questions_asked: int = 0
    max_questions: int = 0
    assessment: Optional[Dict[str, Any]] = None
    pdf_path_out: Optional[str] = None
    job_match: Optional[Dict[str, Any]] = None  # Injecting the job_matched status


class Orchestrator:
    """Single orchestrator that runs pipeline nodes sequentially."""
    def __init__(self, llm_main=None, llm_fallback=None, embeddings=None, use_audio=False):
        # llm_main: model for structured outputs
        # llm_fallback: smaller LLM to generate questions if desired
        self.llm = llm_main
        self.llm_fallback = llm_fallback or llm_main
        self.embeddings = embeddings
        self.use_audio = use_audio and AUDIO_AVAILABLE

        # Build prompt templates used in original file (adapted)
        self._build_prompts()
        # Job Matching
        self.job_matching = Job_Matcher(self.embeddings) # Initializing the Job Matcher object with model's embeddings

    def _build_prompts(self):
        # Interviewer prompt template
        interviewer_system = """
        The candidate has a seniority of: {seniority_level}.

        YOUR PRIMARY GOAL:
        - Conduct an interview of exactly {max_questions} questions.
        - The difficulty of questions MUST match the seniority level:
            - Fresher: simple, conceptual, basics
            - Junior: basic practical + scenario
            - Mid-level: deeper, practical, applied reasoning
            - Senior: architecture-level, ownership, end-to-end thinking  

        SECONDARY GOAL:
        Ask a balanced variety of:
        1. Experience-based
        2. Skill-based
        3. Behavioral/Profile-based

        RULE:
        - If total_questions_asked == 0, you MUST ask an introductory question:
        """
        interviewer_human = """
        INTERVIEW STATUS:
        Questions Asked: {total_questions_asked} / {max_questions}

        TRANSCRIPT SO FAR:
        {chat_history}

        INSTRUCTION:
        Generate ONLY the next question.
        Avoid repeating previous questions.
        Make each new question cover a *new area* if possible.
        """

        self.interviewer_prompt = ChatPromptTemplate.from_messages([
            ("system", interviewer_system),
            ("human", interviewer_human),
        ])

        # Assessment prompt
        assessment_system = """
        You are an experienced Hiring Manager and Technical Assessor. Analyze the interview transcript and the candidate profile and generate a structured assessment JSON conforming to the InterviewAssessment schema.
        """
        assessment_human = """
        CANDIDATE PROFILE:
        {profile_doc}

        --- COMPLETE INTERVIEW TRANSCRIPT ---
        {chat_history}
        """
        self.assessment_prompt = ChatPromptTemplate.from_messages([
            ("system", assessment_system),
            ("human", assessment_human),
        ])

    # --------------------
    # TTS
    # --------------------
    
    def _speak(self, text):
        from gtts import gTTS
        from playsound3 import playsound
        import tempfile, os

        tts = gTTS(text=text, lang="en")
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
            tts.save(tmp.name)
            playsound(tmp.name)
            os.remove(tmp.name)

    # --------------------
    # STT
    # --------------------
    def _listen_for_answer(self, duration=8):
        import sounddevice as sd
        import numpy as np
        from scipy.io.wavfile import write
        import speech_recognition as sr
        import tempfile, os

        sample_rate = 16000
        print(f"🎙️ Recording for {duration} seconds...")

        audio = sd.rec(int(duration * sample_rate),
                       samplerate=sample_rate, channels=1, dtype='float64')
        sd.wait()

        audio_int16 = np.int16(audio * 32767)

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            write(tmp.name, sample_rate, audio_int16) # Creating a temporary soundfile using numpy audio file
            wavfile = tmp.name

        recognizer = sr.Recognizer()
        with sr.AudioFile(wavfile) as source:
            data = recognizer.record(source) # Collecting the sound data
            text = recognizer.recognize_google(data) # Converting the data into text for the llm to know what user has actually said

        os.remove(wavfile)
        return text    

    # ---------------------------
    # Node: Resume extraction
    # ---------------------------
    def extract_resume(self, pdf_path: str) -> Dict[str, Any]:
        """Extract profile using ResumeData structured output LLM."""
        print(f"\n[extract_resume] Loading PDF from: {pdf_path}")
        # Load PDF text
        try:
            loader = PyPDFLoader(pdf_path)
            pages = loader.load()
            resume_text = "\n".join([p.page_content for p in pages])
        except Exception as e:
            raise RuntimeError(f"Failed to load PDF: {e}")

        # Use structured LLM to extract
        if not self.llm:
            raise RuntimeError("LLM not configured; cannot extract resume.")

        structured_llm = self.llm.with_structured_output(ResumeData)
        prompt_text = f"Extract the candidate's information from the resume below:\n\n{resume_text}"

        print("[extract_resume] Invoking LLM to extract structured resume info...")
        try:
            result = structured_llm.invoke(prompt_text)
        except Exception as e:
            raise RuntimeError(f"LLM extraction failed: {e}")

        profile = {
            "candidate_first_name": result.candidate_first_name,
            "candidate_last_name": result.candidate_last_name,
            "candidate_email": result.candidate_email,
            "candidate_linkedin": result.candidate_linkedin,
            "experience": result.experience,
            "skills": result.skills,
            "seniority_level": result.seniority_level
        }

        # Build simple Document list for vectorstore (optional)
        documents = [
            Document(page_content=f"Name: {profile['candidate_first_name']} {profile['candidate_last_name']}",
                     metadata={"type": "name", "value": f"{profile['candidate_first_name']} {profile['candidate_last_name']}"}
                     ),
            Document(page_content=f"Email: {profile['candidate_email']}",
                     metadata={"type": "email", "value": profile['candidate_email']}),
            Document(page_content=f"LinkedIn: {profile['candidate_linkedin']}",
                     metadata={"type": "linkedin", "value": profile['candidate_linkedin']}),
            Document(page_content=f"Experience: {profile['experience']}",
                     metadata={"type": "experience", "value": profile['experience']}),
            Document(page_content=f"Skills: {profile['skills']}",
                     metadata={"type": "skills", "value": profile['skills']}),
            Document(page_content=f"Seniority: {profile['seniority_level']}",
                     metadata={"type": "seniority", "value": profile['seniority_level']}),
        ]

        vectorstore = None
        if self.embeddings is not None:
            try:
                vectorstore = FAISS.from_documents(documents=documents, embedding=self.embeddings)
            except Exception as e:
                print("[extract_resume] Warning: FAISS creation failed:", e)

        return {"profile": profile, "vectorstore": vectorstore}

    # ---------------------------
    # Node: Updating state for missing skills, matched skills, etc
    # ---------------------------
    def skills_updation(self, state: InterviewState, jd_text: str, jd_skills: list):
        """
           Run resume ↔ job matching and store results in state
        """

        result = self.job_matching.match(
            profile = state.profile,
            jd_text = jd_text,
            jd_skills = jd_skills
        )

        state.job_match = result         
        return state

    # ---------------------------
    # Node: Interview loop (question generation + answers)
    # ---------------------------
    def run_interview_loop(self, state: InterviewState):
        """Interview loop with TTS (gTTS) + STT (sounddevice) + optional typed answers."""

        # Determine max questions based on seniority
        # Kept it experimental => can be changed accordingly
        seniority = state.profile.get("seniority_level", "mid").lower()
        if seniority == "fresher":
            max_q = 5
        elif seniority == "junior":
            max_q = 7
        else:
            max_q = 10
        state.max_questions = max_q # Pushing max number of questions in state

        print(f"\n[run_interview_loop] Starting interview for {state.profile.get('candidate_first_name', 'Candidate')} ({state.profile.get('seniority_level')})")
        print(f"[run_interview_loop] Total Questions: {state.max_questions}\n")

        while state.questions_asked < state.max_questions:

            # Build chat-history for LLM
            chat_history_text = "\n".join(
                [f"Interviewer: {qa['q']}\nCandidate: {qa['a']}" for qa in state.transcript]
            )

            inputs = {
                "seniority_level": state.profile["seniority_level"],
                "total_questions_asked": state.questions_asked,
                "max_questions": state.max_questions,
                "chat_history": chat_history_text
            }

            # Generate question
            try:
                interview_chain = self.interviewer_prompt | self.llm | StrOutputParser() # Defining the interview chain
                question = interview_chain.invoke(inputs) # Invoking the chain
                
            except Exception as e:
                print("[run_interview_loop] LLM failed, fallback question used.")
                question = f"[Fallback] Please tell me about your experience. (Q{state.questions_asked+1})"

            qnum = state.questions_asked + 1 # Incrementing the question count by 1
            print("\n" + "="*60)
            print(f"❓ Question {qnum}/{state.max_questions}")
            print("Interviewer:", question)

            # Speak question via TTS
            if AUDIO_AVAILABLE:
                try:
                    self._speak(question)
                except Exception as e:
                    print("[TTS Error]:", e)
            
            # After speaking question, the user will have 2 options => either to type the answer, or to speak the answer.
            # ---------------------------------------------
            # USER CHOICE: SPEAK or TYPE
            # ---------------------------------------------
            print("\nHow would you like to answer?")
            print("1) Speak into microphone")
            print("2) Type answer")
            method = input("Choose 1 or 2: ").strip()

            answer = None

            if method == "1" and AUDIO_AVAILABLE:
                print("\n🎤 Recording your answer...")
                answer = self._listen_for_answer(duration=12)

                if not answer:
                    print("⚠️ Speech recognition failed.")
                    answer = input("Please type your answer instead: ").strip()

            else:
                answer = input("\nType your answer: ").strip()

            if answer.lower() in ("exit", "quit"):
                print("\n🛑 Interview Stopped.")
                break

            # Save to transcript
            state.transcript.append({"q": question, "a": answer})
            state.questions_asked += 1

        print("\nInterview completed.")
        return state

    # ---------------------------
    # Node: Assessment
    # ---------------------------
    def generate_assessment(self, state: InterviewState) -> Dict[str, Any]:
        """Invoke structured assessor LLM to produce InterviewAssessment model."""
        if not self.llm:
            raise RuntimeError("LLM not configured for assessment step.")

        structured_assessor = self.llm.with_structured_output(InterviewAssessment)
        inputs = {
            "difficulty_level": state.profile.get("seniority_level", "medium"),
            "profile_doc": json.dumps(state.profile, indent=2),
            "chat_history": "\n".join([f"Q: {qa['q']}\nA: {qa['a']}" for qa in state.transcript])
        }

        print("\n[generate_assessment] Invoking assessor LLM...")
        chain = self.assessment_prompt | structured_assessor # Route using chain, passing the 'inputs' dictionary directly to the model will give an error
        # 'structured_assessor' will invoke the chain and produce output according to the provided schema(InterviewAssessment)

        try:
            assessment = chain.invoke(inputs) # Invoke the chain
        except Exception as e:
            raise RuntimeError(f"Assessment generation failed: {e}")

        # Convert Pydantic model-like output to dictionary.
        assessment_dict = {
            "candidate_score_percent": assessment.candidate_score_percent,
            "hiring_recommendation": assessment.hiring_recommendation,
            "strengths": assessment.strengths,
            "improvement_areas": assessment.improvement_areas,
            "next_steps": assessment.next_steps
        }
        return assessment_dict

    # ---------------------------
    # Node: PDF generation
    # ---------------------------
    def generate_pdf(self, state: InterviewState, filename: Optional[str] = None) -> str:
        if filename is None:
            filename = f"candidate_assessment_{state.profile.get('candidate_first_name','candidate')}.pdf"
        try:
            styles = getSampleStyleSheet()
            story = []

            title = Paragraph(f"<b>Final Candidate Assessment for {state.profile.get('candidate_first_name','')} {state.profile.get('candidate_last_name','')}</b>", styles["Title"])
            story.append(title)
            story.append(Spacer(1, 0.3 * inch))

            # score & recommendation
            story.append(Paragraph(f"<b>Overall Score:</b> {state.assessment['candidate_score_percent']}/100", styles["Normal"]))
            story.append(Paragraph(f"<b>Hiring Recommendation:</b> {state.assessment['hiring_recommendation']}", styles["Normal"]))
            story.append(Spacer(1, 0.2 * inch))

            story.append(Paragraph("<b>Key Strengths:</b>", styles["Heading3"]))
            for s in state.assessment.get("strengths", []):
                story.append(Paragraph(f"• {s}", styles["Normal"]))
            story.append(Spacer(1, 0.2 * inch))

            story.append(Paragraph("<b>Areas for Improvement:</b>", styles["Heading3"]))
            for i in state.assessment.get("improvement_areas", []):
                story.append(Paragraph(f"• {i}", styles["Normal"]))
            story.append(Spacer(1, 0.2 * inch))

            job_match = state.job_match or {}
            missing_skills = job_match.get("Missing_Skills", [])
            matched_skills = job_match.get("Matched_Skills", [])
            final_score = job_match.get("Final_Score", None)

            story.append(Spacer(1, 0.3 * inch))
            story.append(Paragraph("<b>Job Match Analysis</b>", styles["Heading2"]))

            if final_score is not None:
                story.append(Paragraph(f"<b>Overall Match Score:</b> {final_score}%", styles["Normal"]))

            story.append(Spacer(1, 0.15 * inch))

            story.append(Paragraph("<b>Matched Skills:</b>", styles["Heading3"]))
            if matched_skills:
                for s in matched_skills:
                    story.append(Paragraph(f"• {s}", styles["Normal"]))
            else:
                story.append(Paragraph("No matched skills identified.", styles["Normal"]))

            story.append(Spacer(1, 0.15 * inch))

            story.append(Paragraph("<b>Missing Skills:</b>", styles["Heading3"]))
            if missing_skills:
                for s in missing_skills:
                    story.append(Paragraph(f"• {s}", styles["Normal"]))
            else:
                story.append(Paragraph("No missing skills 🎉", styles["Normal"]))

            story.append(Paragraph("<b>Suggested Next Steps:</b>", styles["Heading3"]))
            story.append(Paragraph(state.assessment.get("next_steps", ""), styles["Normal"]))

            pdf = SimpleDocTemplate(filename, pagesize=letter)
            pdf.build(story)
            print(f"[generate_pdf] PDF saved to: {filename}")
            return filename
        except Exception as e:
            raise RuntimeError(f"PDF generation failed: {e}")

    # ---------------------------
    # Audio helpers (TTS/STT)
    # ---------------------------
    def _speak(self, text_to_speak: str):
        if not AUDIO_AVAILABLE:
            print("[TTS] Audio disabled or libraries missing.")
            return
        tts = gTTS(text=text_to_speak, lang='en')
        with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as tmp:
            tts.save(tmp.name)
            tmpname = tmp.name
        try:
            playsound(tmpname)
        finally:
            try:
                os.remove(tmpname)
            except Exception:
                pass

    def _listen_for_answer(self, duration: int = 8, sample_rate: int = 16000, channels: int = 1) -> Optional[str]:
        if not AUDIO_AVAILABLE:
            print("[STT] Audio disabled or libraries missing.")
            return None
        print(f"🎤 Recording for {duration} seconds...")
        try:
            recording = sd.rec(int(duration * sample_rate), samplerate=sample_rate, channels=channels, dtype='float64')
            sd.wait()
            audio_normalized = np.int16(recording * 32767) # Making numpy array of the recording, in order to make the model understand the speech
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                write(tmp.name, sample_rate, audio_normalized)
                tmpfile = tmp.name
            recognizer = sr.Recognizer() # Speech Recognizer's instance
            with sr.AudioFile(tmpfile) as source:
                audio = recognizer.record(source) # This will return a 'AudioSource' data file. May be passed to frontend, etc.
                text = recognizer.recognize_google(audio) # This will actually convert the audio back into text
            os.remove(tmpfile)
            print("📝 Transcribed:", text)
            return text
        except Exception as e:
            print("[STT] Error during speech-to-text:", e)
            return None

    # ---------------------------
    # Full pipeline runner
    # ---------------------------
    def run_full_pipeline(self, pdf_path: str, jd_text: str, jd_skills: list) -> InterviewState:
        # 1) extract resume
        extraction = self.extract_resume(pdf_path)
        state = InterviewState(pdf_path=pdf_path) # This 'state' object will act as the central state for ahead processes to be followed
        state.profile = extraction["profile"]
        state.vectorstore = extraction.get("vectorstore")

        # Match required skills on JD with Candidate's skills on JD 
        # For now, we will hardcode the job description and job skills
        
        state = self.skills_updation(state, jd_text, jd_skills)
        
        # 2) interview loop
        state = self.run_interview_loop(state)

        # 3) assessment
        assessment = self.generate_assessment(state)
        state.assessment = assessment

        # 4) generate pdf
        pdf_file = self.generate_pdf(state)
        state.pdf_path_out = pdf_file

        return state 


# ---------------------------
# ===> Main Function: wiring everything together
# ---------------------------
def main():
    # Ask for PDF path (or pass as Command Line Interface argument)
    pdf_path = input("Enter path to resume PDF: ").strip()
    if not os.path.exists(pdf_path):
        print("Error: file not found:", pdf_path)
        return

    # Configure LLMs & embeddings
    try:
        llm_main = ChatOpenAI(model="gpt-4o")
        embeddings = OpenAIEmbeddings()
    except Exception as e:
        print("Warning: ChatOpenAI/OpenAIEmbeddings init failed:", e)
        llm_main = None
        embeddings = None

    # Create orchestrator
    orch = Orchestrator(llm_main=llm_main, embeddings=embeddings, use_audio=False)

    # Run pipeline
    try:
        # Hardcoding the job description and job skills
        job_description = """
                            We are hiring a Backend Engineer with Python, FastAPI, MongoDB, and AWS.
                          """
        job_skills = ["python", "fastapi", "mongodb", "aws"]
        final_state = orch.run_full_pipeline(pdf_path,job_description,job_skills)
    except Exception as e:
        print("Pipeline failed:", e)
        return

    # Final outputs
    print("\n=== Final Outputs ===")
    print("Profile:")
    print(json.dumps(final_state.profile, indent=2))
    print("\nTranscript:")
    for qa in final_state.transcript:
        print("Q:", qa["q"])
        print("A:", qa["a"])
        print("-" * 40)
    print("\nAssessment:")
    print(json.dumps(final_state.assessment, indent=2))
    print("\nPDF saved at:", final_state.pdf_path_out)


if __name__ == "__main__":
    main()

