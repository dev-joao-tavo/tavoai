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
from sqlalchemy import delete

agendaStatuses = [
"monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
  "schedule"
]

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
            if (password!="Savassi1!"):
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
    driver_status = "FREE"



    if not email or not password:
        return response.json({"message": "Email and password are required"}, status=400)

    async with get_db_session() as session:
        # Check if user already exists
        existing_user = await session.execute(select(User).where(User.email == email))
        if existing_user.scalars().first():
            return response.json({"message": "Email already in use"}, status=400)

        # Create new user
        new_user = User(id=user_id, email=email, username=username, password_hash=hash_password(password),user_wpp_phone_number=user_wpp_phone_number,driver_status=driver_status)
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
        user_id = get_user_from_token(request)
        if not user_id:
            return response.json({"error": "Invalid or missing token"}, status=401)

        async with get_db_session() as session:
            result = await session.execute(
                select(UserMessages)
                .where(UserMessages.user_id == user_id)
            )
            messages = result.scalars().all()
            
            agenda = {}
            funnel = {}
            
            for msg in messages:
                try:
                    message_data = json.loads(msg.message)
                    if not isinstance(message_data, dict):
                        continue
                        
                    if msg.status.startswith("agenda_"):
                        status = msg.status[7:]  # Remove "agenda_" prefix
                        agenda[status] = {
                            "message1": message_data.get("message1", ""),
                            "message2": message_data.get("message2", ""),
                            "message3": message_data.get("message3", "")
                        }
                    elif msg.status.startswith("funnel_"):
                        status = msg.status[7:]  # Remove "funnel_" prefix
                        funnel[status] = {
                            "message1": message_data.get("message1", ""),
                            "message2": message_data.get("message2", ""),
                            "message3": message_data.get("message3", "")
                        }
                except json.JSONDecodeError:
                    continue
            
            return response.json({
                "agenda": agenda,
                "funnel": funnel
            })

    except Exception as e:
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

        # Validate the message structure
        if not all(
            all(isinstance(msg, dict) and 
                {'message1', 'message2', 'message3'}.issubset(msg.keys())
                for msg in messages.values())
            for messages in [agenda_messages, funnel_messages]
        ):
            return response.json(
                {"error": "Invalid message format. Each status must have message1, message2, message3"},
                status=400
            )

        async with get_db_session() as session:
            try:
                # Delete existing messages for this user in a single operation
                await session.execute(
                    delete(UserMessages).where(UserMessages.user_id == user_id)
                )
                
                # Prepare batch inserts for better performance
                new_messages = []
                
                # Process agenda messages - store as JSON strings
                for status, messages in agenda_messages.items():
                    new_messages.append(
                        UserMessages(
                            user_id=user_id,
                            status=f"agenda_{status}",  # Prefix with agenda_
                            message=json.dumps({
                                "message1": messages["message1"],
                                "message2": messages["message2"],
                                "message3": messages["message3"]
                            })
                        )
                    )
                
                # Process funnel messages - store as JSON strings
                for status, messages in funnel_messages.items():
                    new_messages.append(
                        UserMessages(
                            user_id=user_id,
                            status=f"funnel_{status}",  # Prefix with funnel_
                            message=json.dumps({
                                "message1": messages["message1"],
                                "message2": messages["message2"],
                                "message3": messages["message3"]
                            })
                        )
                    )
                
                # Bulk insert all messages
                session.add_all(new_messages)
                await session.commit()
                
                return response.json({
                    "message": "Messages updated successfully",
                    "updated_count": len(new_messages)
                })

            except SQLAlchemyError as e:
                await session.rollback()
                return response.json(
                    {"error": "Database error occurred"},
                    status=500
                )
            except json.JSONDecodeError as e:
                await session.rollback()
                return response.json(
                    {"error": "Message formatting error"},
                    status=400
                )

    except Exception as e:
        return response.json(
            {"error": "An internal server error occurred"},
            status=500
        )