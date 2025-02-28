from sanic import Blueprint, response
from sanic_cors import CORS  # Add CORS support
from sqlalchemy.future import select
from passlib.context import CryptContext
import jwt
import datetime
from random import randint

from db import get_db_session
from models.models import User

auth_bp = Blueprint("auth", url_prefix="/api")
CORS(auth_bp)  # Enable CORS for the auth blueprint

SECRET_KEY = "your_secret_key_here"
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
        "email": user.email,
        "id": user.id,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=1)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")


@auth_bp.post("/login")
async def login(request):
    """Handles user login"""
    data = request.json
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return response.json({"message": "Email and password are required"}, status=400)

    async with get_db_session() as session:  # Use async with here
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalars().first()

        if not user or not verify_password(password, user.password_hash):
            return response.json({"message": "Invalid credentials"}, status=401)

        token = await generate_token(user)
        return response.json({"token": token, "message": "Login successful!"})


@auth_bp.post("/signup")
async def signup(request):
    """Handles user signup"""
    data = request.json
    email = data.get("email")
    username = data.get("username")
    username = str(randint(1,999999))
    password = data.get("password")

    if not email or not username or not password:
        return response.json({"message": "All fields are required"}, status=400)

    async with get_db_session() as session:  # Use async with here
        # Check if user already exists
        existing_user = await session.execute(select(User).where(User.email == email))
        if existing_user.scalars().first():
            return response.json({"message": "Email already in use"}, status=400)

        # Create new user with hashed password
        new_user = User(email=email, username=username, password_hash=hash_password(password))
        session.add(new_user)
        await session.commit()

        # Generate JWT token
        token = await generate_token(new_user)
        return response.json({"message": "User created successfully", "token": token}, status=201)