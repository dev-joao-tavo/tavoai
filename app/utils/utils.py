from passlib.context import CryptContext
import datetime
import jwt

SECRET_KEY = "your_secret_key"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """Hashes the password using bcrypt."""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a password against its hashed version."""
    return pwd_context.verify(plain_password, hashed_password)

async def generate_token(user):
    """Generates a JWT token for authentication"""
    payload = {
        "user_id": user.id,  # Use user_id in the payload for identifying the user
        "email": user.email,
        "username": user.username,  # Including username can be useful for front-end
        "user_wpp_phone_number":user.user_wpp_phone_number,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")
