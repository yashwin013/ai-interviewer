from fastapi import APIRouter, HTTPException
from datetime import datetime
from bson import ObjectId
from passlib.context import CryptContext
from app.utils.jwt_utils import create_token

from app.db.mongo_clients import db
from app.schemas.auth_schema import SignupRequest, LoginRequest, AuthResponse

router = APIRouter(tags=["Auth"])

# Password hashing configuration (Argon2 is secure & recommended)
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

# Password Utility Functions


def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

# SIGNUP ROUTE


@router.post("/signup", response_model=AuthResponse)
async def signup(payload: SignupRequest):
    """
    Create a new user.
    Returns: userId, name, email, token
    """

    email = payload.email.lower().strip()

    # Check if email already exists
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists.")

    # Hash password
    hashed_pw = hash_password(payload.password)

    user_doc = {
        "email": email,
        "password": hashed_pw,
        "name": payload.name,
        "createdAt": datetime.utcnow(),
        "resumeProfile": None   # Will be filled after resume upload
    }

    result = await db.users.insert_one(user_doc)

    # Create a JWT token containing the user's ID and email
    token = create_token({
        "userId": str(result.inserted_id),
        "email": payload.email
    })

    # Return full user object as required
    return {
        "userId": str(result.inserted_id),
        "name": payload.name,
        "email": payload.email,
        "token": token
    }


# ---------------------------
# LOGIN ROUTE
# ---------------------------

@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest):
    """
    Login with email + password.
    Returns: userId, name, email, token
    """

    email = payload.email.lower().strip()

    # Check if user exists
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found. Please sign up first.")

    # Verify password
    if not verify_password(payload.password, user["password"]):
        raise HTTPException(status_code=401, detail="Incorrect password.")

    # Generate JWT token
    token = create_token({
        "userId": str(user["_id"]),
        "email": user["email"]
    })

    # Return full user info
    return {
        "userId": str(user["_id"]),
        "name": user.get("name"),
        "email": user["email"],
        "token": token
    }

