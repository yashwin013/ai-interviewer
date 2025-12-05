from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import CharacterTextSplitter
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from pydantic import BaseModel, Field
from typing import Optional
import json
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
import os
from gtts import gTTS
from playsound3 import playsound # Newer version of playsound
import tempfile
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
import sounddevice as sd
import numpy as np
from scipy.io.wavfile import write

#  -----------> Resume Reading and Parsing <-------------------
while True:
    # 1. Prompt the user for the path
    pdf_file_path = input("Please enter the full file path of the resume PDF: ")
    
    # 2. Check if the file exists before proceeding
    if os.path.exists(pdf_file_path):
        break
    else:
        print(f"Error: File not found at '{pdf_file_path}'. Please check the path and try again.")
        print("Example path for Windows: C:\\Users\\YourName\\Documents\\resume.pdf")
        print("Example path for macOS/Linux: /Users/YourName/Documents/resume.pdf")

# 3. Use the dynamic path variable
pdf = PyPDFLoader(pdf_file_path)
loader = pdf.load()

#pdf = PyPDFLoader(r"C:\Users\gaurav.sharma\Downloads\Digital Content Creator- Template 14.pdf")
#loader = pdf.load()

resume_text = "\n".join([pages.page_content for pages in loader]) # Extracting the text

class ResumeData(BaseModel):
    """Extract candidate information."""
    
    candidate_first_name: str = Field(description = "Candidate's First Name.")
    candidate_last_name: str = Field(description = "Candidate's Last Name.")
    candidate_email: str = Field(description = "Candidate's Email.")
    candidate_linkedin: str = Field(description = "Candidate's LinkedIn.")
    experience: str = Field(description = "Candidate's work experience.")
    skills : list[str] = Field(description = "Key skills for the candidate.")
    seniority_level: str = Field(description = "The seniority level of the candidate. It can be one from: Fresher, Junior, Mid-Senior, Senior, Lead.")


embeddings = OpenAIEmbeddings()   
llm = ChatOpenAI(model = "gpt-4.1-mini")

structured_llm = llm.with_structured_output(ResumeData)
result = structured_llm.invoke(f"Extract the candidate's information: \n\n{resume_text}")

print(f"Candidate's First Name : {result.candidate_first_name}")
print(f"Candidate's Last Name : {result.candidate_last_name}")
print(f"Candidate's Email : {result.candidate_email}")
print(f"Candidate's LinkedIN : {result.candidate_linkedin}")
print(f"Candidate's Experience : {result.experience}")
print(f"Candidate's skills: {result.skills}")
print(f"Candidate's Experience level: {result.seniority_level}")

# Combine profile information
profile_data = f"""
                     Candidate Profile:
                     Name : {str(result.candidate_first_name + result.candidate_last_name)}
                     Email : {result.candidate_email}      
                     LinkedIN : {result.candidate_linkedin}
                     Experience : {result.experience}
                     Skills : {result.skills}
                     Seniority_Level : {result.seniority_level}
                """

documents = [
    Document(
        page_content=f"Email: {result.candidate_email}",
        metadata={
            "type": "email",
            "value": result.candidate_email,
            "candidate_email": result.candidate_email,
            "candidate_skills" : result.skills,
            "candidate_linkedin": result.candidate_linkedin
        }
    ),
    Document(
        page_content=f"Name: {result.candidate_first_name}", # Take the first name only
        metadata={
            "type": "First Name",
            "value": result.candidate_first_name,
            "candidate_email": result.candidate_email,
            "candidate_skills" : result.skills,
            "candidate_linkedin": result.candidate_linkedin
        }
    ),
    Document(
        page_content=f"LinkedIn: {result.candidate_linkedin}",
        metadata={
            "type": "linkedin",
            "value": result.candidate_linkedin,
            "candidate_email": result.candidate_email,
            "candidate_skills" : result.skills,
            "candidate_linkedin": result.candidate_linkedin
        }
    ),
    Document
    (
        page_content = f"Experience: {result.experience}",
        metadata = {
            "type" : "experience",
            "value" : result.experience,
            "candidate_email" : result.candidate_email,
            "candidate_skills" : result.skills,
            "candidate_linkedin" : result.candidate_linkedin
        }
    ),
    Document
    (
        page_content = f"Skills: {result.skills}",
        metadata = {
            "type" : "skills",
            "value" : result.skills,
            "candidate_email" : result.candidate_email,
            "candidate_linkedin" : result.candidate_linkedin
        }
    ),
    Document(
        page_content=f"Email: {result.seniority_level}",
        metadata={
            "type": "seniority",
            "value": result.seniority_level,
            "candidate_email": result.candidate_email,
            "candidate_skills" : result.skills,
            "candidate_linkedin": result.candidate_linkedin
        }
    )
]

profile_doc = Document(                         # Combining all information of the candidate in a single Document
    page_content = profile_data,
    metadata = {
                  "candidate's First name: " : result.candidate_first_name,
                  "candidate's Last name: " : result.candidate_last_name,
                  "candidate's Email: " : result.candidate_email,
                  "candidate's linkedin: " : result.candidate_linkedin,
                  "candidate's skills: " : result.skills,
                  "candidate's experience: " : result.seniority_level,
                  "document_type" : "resume_profile"
               }
)

vectorstore_faiss = FAISS.from_documents(
    documents = documents,
    embedding = embeddings
)


#vectorstore_faiss.save_local(folder_path = r"C:\Users\....", index_name = "candidate_profile")
#print("Data stored in FAISS.")


# Creating the state, so that the agent recieves one object. This state will act as a central state.

from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class InterviewContext(BaseModel):
    candidate_first_name: str
    candidate_last_name: str
    candidate_email: str
    candidate_linkedin: str
    candidate_experience: str
    candidate_skills: List[str]
    seniority_level: str
 
    difficulty_level: str             # "easy" | "medium" | "hard"
    #interview_mode: str         # "text" | "voice"

    profile_doc: str            # combined profile text
    vectorstore: Any            # FAISS store or retriever wrapper

    history: List[Dict] = []    # Q/A history
    total_questions_asked: int = 0
    interview_over: bool = False

# Defining the state of the parameters(They will actually come from UI)
field_of_study = "AI/ML" # can be set to anything, this is not used used in code
difficulty_level = "medium" # Not used in the code
# interview_mode = text/voice # Omitting for now

# Building the object(Binding every detail under one object)
interview_context = InterviewContext(
    candidate_first_name = result.candidate_first_name,
    candidate_last_name = result.candidate_last_name,
    candidate_email = result.candidate_email,
    candidate_linkedin = result.candidate_linkedin,
    candidate_experience = result.experience,
    candidate_skills = result.skills,
    seniority_level = result.seniority_level,

    difficulty_level = difficulty_level,

    profile_doc = profile_data,
    vectorstore = vectorstore_faiss.as_retriever(),

    history = [],
    total_questions_asked = 0,
    interview_over = False
)

print("\n Context for the interview is ready!")
json_data = interview_context.model_dump(exclude = {'vectorestore'}) # Excluding vectorstore_faiss, as it cannot be serialized

# Fix the exclusion key first so the heavy object is removed
raw_data = interview_context.model_dump(exclude={'vectorstore'})

def clean_dictionary(data):
    clean_data = {}
    for key, value in data.items():
        if isinstance(value, str):
            # Replace newlines with space and strip extra whitespace
            clean_data[key] = value.replace('\n', ' ').strip()
        elif isinstance(value, list):
            # Clean strings inside lists (like skills)
            clean_data[key] = [v.replace('\n', ' ').strip() if isinstance(v, str) else v for v in value]
        else:
            clean_data[key] = value
    return clean_data

final_json = clean_dictionary(raw_data)

print(json.dumps(final_json, indent=4))

# ------------> Text to Speech and Speech to Text <--------------

# Text to Speech

def speak(text_to_speak):
    """Converts text to speech and plays it."""
    try:
        tts = gTTS(text = text_to_speak, lang = 'en')
        
        with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as tmp:
            tts.save(tmp.name)
            temp_filename = tmp.name
        
        # Play the audio
        playsound(temp_filename)
        
    finally:
        # Clean up the temporary file
        if 'temp_filename' in locals() and os.path.exists(temp_filename):
            os.remove(temp_filename)


# ---------------> Speech to Text <----------------

import speech_recognition as sr
import sounddevice as sd

# --- Audio Functions ----- (These are used in the code ahead)
def record_audio(duration=5, sample_rate=16000, channels=1):
    """
    Record audio from microphone for speech recognition
    
    Args:
        duration: Recording duration in seconds
        sample_rate: Sample rate (16000 Hz is good for speech)
        channels: 1 for mono (recommended for speech)
    
    Returns:
        numpy array containing the recorded audio and sample rate
    """
    print(f"🎤 Recording for {duration} seconds... Speak now!")
    
    recording = sd.rec(int(duration * sample_rate), 
                      samplerate=sample_rate, 
                      channels=channels,
                      dtype='float64')
    sd.wait()
    print("✅ Recording complete!")
    return recording, sample_rate

def speech_to_text(audio_data, sample_rate=16000):
    """
    Convert recorded audio to text using speech recognition
    
    Args:
        audio_data: numpy array containing audio
        sample_rate: Sample rate in Hz
    
    Returns:
        Transcribed text or None if recognition fails
    """
    recognizer = sr.Recognizer()
    
    # Save audio to temporary WAV file
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_audio:
        audio_normalized = np.int16(audio_data * 32767)
        write(temp_audio.name, sample_rate, audio_normalized)
        temp_filename = temp_audio.name
    
    try:
        # Load audio file and recognize
        with sr.AudioFile(temp_filename) as source:
            audio = recognizer.record(source)
            text = recognizer.recognize_google(audio)
            return text
    except sr.UnknownValueError:
        print("❌ Could not understand audio. Please try again.")
        return None
    except sr.RequestError as e:
        print(f"❌ Could not request results; {e}")
        return None
    finally:
        # Clean up temporary file
        if os.path.exists(temp_filename):
            os.remove(temp_filename)

def speak(text_to_speak):
    """Converts text to speech and plays it."""
    try:
        tts = gTTS(text=text_to_speak, lang='en')
        
        with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as tmp:
            tts.save(tmp.name)
            temp_filename = tmp.name
        
        # Play the audio
        playsound(temp_filename)
        
    finally:
        # Clean up the temporary file
        if 'temp_filename' in locals() and os.path.exists(temp_filename):
            os.remove(temp_filename)

def listen_for_answer(duration=10, max_retries=3):
    """
    Record audio and convert to text with retry logic
    
    Args:
        duration: Recording duration in seconds
        max_retries: Maximum number of retry attempts
    
    Returns:
        Transcribed text or None
    """
    for attempt in range(max_retries):
        print(f"\n🎙️ Listening... (Attempt {attempt + 1}/{max_retries})")
        audio_data, sample_rate = record_audio(duration=duration)
        
        text = speech_to_text(audio_data, sample_rate)
        
        if text:
            print(f"📝 You said: {text}")
            return text
        elif attempt < max_retries - 1:
            print("🔄 Let's try again...")
    
    print("⚠️ Max retries reached. Skipping to text input...")
    return None

# ---------> Setting the context/tone of the Interviewer Agent <-----------

from langchain_core.prompts import ChatPromptTemplate

interviewer_prompt = ChatPromptTemplate.from_messages([
    ("system", """
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
        Examples:
        * "Tell me about yourself."
        * "Give me a brief introduction."
        * "Walk me through your background."
    """),

    ("human", """
    INTERVIEW STATUS:
    Questions Asked: {total_questions_asked} / {max_questions}

    TRANSCRIPT SO FAR:
    {chat_history}

    INSTRUCTION:
    Generate ONLY the next question.
    Avoid repeating previous questions.
    Make each new question cover a *new area* if possible.
    """)
])

# -----------> Function to initiate the interview <---------------

from langchain_core.output_parsers import StrOutputParser

def start_interview_session_1(context, llm, use_audio=True):
    interview_chain = interviewer_prompt | llm | StrOutputParser()

    # --- Determine question count by seniority ---
    seniority = context['seniority_level'].lower()
    if seniority == "fresher":
        MAX_QUESTIONS = 5
    elif seniority == "junior":
        MAX_QUESTIONS = 7
    else:
        MAX_QUESTIONS = 10

    context['max_questions'] = MAX_QUESTIONS
    context['total_questions_asked'] = 0

    # Clean and safe history tracking
    history_text = ""

    print(f"\n🎤 Starting Interview for {context.get('candidate_first_name', 'Candidate')}")
    print(f"📌 Total Questions: {MAX_QUESTIONS}")
    print(f"📌 Seniority Level: {context['seniority_level']}\n")

    if use_audio:
        print("🔉 Audio mode enabled. Speak after the beep.\n")

    # --- Main question loop ---
    while context['total_questions_asked'] < MAX_QUESTIONS:
        
        # Prepare LLM input
        context['chat_history'] = history_text

        # Get next question
        try:
            question = interview_chain.invoke(context)
        except Exception as e:
            print("🔥 LLM Error:", e)
            break

        q_number = context['total_questions_asked'] + 1

        print("\n" + "="*60)
        print(f"❓ Question {q_number}/{MAX_QUESTIONS}")
        print("="*60)
        print("💼 Interviewer:", question)

        if use_audio:
            speak(question)

        # --- Capture Answer ---
        answer = None

        # Text or voice
        text_input = input("\n👤 Your answer (or press Enter to speak): ").strip()

        if text_input.lower() in ("exit", "quit"):
            print("\n🛑 Interview Stopped.")
            break

        if text_input:
            answer = text_input
        else:
            answer = listen_for_answer(duration=15)
            if not answer:
                answer = input("⚠️ Audio failed. Type your answer: ").strip()

        if answer.lower() in ("exit", "quit"):
            print("\n🛑 Interview Stopped.")
            break

        # Add to transcript
        history_text += f"\nInterviewer: {question}\nCandidate: {answer}\n"

        # Update counter
        context['total_questions_asked'] += 1

    # --- End State ---
    print("\n" + "="*60)
    print("🎉 Interview Completed!")
    print("="*60)

    return history_text

llm2 = ChatOpenAI(model = "gpt-3.5-turbo")
session_history = start_interview_session_1(final_json,llm2,use_audio = True)


# ----------> Assesment Agent <-------------

from langchain_core.prompts import ChatPromptTemplate

# Pydantic model class for Interview Assesment 

from pydantic import BaseModel, Field
from typing import List, Optional

class InterviewAssesment(BaseModel):
    """Generating the assesment and recommendations after the interview."""
 
    #candidate_score_percent, hiring_recommendation, strengths, improvement_areas, next_steps
    candidate_score_percent: str = Field(description = "Score for the candidate out of 100. Give it as a form of confidence score considering the proficiency in technical and soft skills.")
    hiring_recommendation: str = Field(description  = "Clearly suggest the hiring recommendation: 'Definitely Hire!', 'Proceed with caution', 'Dont hire' ")
    strengths: List[str] = Field(description = "Strengths the candidate has displayed during the interview (e.g., 'Strong Technical skills', 'Relevant project experience in data cleaning!')")
    improvement_areas: List[str] = Field(description = "Define the key improvement areas the candidate should improve upon (e.g., 'Communication Skills', 'Project Management')")
    next_steps: str = Field(description = "Define the next steps for the process. (e.g., Work on SQL, Build a small AI project to solidify the basics)")
    
    
# Using the pydantic model
structured_assesor_llm = llm.with_structured_output(InterviewAssesment)

assesment_prompt = ChatPromptTemplate.from_messages([
    ("system", """
    You are an experienced **Hiring Manager and Technical Assessor**. Your task is to analyze the complete interview transcript provided below and generate a formal, structured assessment.

    EVALUATION CRITERIA:
    1. (Difficulty: {difficulty_level}).
    2. **Context**: Candidate's profile, including minimal experience (customer service, delivery). The score must reflect their potential given this background.
    3. **Focus**: Evaluate how well their answers align with the required skills and how their non-technical experience connects to the technical role.
    
    CRITICAL INSTRUCTION: Generate the assessment using the provided JSON schema (InterviewAssessment).
    """),
    ("human", """
    CANDIDATE PROFILE:
    {profile_doc}
    
    --- COMPLETE INTERVIEW TRANSCRIPT ---
    {chat_history}
    """)
])

# Chain for assesing candidate

chain_assesment_executor = assesment_prompt | structured_assesor_llm

import json

# --- Assuming the interview loop has finished and context_data is updated ---

# The 'chat_history' must be extracted from the final state of the interview loop.
# For this example, we'll manually create the necessary final inputs for the LLM.

final_inputs = {
    "difficulty_level": json_data['difficulty_level'],
    "profile_doc": json_data['profile_doc'],
    # Use the final history string collected during the session
    "chat_history": session_history 
}

# --- Generate the Assessment ---
print("\n--- Generating Final Assessment ---")
final_assessment: InterviewAssesment = chain_assesment_executor.invoke(final_inputs)

# --- Display the Results ---
print("\n## 📋 Final Candidate Assessment")
print("---------------------------------")
#print(f"**Target Role**: {final_inputs['field_of_study']} ({final_inputs['difficulty_level'].capitalize()})")
print(f"**Overall Score**: {final_assessment.candidate_score_percent}/100")
print(f"**Hiring Recommendation**: {final_assessment.hiring_recommendation}\n")

print("### ⭐ Key Strengths")
for s in final_assessment.strengths:
    print(f"* {s}")

print("\n### 📉 Areas for Improvement")
for i in final_assessment.improvement_areas:
    print(f"* {i}")
    
print(f"\n### ⏭️ Suggested Next Steps")
print(final_assessment.next_steps)

# For raw JSON output, we can use below line:
# print("\nRaw Assessment JSON:")
print(json.dumps(final_assessment.model_dump(), indent=2))

# ----------> Generate the final output in the form of pdf  -------------------
# Using reportlab over here

def generate_assessment_pdf(assessment: InterviewAssesment, filename="candidate_assessment.pdf"):
    styles = getSampleStyleSheet()
    story = []

    title = Paragraph(f"<b>Final Candidate Assessment for {interview_context.candidate_first_name} {interview_context.candidate_last_name}</b>", styles["Title"])
    story.append(title)
    story.append(Spacer(1, 0.3 * inch))

    # Score
    story.append(Paragraph(f"<b>Overall Score:</b> {assessment.candidate_score_percent}/100", styles["Normal"]))
    story.append(Paragraph(f"<b>Hiring Recommendation:</b> {assessment.hiring_recommendation}", styles["Normal"]))
    story.append(Spacer(1, 0.2 * inch))

    # Strengths
    story.append(Paragraph("<b>Key Strengths:</b>", styles["Heading3"]))
    for s in assessment.strengths:
        story.append(Paragraph(f"• {s}", styles["Normal"]))
    story.append(Spacer(1, 0.2 * inch))

    # Improvement Areas
    story.append(Paragraph("<b>Areas for Improvement:</b>", styles["Heading3"]))
    for i in assessment.improvement_areas:
        story.append(Paragraph(f"• {i}", styles["Normal"]))
    story.append(Spacer(1, 0.2 * inch))

    # Next Steps
    story.append(Paragraph("<b>Suggested Next Steps:</b>", styles["Heading3"]))
    story.append(Paragraph(assessment.next_steps, styles["Normal"]))

    # Build PDF
    pdf = SimpleDocTemplate(filename, pagesize=letter)
    pdf.build(story)

    return filename

# Generate the PDF
pdf_path = generate_assessment_pdf(final_assessment)
print(f"PDF saved as: {pdf_path}")

# Combining it all

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import CharacterTextSplitter
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from pydantic import BaseModel, Field
from typing import Optional
import json
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
import os

llm1 = ChatOpenAI(model = "gpt-4.1-mini")

def run_assessment_and_generate_report(use_audio=True):
    """Run an interview session, generate structured assessment, and export PDF."""
    llm1 = ChatOpenAI(model = "gpt-4.1-mini")
    try:
        print("\n--- Running interview session (this may prompt or run audio depending on prior flow) ---")
        session_history = start_interview_session_1(final_json, llm1, use_audio=use_audio)
    except Exception as e:
        print(f"Error running interview session: {e}")
        raise

    # Build inputs for the assessment chain
    final_inputs = {
        'difficulty_level': json_data.get('difficulty_level', 'medium'),
        'profile_doc': json_data.get('profile_doc', ''),
        'chat_history': session_history,
    }

    try:
        final_assessment: InterviewAssesment = chain_assesment_executor.invoke(final_inputs)
    except Exception as e:
        print(f"Error generating assessment: {e}")
        raise

    # Print a concise summary to stdout
    print('\n## 📋 Final Candidate Assessment')
    print('---------------------------------')
    print(f"**Overall Score**: {final_assessment.candidate_score_percent}/100")
    print(f"**Hiring Recommendation**: {final_assessment.hiring_recommendation}\\n")
    print('### ⭐ Key Strengths')
    for s in final_assessment.strengths:
        print(f"* {s}")
    print('\n### 📉 Areas for Improvement')
    for i in final_assessment.improvement_areas:
        print(f"* {i}")
    print('\n### ⏭️ Suggested Next Steps')
    print(final_assessment.next_steps)

    # Generate PDF
    pdf_file = None
    try:
        pdf_file = generate_assessment_pdf(final_assessment)
        print(f"PDF saved as: {pdf_file}")
    except Exception as e:
        print(f"Error generating PDF: {e}")

    return { 'assessment': final_assessment, 'pdf_path': pdf_file }

# When executed directly in a Python environment cell, run once (safe-guarded)
if __name__ == '__main__':
    r = 1
    if r == 1:
        run_assessment_and_generate_report(use_audio=True)
        r += 1
    else:
        print("Please check if you already have given an interview or contact the concerned person about this issue.")    