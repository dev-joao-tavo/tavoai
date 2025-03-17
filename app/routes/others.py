
from sanic import Sanic, response
import jwt
from db import SessionLocal
from sqlalchemy import text  # Import text from sqlalchemy
from sanic.exceptions import Unauthorized
from utils.utils import SECRET_KEY
from models.models import Board
from sqlalchemy.future import select

app = Sanic.get_app()


@app.route("/cards/<card_id>/messages", methods=["GET"])
async def get_messages(request, card_id):
    try:
        card_id = int(card_id)  # Ensure it's an integer

        async with SessionLocal() as session:
            result = await session.execute(
                text("SELECT id, sender, message, timestamp FROM messages WHERE card_id = :card_id"),
                {"card_id": card_id}
            )
            messages = result.fetchall()

        # Convert results into a properly structured list
        messages_list = [
            {
                "id": row[0],
                "sender": str(row[1]),  # Ensure sender is a string
                "message": row[2],  # Ensure message contains the actual text
                "timestamp": str(row[3])  # Convert timestamp to string
            }
            for row in messages
        ]

        return response.json({"messages": messages_list})

    except ValueError:
        return response.json({"error": "Invalid card_id, must be an integer"}, status=400)

@app.route("/boards/<board_id>/cards", methods=["GET"])
async def get_cards(request, board_id):
    try:
        board_id = int(board_id)
        async with SessionLocal() as session:
            result = await session.execute(
                text("SELECT id, title, status, contact_ID FROM cards WHERE board_id = :board_id"),
                {"board_id": board_id}
            )
            cards = result.fetchall()
        
        cards_list = [
            {"id": row[0], "title": row[1], "status": row[2], "contact_ID": row[3]}  # Added contact_ID
            for row in cards
        ]

        return response.json({"cards": cards_list})

    except ValueError:
        return response.json({"error": "Invalid board_id"}, status=400)


# Helper function to decode the JWT and get the current user
def get_user_from_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload["user_id"]  # assuming the token contains 'user_id' of the user
    except jwt.ExpiredSignatureError:
        raise Unauthorized("Token has expired.")
    except jwt.InvalidTokenError:
        raise Unauthorized("Invalid token.")

# Define the route to fetch boards
@app.route("/boards", methods=["GET"])
async def get_boards(request):
    # Extract the JWT token from the request headers
    token = request.headers.get("Authorization")
    if not token:
        raise Unauthorized(f"Authorization token is missing. Token: {token}; Headers: {request.headers}")
    
    # Remove 'Bearer ' prefix if it exists
    if token.startswith("Bearer "):
        token = token[7:]

    user_id = get_user_from_token(token)

    # Now query boards for the specific user
    async with SessionLocal() as session:
        result = await session.execute(select(Board).filter(Board.user_id == user_id))
        boards = result.scalars().all()

    # Include board_type in the response
    boards_list = [{"id": board.id, "name": board.name, "board_type": board.board_type} for board in boards]

    return response.json({"boards": boards_list})
   
@app.route("/cards/<card_id>/reorder", methods=["POST"])
async def reorder_messages(request, card_id):
    try:
        card_id = int(card_id)  # Ensure card_id is an integer
        data = request.json  # Get new order data from the request
        new_order = data.get("order")

        if not new_order:
            return response.json({"error": "Order data is required"}, status=400)

        async with SessionLocal() as session:
            for index, message_id in enumerate(new_order):
                await session.execute(
                    text("UPDATE messages SET position = :position WHERE id = :message_id AND card_id = :card_id"),
                    {"position": index, "message_id": message_id, "card_id": card_id}
                )
            await session.commit()

        return response.json({"status": "Messages reordered!"})

    except ValueError:
        return response.json({"error": "Invalid card_id"}, status=400)

@app.route("/contacts", methods=["GET"])
async def get_contacts(request):
    token = request.headers.get("Authorization")
    if not token:
        raise Unauthorized("Authorization token is missing.")

    token = token[7:] if token.startswith("Bearer ") else token
    user_id = get_user_from_token(token)
    if not user_id:
        raise Unauthorized("Invalid or expired token.")

    async with SessionLocal() as session:
        result = await session.execute(
            text("SELECT id, phone_number, contact_name, last_message_contact FROM contacts WHERE user_id = :user_id"),
            {"user_id": user_id}
        )
        contacts = result.fetchall()

    contacts_list = [
    {
        "ID": row[0], 
        "phone_number": row[1], 
        "contact_name": row[2], 
        "last_message_contact": row[3].isoformat() if row[3] else None  # Convert datetime to string
    }
    for row in contacts
]


    return response.json({"contacts": contacts_list})

@app.route("/cards/<card_id>", methods=["PATCH"])
async def update_card_status(request, card_id):
    try:
        card_id = int(card_id)  # Ensure card_id is an integer
        data = request.json  # Get the new status from the request
        new_status = data.get("status")
        board_id = int(data.get("board_id"))

        async with SessionLocal() as session:
            await session.execute(
                text("UPDATE cards SET status = :status, board_id = :board_id WHERE id = :card_id"),
                {"status": new_status, "board_id": board_id, "card_id": card_id}
            )

            await session.commit()

        return response.json({"status": "Card updated!"})

    except ValueError as e:
        return response.json({"error": "Invalid card_id","Error:": card_id}, status=400)
    
@app.middleware("response")
async def add_cors_headers(request, response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
