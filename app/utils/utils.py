from passlib.context import CryptContext
import jwt
from sanic.exceptions import Unauthorized
from db import get_db_session
from models.models import User
from sqlalchemy.future import select

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

# Helper function to decode the JWT and get the current user
def get_user_from_token(request):
    # Extract the JWT token from the request headers
    token = request.headers.get("Authorization")
    if not token:
        raise Unauthorized(f"Authorization token is missing. Token: {token}; Headers: {request.headers}")
    
    # Remove 'Bearer ' prefix if it exists
    if token.startswith("Bearer "):
        token = token[7:]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload["user_id"]  # assuming the token contains 'user_id' of the user
    except jwt.ExpiredSignatureError:
        raise Unauthorized("Token has expired.")
    except jwt.InvalidTokenError:
        raise Unauthorized("Invalid token.")

async def get_driver_status_from_user_id(user_id):
    async with get_db_session() as session:  # ✅ Ensure this is an async session
        result = await session.execute(
            select(User).where(User.id == user_id).with_for_update()
        )
        user = result.scalars().first()
        return user.driver_status 


def get_driver_status_message(status: str) -> str:
    messages = {
        "SENDING_WPP_MESSAGES": "Algumas mensagens estão sendo enviadas. Por favor, aguarde e tente novamente em breve.",
        "WPP_LOGIN": "O login no WhatsApp está sendo feito. Por favor, aguarde e tente novamente em breve.",
        "CHECKING_WPP_LOGIN": "Estamos checando a sua conexão com o WhatsApp. Por favor, aguarde e tente novamente em breve.",
    }
    return messages.get(status, "Por favor, aguarde e tente novamente em breve.")  # Default message
