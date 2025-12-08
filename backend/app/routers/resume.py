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
