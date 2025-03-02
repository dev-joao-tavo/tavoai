from sanic import Blueprint, response
from sanic_cors import CORS  # Add CORS support
from sqlalchemy.future import select
from passlib.context import CryptContext
import jwt
import datetime
from random import randint

from db import get_db_session
from models.models import User, Board

auth_bp = Blueprint("auth", url_prefix="/api")
CORS(auth_bp)  # Enable CORS for the auth blueprint

# Define the secret key and password context
SECRET_KEY = "your_secret_key_here"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Helper functions
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
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=1)  # Token expiration
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

        # Generate JWT token
        token = await generate_token(user)

        return response.json({"token": token, "message": "Login successful!"})

@auth_bp.post("/signup")
async def signup(request):
    """Handles user signup"""
    data = request.json
    email = data.get("email")
    username = str(randint(1, 999999))  # Ensure unique username
    password = data.get("password")

    if not email or not password:
        return response.json({"message": "Email and password are required"}, status=400)

    async with get_db_session() as session:
        # Check if user already exists
        existing_user = await session.execute(select(User).where(User.email == email))
        if existing_user.scalars().first():
            return response.json({"message": "Email already in use"}, status=400)

        # Create new user
        new_user = User(email=email, username=username, password_hash=hash_password(password))
        session.add(new_user)
        await session.flush()  # Ensure new_user gets an ID

        # Create a new board linked to this user
        new_board = Board(user_id=new_user.id, name=f"{username}'s Board")
        session.add(new_board)

        # Commit all changes
        await session.commit()

        # Generate JWT token
        token = await generate_token(new_user)
        return response.json({"message": "User created successfully", "token": token}, status=201)
