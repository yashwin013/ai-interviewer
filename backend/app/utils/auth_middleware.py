from fastapi import Header, HTTPException
from app.utils.jwt_utils import verify_token

async def get_current_user(Authorization: str = Header(None)):
    """
    Extract token from header, verify it, return decoded user data.
    Expected header:
    Authorization: Bearer <token>
    """
    if Authorization is None:
        raise HTTPException(status_code=401, detail="Authorization header missing")

    if not Authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token format. Use: Bearer <token>")

    token = Authorization.split(" ")[1]
    decoded = verify_token(token)
    return decoded  # contains userId, email
