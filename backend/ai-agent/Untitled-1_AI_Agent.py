# Code using extracted information from pdf externally(Thereby reducing token usage on llm and agent) 
# Use this version(effect from 10th December 2025)

"""
orchestrator_from_json.py
Full merged orchestrator that uses externally-parsed resume JSON (f1) as input.
Features:
- LLM-based structured extraction from provided resume text
- FAISS vectorstore from provided chunks
- TTS (gTTS) + STT (sounddevice + SpeechRecognition) optional per-question
- Interview loop, structured assessment, PDF export
- Two runners: from JSON (preferred) and from PDF (fallback)
"""

import os
import json
import tempfile
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

# LLM / embeddings / chain primitives
try:
    from langchain_openai import ChatOpenAI, OpenAIEmbeddings
    from langchain_core.prompts import ChatPromptTemplate
    from langchain_core.output_parsers import StrOutputParser
    from langchain_core.documents import Document
    from langchain_community.vectorstores import FAISS
    from langchain_community.document_loaders import PyPDFLoader
except Exception as e:
    print("Warning: LangChain/OpenAI imports failed. Install required packages if you plan to run LLM steps.")
    print("Import error:", e)

# Audio & PDF generation
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
    print("Audio libs missing or failed to import — audio features disabled. Error:", e)

try:
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.units import inch
except Exception as e:
    print("Warning: reportlab not installed. PDF generation will fail. Error:", e)

# -------------------------
# User-provided structured extraction schema
# -------------------------
class ResumeProfileExtraction(BaseModel):
    name: Optional[str] = Field(description="Name of the candidate.")
    phone: Optional[str] = Field(description="Phone number of the candidate.")
    linkedin: Optional[str] = Field(description="LinkedIn Profile of the candidate.")
    github: Optional[str] = Field(description="GitHub link of the candidate.")
    skills: Optional[List[str]] = Field(description="Skills of the candidate.")
    experience: Optional[str] = Field(description="Candidate's work experience.")


# Structured assessment schema (same as before)
class InterviewAssessment(BaseModel):
    candidate_score_percent: str = Field(description="Score for the candidate out of 100.")
    hiring_recommendation: str = Field(description="Hiring recommendation: 'Definitely Hire!', 'Proceed with caution', 'Dont hire'")
    strengths: List[str] = Field(description="Strengths the candidate displayed.")
    improvement_areas: List[str] = Field(description="Improvement areas.")
    next_steps: str = Field(description="Suggested next steps.")


# -------------------------
# Orchestrator state and prompts
# -------------------------
class InterviewState(BaseModel):
    source_id: str  # "JSON" or PDF path
    profile: Optional[Dict[str, Any]] = None
    vectorstore: Optional[Any] = None
    transcript: List[Dict[str, str]] = []
    questions_asked: int = 0
    max_questions: int = 0
    assessment: Optional[Dict[str, Any]] = None
    pdf_path_out: Optional[str] = None


# Interviewer prompt (uses prompt template variables)
interviewer_prompt = ChatPromptTemplate.from_messages([
    ("system", """
    The candidate has a seniority of: {seniority_level}.

    YOUR PRIMARY GOAL:
    - Conduct an interview of exactly {max_questions} questions.
    - Match question difficulty to seniority level:
        Fresher -> conceptual basics
        Junior -> practical + scenario
        Mid-level -> deeper practical reasoning
        Senior -> architecture & ownership
    SECONDARY GOAL:
    - Ask a balanced variety: experience-based, skill-based, behavioral.
    RULE:
    - If total_questions_asked == 0, ask an introductory question (e.g., "Tell me about yourself.")
    """),
    ("human", """
    INTERVIEW STATUS:
    Questions Asked: {total_questions_asked} / {max_questions}

    TRANSCRIPT SO FAR:
    {chat_history}

    PROFILE CONTEXT:
    {profile_context}

    INSTRUCTION:
    Generate *only* the next question. Avoid repeating earlier questions. Cover a new area if possible.
    """)
])

# Assessment prompt
assessment_prompt = ChatPromptTemplate.from_messages([
    ("system", """
    You are an experienced Hiring Manager and Technical Assessor. Analyze the interview transcript and the candidate profile and generate a structured assessment JSON conforming to the InterviewAssessment schema.
    """),
    ("human", """
    CANDIDATE PROFILE:
    {profile_doc}

    --- COMPLETE INTERVIEW TRANSCRIPT ---
    {chat_history}
    """)
])

# -------------------------
# Token Usage Implementation
# -------------------------

class TokenTracker:
    def __init__(self):
        self.total_input = 0
        self.total_output = 0
        self.calls = []

    def add(self, response):
        usage = response.usage_metadata or {}
        self.total_input += usage.get("input_tokens",0)
        self.total_output += usage.get("output_tokens",0)
        self.calls.append(usage)
        return response    

# -------------------------
# Orchestrator implementation
# -------------------------
class Orchestrator:
    def __init__(self, llm: Optional[ChatOpenAI] = None, embeddings: Optional[OpenAIEmbeddings] = None, use_audio: bool = False):
        self.llm = llm or (ChatOpenAI(model="gpt-4.1-mini") if "ChatOpenAI" in globals() else None)
        self.embeddings = embeddings or (OpenAIEmbeddings() if "OpenAIEmbeddings" in globals() else None)
        self.use_audio = use_audio and AUDIO_AVAILABLE
        self.token_tracker = TokenTracker()
        self.interviewer_prompt = interviewer_prompt

    # ---------- Audio helpers ----------
    def _speak(self, text: str):
        if not (AUDIO_AVAILABLE and self.use_audio):
            return
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
            try:
                tts = gTTS(text=text, lang="en")
                tts.save(tmp.name)
                playsound(tmp.name)
            finally:
                try:
                    os.remove(tmp.name)
                except Exception:
                    pass

    def _listen_for_answer(self, duration: int = 8, sample_rate: int = 16000, channels: int = 1) -> Optional[str]:
        if not (AUDIO_AVAILABLE and self.use_audio):
            return None
        try:
            print(f"[STT] Recording for {duration}s...")
            recording = sd.rec(int(duration * sample_rate), samplerate=sample_rate, channels=channels, dtype='float64')
            sd.wait()
            audio_int16 = np.int16(recording * 32767)
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                write(tmp.name, sample_rate, audio_int16)
                tmpfile = tmp.name
            recognizer = sr.Recognizer()
            with sr.AudioFile(tmpfile) as source:
                audio = recognizer.record(source)
                text = recognizer.recognize_google(audio)
            try:
                os.remove(tmpfile)
            except Exception:
                pass
            return text
        except Exception as e:
            print("[STT] Error:", e)
            return None

    # ---------- LLM-based structured extraction from text using provided schema ----------
    def _llm_extract_profile(self, text: str) -> ResumeProfileExtraction:
        if not self.llm:
            raise RuntimeError("LLM not configured for profile extraction.")
        structured = self.llm.with_structured_output(ResumeProfileExtraction)
        prompt = f"""
Extract the following fields as clearly as possible from the text below:
- Full name
- Phone Number
- LinkedIn
- GitHub
- Skills (as a list)
- Experience (short summary)

Text:
{text}
"""
        print()
        return structured.invoke(prompt)

    # ---------- Build vectorstore from provided chunks ----------
    def _build_vectorstore_from_chunks(self, chunks: List[str]):
        docs = [Document(page_content=c, metadata={"source": "external_chunk", "chunk_index": i}) for i, c in enumerate(chunks)]
        if not self.embeddings:
            print("[_build_vectorstore_from_chunks] No embeddings configured; skipping vectorstore build.")
            return None
        try:
            vs = FAISS.from_documents(documents=docs, embedding=self.embeddings)
            return vs
        except Exception as e:
            print("[_build_vectorstore_from_chunks] FAISS build failed:", e)
            return None

    # ---------- New: Use external JSON (f1) as input ----------
    def extract_from_external_json(self, resume_json: Dict[str, Any]) -> Dict[str, Any]:
        # resume_json shape expected like your f1
        if "resumeProfile" not in resume_json:
            raise ValueError("resume_json must contain 'resumeProfile' key.")

        rp = resume_json["resumeProfile"]
        extracted_text = rp.get("extracted_text", "")
        chunks = rp.get("chunks", [extracted_text])  # fallback to full text chunk if no chunks provided

        # LLM structured extraction from the full extracted_text
        try:
            print("[extract_from_external_json] Running structured LLM extraction...")
            structured_result = self._llm_extract_profile(extracted_text)
        except Exception as e:
            print("[extract_from_external_json] Structured extraction failed:", e)
            # Build a minimal profile fallback
            structured_result = ResumeProfileExtraction(name=None, phone=None, linkedin=None, github=None, skills=None, experience=None)

        # Map to internal profile shape
        name = (structured_result.name or "").strip()
        first, last = (name.split(" ", 1) + [""])[:2] if name else ("", "")
        profile = {
            "candidate_first_name": first,
            "candidate_last_name": last,
            "candidate_email": rp.get("email", "") or "",  # optional - your f1 may not provide explicit email field
            "candidate_linkedin": structured_result.linkedin or rp.get("linkedin", ""),
            "experience": structured_result.experience or "",
            "skills": structured_result.skills or [],
            "seniority_level": "Mid"  # default; you could infer from experience/years if desired
        }

        vectorstore = self._build_vectorstore_from_chunks(chunks)
        return {"profile": profile, "vectorstore": vectorstore, "raw_chunks": chunks, "structured_result": structured_result}

    # ---------- (Optional) Small PDF fallback extractor if you still want to parse PDF ----------
    def extract_from_pdf(self, pdf_path: str) -> Dict[str, Any]:
        try:
            loader = PyPDFLoader(pdf_path)
            pages = loader.load()
            resume_text = "\n".join([p.page_content for p in pages])
        except Exception as e:
            raise RuntimeError(f"Failed to load PDF: {e}")
        # minimal chunks: split by pages
        chunks = [p.page_content for p in pages]
        return self.extract_from_external_json({"resumeProfile": {"extracted_text": resume_text, "chunks": chunks}})

    # ---------- Interview loop (uses vectorstore for RAG context) ----------
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

            profile_context = json.dumps(state.profile, indent = 2)
            
            inputs = {
                "seniority_level": state.profile["seniority_level"],
                "total_questions_asked": state.questions_asked,
                "max_questions": state.max_questions,
                "chat_history": chat_history_text,
                "profile_context": json.dumps(state.profile, indent = 2)
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

    # ---------- Assessment (route dict -> prompt -> structured LLM) ----------
    def generate_assessment(self, state: InterviewState) -> Dict[str, Any]:
        if not self.llm:
            raise RuntimeError("LLM not configured for assessment.")

        structured_assessor = self.llm.with_structured_output(InterviewAssessment)
        chain = assessment_prompt | structured_assessor

        final_inputs = {
            "difficulty_level": state.profile.get("seniority_level", "Mid"),
            "profile_doc": json.dumps(state.profile, indent=2),
            "chat_history": "\n".join([f"Q: {t['q']}\nA: {t['a']}" for t in state.transcript])
        }

        print("\n[generate_assessment] Invoking assessor chain...")
        try:
            assessment_obj = chain.invoke(final_inputs) # This will pass dict to prompt template
        except Exception as e:
            raise RuntimeError(f"Assessment generation failed: {e}")

        assessment_dict = {
            "candidate_score_percent": assessment_obj.candidate_score_percent,
            "hiring_recommendation": assessment_obj.hiring_recommendation,
            "strengths": assessment_obj.strengths,
            "improvement_areas": assessment_obj.improvement_areas,
            "next_steps": assessment_obj.next_steps
        }
        return assessment_dict

    # ---------- PDF export ----------
    def generate_pdf(self, state: InterviewState, filename: Optional[str] = None) -> str:
        if filename is None:
            filename = f"candidate_assessment_{state.profile.get('candidate_first_name','candidate')}.pdf"
        styles = getSampleStyleSheet()
        story = []
        title = Paragraph(f"<b>Final Candidate Assessment for {state.profile.get('candidate_first_name','')} {state.profile.get('candidate_last_name','')}</b>", styles["Title"])
        story.append(title)
        story.append(Spacer(1, 0.25 * inch))
        story.append(Paragraph(f"<b>Overall Score:</b> {state.assessment.get('candidate_score_percent','N/A')}", styles["Normal"]))
        story.append(Paragraph(f"<b>Recommendation:</b> {state.assessment.get('hiring_recommendation','N/A')}", styles["Normal"]))
        story.append(Spacer(1, 0.15 * inch))
        story.append(Paragraph("<b>Strengths:</b>", styles["Heading3"]))
        for s in state.assessment.get("strengths", []):
            story.append(Paragraph(f"• {s}", styles["Normal"]))
        story.append(Spacer(1, 0.15 * inch))
        story.append(Paragraph("<b>Improvement Areas:</b>", styles["Heading3"]))
        for i in state.assessment.get("improvement_areas", []):
            story.append(Paragraph(f"• {i}", styles["Normal"]))
        story.append(Spacer(1, 0.2 * inch))
        story.append(Paragraph("<b>Next Steps:</b>", styles["Heading3"]))
        story.append(Paragraph(state.assessment.get("next_steps", ""), styles["Normal"]))

        pdf = SimpleDocTemplate(filename, pagesize=letter)
        pdf.build(story)
        print(f"[generate_pdf] PDF saved: {filename}")
        return filename

    # ---------- Full-run entrypoints ----------
    def run_full_pipeline_from_json(self, resume_json: Dict[str, Any]) -> InterviewState:
        x = self.extract_from_external_json(resume_json)
        state = InterviewState(source_id="EXTERNAL_JSON")
        state.profile = x["profile"]
        state.vectorstore = x["vectorstore"]

        # Interview loop
        state = self.run_interview_loop(state)

        # Assessment
        state.assessment = self.generate_assessment(state)

        # PDF
        state.pdf_path_out = self.generate_pdf(state)

        return state

    def run_full_pipeline_from_pdf(self, pdf_path: str) -> InterviewState:
        x = self.extract_from_pdf(pdf_path)
        state = InterviewState(source_id=pdf_path)
        state.profile = x["profile"]
        state.vectorstore = x["vectorstore"]

        # Interview loop
        state = self.run_interview_loop(state)

        # Assessment
        state.assessment = self.generate_assessment(state)

        # PDF
        state.pdf_path_out = self.generate_pdf(state)

        return state


# -------------------------
# Main function
# -------------------------
def main():
    # Basic choice: run from external JSON or a PDF file
    print("Run pipeline from: 1) External JSON  2) PDF file")
    choice = input("Choose 1 or 2: ").strip()
    use_audio = True  # safe default; change to True if audio libs present and you want voice
    orchestrator = Orchestrator(use_audio=use_audio)

    if choice == "1":
        # Example: load pre-parsed JSON from a file path or paste inline
        json_path = input("Path to external JSON (or leave blank to use sample): ").strip()
        if not json_path:
            print("Using sample placeholder. Replace with your `f1` object or path to your JSON file.")
            # minimal sample structure — replace with your actual `f1`
            sample_f1 = {
                "message": "Resume uploaded and text extracted successfully.",
                "resumeProfile": {
                    "extracted_text": "John Doe ... resume text ...",
                    "chunks": ["John Doe ... resume text ..."]
                }
            }
            resume_json = sample_f1
        else:
            with open(json_path, "r", encoding="utf-8") as fh:
                resume_json = json.load(fh)

        state = orchestrator.run_full_pipeline_from_json(resume_json)

    else:
        pdf_path = input("Path to resume PDF: ").strip()
        if not os.path.exists(pdf_path):
            print("File not found:", pdf_path)
            return
        state = orchestrator.run_full_pipeline_from_pdf(pdf_path)

    print("\n=== FINAL OUTPUTS ===")
    print("Profile:")
    print(json.dumps(state.profile, indent=2))
    print("\nTranscript:")
    for qa in state.transcript:
        print("Q:", qa["q"])
        print("A:", qa["a"])
        print("-" * 40)
    print("\nAssessment:")
    print(json.dumps(state.assessment, indent=2))
    print("\nPDF:", state.pdf_path_out)


if __name__ == "__main__":
    main()

    