from sanic import Blueprint, response
from sanic_cors import CORS  # Add CORS support
from sqlalchemy.future import select
from random import randint
from utils.utils import SECRET_KEY, hash_password, verify_password, generate_token
from db import get_db_session
from models.models import User, Board
from sanic_ext import Extend
from utils.utils import hash_password

auth_bp = Blueprint("auth", url_prefix="/api")
CORS(auth_bp)  # Enable CORS for the auth blueprint

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
    username = str(randint(1, 99999999))  # Ensure unique username
    password = data.get("password")
    user_wpp_phone_number = data.get("phone")
    user_id = randint(1, 99999999)  # Ensure unique username


    if not email or not password:
        return response.json({"message": "Email and password are required"}, status=400)

    async with get_db_session() as session:
        # Check if user already exists
        existing_user = await session.execute(select(User).where(User.email == email))
        if existing_user.scalars().first():
            return response.json({"message": "Email already in use"}, status=400)

        # Create new user
        new_user = User(id=user_id, email=email, username=username, password_hash=hash_password(password),user_wpp_phone_number=user_wpp_phone_number)
        session.add(new_user)
        await session.flush()  # Ensure new_user gets an ID

        # Create a new board linked to this user
        new_board_agenda = Board(user_id=user_id, name=f"{user_id}'s Agenda Board",board_type="agenda")
        session.add(new_board_agenda)
        await session.flush()  # probably could be removed

        # Create a new board linked to this user
        new_board_funnel = Board(user_id=user_id, name=f"{user_id}'s Funnel Board",board_type="funnel")
        session.add(new_board_funnel)
        await session.flush()  # probably could be removed

        # Commit all changes
        await session.commit()

        # Generate JWT token
        token = await generate_token(new_user)
        return response.json({"message": "Cadastro feito com sucesso!", "token": token}, status=201)

user_bp = Blueprint("user", url_prefix="/api/users")

@user_bp.put("/<user_id:int>")
async def update_user(request, user_id):
    """Updates the user's phone number and/or password"""
    
    # Extract token from the request headers
    token = request.headers.get("Authorization")
    if not token:
        return response.json({"message": "Unauthorized"}, status=401)

    data = request.json
    new_phone = data.get("user_wpp_phone_number")
    new_password = data.get("password")

    if not new_phone and not new_password:
        return response.json({"message": "No changes provided"}, status=400)

    async with get_db_session() as session:
        result = await session.execute(select(User).where(User.id == user_id))
        user = result.scalars().first()

        if not user:
            return response.json({"message": "User not found"}, status=404)

        # Update fields
        if new_phone:
            user.user_wpp_phone_number = new_phone
        if new_password:
            user.password_hash = hash_password(new_password)  # Secure hashing

        await session.commit()
        return response.json({"message": "Profile updated successfully"})
