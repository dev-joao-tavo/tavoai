from sanic import Blueprint, response
from sanic_cors import CORS  # Add CORS support
from sqlalchemy.future import select
from random import randint
from utils.utils import hash_password, verify_password, generate_token
from db import get_db_session
from models.models import User, Board, UserMessages
from sanic_ext import Extend
from utils.utils import  get_user_from_token
from sqlalchemy.exc import SQLAlchemyError
import json


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

@auth_bp.post("/update-profile")
async def update_profile(request):
    try:
        # Get user from token
        user_id = get_user_from_token(request)
        if not user_id:
            return response.json({"error": "Invalid or missing token"}, status=401)
        
        
        data = request.json
    
        new_phone = data.get('new_phone')
        new_password = data.get('new_password')
        new_email = data.get('new_email')
        new_username = data.get('new_username')

        # Validate at least one field is provided
        if not any([new_phone, new_password, new_email, new_username]):
            return response.json(
                {"error": "No fields provided for update"}, 
                status=400
            )
        async with get_db_session() as session:
            try:
                # Get user
                result = await session.execute(select(User).where(User.id == user_id))
                user = result.scalars().first()

                if not user:
                    return response.json({"error": "User not found"}, status=404)

                # Track updates for response
                updated_fields = {}

                # Phone number update
                if new_phone is not "":
                    if new_phone != user.user_wpp_phone_number:
                        existing = await session.execute(
                            select(User).where(
                                User.user_wpp_phone_number == new_phone,
                                User.id != user_id
                            )
                        )
                        if existing.scalars().first():
                            return response.json(
                                {"error": "Phone number already in use"},
                                status=400
                            )
                        user.user_wpp_phone_number = new_phone
                        updated_fields['phone'] = True

                # Password update
                if new_password is not "":
                    user.set_password(new_password)
                    updated_fields['password'] = True

                # Email update
                if new_email is not "":
                    if new_email != user.email:
                        existing = await session.execute(
                            select(User).where(
                                User.email == new_email,
                                User.id != user_id
                            )
                        )
                        if existing.scalars().first():
                            return response.json(
                                {"error": "Email already in use"},
                                status=400
                            )
                        user.email = new_email
                        updated_fields['email'] = True

                # Username update
                if new_username is not "":
                    if new_username != user.username:
                        existing = await session.execute(
                            select(User).where(
                                User.username == new_username,
                                User.id != user_id
                            )
                        )
                        user.username = new_username
                        updated_fields['username'] = True

                if not updated_fields:
                    return response.json(
                        {"message": "No changes detected"},
                        status=200
                    )

                await session.commit()
                return response.json({
                    "message": "Profile updated successfully",
                    "updated_fields": updated_fields
                })

            except SQLAlchemyError as e:
                await session.rollback()
                print(f"Database error during profile update: {str(e)}")
                return response.json(
                    {"error": "Database error occurred"},
                    status=500
                )

    except Exception as e:
        print(f"Unexpected error in update_profile: {str(e)}")
        return response.json(
            {"error": "An internal server error occurred"},
            status=500
        )
    
@auth_bp.get("/get-profile")
async def get_profile(request):
    try:
        # Get user from token
        user_id = get_user_from_token(request)
        if not user_id:
            return response.json({"error": "Invalid or missing token"}, status=401)
        
        async with get_db_session() as session:
            try:
                # Get user
                result = await session.execute(select(User).where(User.id == user_id))
                user = result.scalars().first()

                if not user:
                    return response.json({"error": "User not found"}, status=404)

                # Return the requested profile information
                return response.json({
                    "email": user.email,
                    "phone": user.user_wpp_phone_number,
                    "username": user.username
                })

            except SQLAlchemyError as e:
                print(f"Database error during profile retrieval: {str(e)}")
                return response.json(
                    {"error": "Database error occurred"},
                    status=500
                )

    except Exception as e:
        print(f"Unexpected error in get_profile: {str(e)}")
        return response.json(
            {"error": "An internal server error occurred"},
            status=500
        )
   


@auth_bp.get("/get-messages")
async def get_messages(request):
    try:
        # Get user from token
        user_id = get_user_from_token(request)
        if not user_id:
            return response.json({"error": "Invalid or missing token"}, status=401)
        
        async with get_db_session() as session:
            try:
                # Get all messages for this user
                result = await session.execute(
                    select(UserMessages).where(UserMessages.user_id == user_id))
                messages = result.scalars().all()

                # Organize messages by status
                organized_messages = {
                    "agenda": {},
                    "funnel": {}
                }

                for message in messages:
                    # Determine if it's an agenda or funnel message
                    status_type = "agenda" if message.status in agendaStatuses else "funnel"
                    
                    if message.status not in organized_messages[status_type]:
                        organized_messages[status_type][message.status] = {}
                    
                    # Store message with its ID as key
                    organized_messages[status_type][message.status][message.id] = message.message

                return response.json(organized_messages)

            except SQLAlchemyError as e:
                print(f"Database error during messages retrieval: {str(e)}")
                return response.json(
                    {"error": "Database error occurred"},
                    status=500
                )

    except Exception as e:
        print(f"Unexpected error in get_messages: {str(e)}")
        return response.json(
            {"error": "An internal server error occurred"},
            status=500
        )

@auth_bp.post("/update-messages")
async def update_messages(request):
    try:
        # Get user from token
        user_id = get_user_from_token(request)
        if not user_id:
            return response.json({"error": "Invalid or missing token"}, status=401)
        
        data = request.json
        agenda_messages = data.get('agenda', {})
        funnel_messages = data.get('funnel', {})

        async with get_db_session() as session:
            try:
                # First delete existing messages for this user
                await session.execute(
                    delete(UserMessages).where(UserMessages.user_id == user_id))
                
                # Insert new agenda messages
                for status, messages in agenda_messages.items():
                    for message_id, message_content in messages.items():
                        new_message = UserMessages(
                            user_id=user_id,
                            status=status,
                            message=message_content
                        )
                        session.add(new_message)
                
                # Insert new funnel messages
                for status, messages in funnel_messages.items():
                    for message_id, message_content in messages.items():
                        new_message = UserMessages(
                            user_id=user_id,
                            status=status,
                            message=message_content
                        )
                        session.add(new_message)
                
                await session.commit()
                return response.json({"message": "Messages updated successfully"})

            except SQLAlchemyError as e:
                await session.rollback()
                print(f"Database error during messages update: {str(e)}")
                return response.json(
                    {"error": "Database error occurred"},
                    status=500
                )

    except Exception as e:
        print(f"Unexpected error in update_messages: {str(e)}")
        return response.json(
            {"error": "An internal server error occurred"},
            status=500
        )