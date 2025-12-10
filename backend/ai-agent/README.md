# AI Interview Agent Service

FastAPI service for AI-powered resume parsing and interview question generation.

## Setup

1. **Install Dependencies**
```bash
pip install -r requirements.txt
```

2. **Configure Environment**
Edit `.env` and add your OpenAI API key:
```
OPENAI_API_KEY=sk-your-key-here
PORT=5000
```

3. **Run the Service**
```bash
python app.py
```

Or with uvicorn:
```bash
uvicorn app:app --reload --port 5000
```

## API Endpoints

### 1. Parse Resume
```
POST /parse-resume
Body: {
  "userId": "user123",
  "resumeText": "full resume text...",
  "chunks": ["chunk1", "chunk2", ...]
}
Response: {
  "resumeProfile": {
    "name": "John Doe",
    "email": "john@example.com",
    "skills": ["Python", "FastAPI"],
    "experience": "...",
    "seniority_level": "Mid-Senior"
  }
}
```

### 2. Initialize Interview
```
POST /init-interview
Body: {
  "sessionId": "session123",
  "resumeText": "full resume text...",
  "chunks": ["chunk1", "chunk2", ...]
}
Response: {
  "question": "Tell me about yourself."
}
```

### 3. Get Next Question
```
POST /next-question
Body: {
  "sessionId": "session123",
  "resumeText": "full resume text...",
  "chunks": ["chunk1", "chunk2", ...],
  "currentQuestionNumber": 1,
  "currentAnswer": "I am a software engineer..."
}
Response: {
  "nextQuestion": "What projects have you worked on?"
}
```

## Health Check
```
GET /health
```

## API Documentation
Once running, visit: `http://localhost:5000/docs`
