from fastapi import APIRouter, UploadFile, File, HTTPException
from bson import ObjectId
from app.db.mongo_clients import db

import uuid
import os
import pdfplumber
import fitz  # PyMuPDF
from pdf2image import convert_from_path
import pytesseract

from langchain_text_splitters import RecursiveCharacterTextSplitter


router = APIRouter(tags=["Resume"])

def extract_with_pdfplumber(path: str) -> str:
    text = ""
    try:
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                text += page.extract_text() or ""
    except:
        pass
    return text.strip()

def extract_with_pymupdf(path: str) -> str:
    text = ""
    try:
        doc = fitz.open(path)
        for page in doc:
            text += page.get_text()
    except:
        pass
    return text.strip()

def extract_with_ocr(path: str) -> str:
    text = ""
    try:
        pages = convert_from_path(path)
        for image in pages:
            text += pytesseract.image_to_string(image)
    except:
        pass
    return text.strip()


# Utility: Chunk extracted text

def chunk_text(raw_text: str):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=100
    )
    return splitter.split_text(raw_text)


# Check if user has uploaded resume
@router.get("/{userId}/status")
async def get_resume_status(userId: str):
    """
    Check if user has uploaded a resume.
    Returns resume status and metadata.
    """
    # Validate userId
    try:
        obj_id = ObjectId(userId)
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    
    # Check if user exists
    user = await db.users.find_one({"_id": obj_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if resumeProfile exists
    resume_profile = user.get("resumeProfile")
    
    if not resume_profile:
        return {
            "hasResume": False,
            "message": "No resume uploaded"
        }
    
    # Return resume metadata
    return {
        "hasResume": True,
        "message": "Resume uploaded",
        "metadata": {
            "name": resume_profile.get("name", "Unknown"),
            "email": resume_profile.get("email", "Unknown"),
            "seniorityLevel": resume_profile.get("seniority_level", "Unknown"),
            "skillsCount": len(resume_profile.get("skills", [])),
            "hasExtractedText": bool(resume_profile.get("extracted_text")),
            "filePath": resume_profile.get("file_path", "")
        }
    }


# Get resume PDF file
@router.get("/{userId}/file")
async def get_resume_file(userId: str):
    """
    Serve the uploaded resume PDF file.
    """
    from fastapi.responses import FileResponse
    
    # Validate userId
    try:
        obj_id = ObjectId(userId)
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    
    # Check if user exists
    user = await db.users.find_one({"_id": obj_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if resumeProfile exists
    resume_profile = user.get("resumeProfile")
    
    if not resume_profile or not resume_profile.get("file_path"):
        raise HTTPException(status_code=404, detail="No resume file found")
    
    file_path = resume_profile.get("file_path")
    
    # Check if file exists
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Resume file not found on server")
    
    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        headers={
            "Content-Disposition": "inline; filename=resume.pdf"
        }
    )


# MAIN ROUTE: Upload + Extract Resume
@router.post("/{userId}/upload-resume")
async def upload_resume(userId: str, resume: UploadFile = File(...)):
    """
    New resume pipeline:
    1. Upload PDF
    2. Extract text using pdfplumber → fitz → OCR fallback
    3. Clean + chunk text
    4. Save extracted_text + chunks to DB
    """

    # Validate ObjectId
    try:
        obj_id = ObjectId(userId)
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID.")

    # Check user exists
    user = await db.users.find_one({"_id": obj_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Create folder
    os.makedirs("uploads/resumes", exist_ok=True)

    ext = resume.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    save_path = f"uploads/resumes/{filename}"

    # Save file
    with open(save_path, "wb") as f:
        f.write(await resume.read())

    abs_path = os.path.abspath(save_path)

    extracted = extract_with_pdfplumber(abs_path)

    if not extracted:
        extracted = extract_with_pymupdf(abs_path)

    if not extracted:
        extracted = extract_with_ocr(abs_path)

    if not extracted:
        raise HTTPException(status_code=500, detail="Unable to extract text from PDF.")

    # Clean text
    extracted_clean = extracted.replace("\n", " ").strip()

    # Chunk for later LLM processing
    chunks = chunk_text(extracted_clean)

    # SAVE in MongoDB   

    resume_profile = {
        "extracted_text": extracted_clean,
        "chunks": chunks,
        "file_path": abs_path
    }

    await db.users.update_one(
        {"_id": obj_id},
        {"$set": {"resumeProfile": resume_profile}}
    )

    return {
        "message": "Resume uploaded and text extracted successfully.",
        "resumeProfile": resume_profile
    }
