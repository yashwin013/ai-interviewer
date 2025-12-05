from pydantic import BaseModel, EmailStr

# Signup Request Model

class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str

# Login Request Model

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

# Auth Response Model

class AuthResponse(BaseModel):
    userId: str
    name: str
    email: EmailStr
    token: str
