from sanic.response import json
from sanic import Sanic, response
from sanic.exceptions import BadRequest
from random import randint
from db import SessionLocal
from sqlalchemy import text  # Import text from sqlalchemy
from models.models import Board
from db import get_db_session
from sqlalchemy.future import select
from utils.utils import get_user_from_token
from sanic.exceptions import Unauthorized

app = Sanic.get_app()


from sqlalchemy.exc import IntegrityError

@app.post("/addCardandContact")
async def add_card_and_contact(request):
    # Extract data from the request body
    phone_number = request.json.get("phone_number")
    contact_name = request.json.get("contact_name")
    board_id = request.json.get("board_id")  
    status = request.json.get("status")  

    user_id = get_user_from_token(request)
    if not user_id:
        raise Unauthorized("Invalid or expired token.")

    # Validate required fields
    if not phone_number or not contact_name or not board_id or not status:
        raise BadRequest(f"Missing phone_number: {phone_number}, contact_name: {contact_name}, board_id: {board_id}, or status: {status}")

    async with get_db_session() as session:  # Use async with here
        try:
            result = await session.execute(select(Board).where(Board.id == int(board_id)))
            board = result.scalars().first()

            if not board:
                raise Exception(f"Board with id={board_id} does not exist")

            # Generate a random contact ID
            contact_id = randint(10, 99909909)
            contact = {
                "id": contact_id,
                "phone_number": phone_number,
                "contact_name": contact_name,
                "user_id": user_id
            }

            # Insert contact into the database
            await session.execute(
                text("INSERT INTO contacts (id, phone_number, contact_name, user_id) VALUES (:id, :phone_number, :contact_name, :user_id) ON CONFLICT (id) DO NOTHING"),
                contact,
            )

            # Generate a random card ID
            card_id = randint(10, 99999999)
            card = {
                "id": card_id,
                "title": contact_name,
                "status": status,  # Use the status from the frontend
                "board_id": int(board_id),  # Use the board_id from the frontend
                "contact_ID": contact_id,
            }

            # Insert card into the database
            await session.execute(
                text("INSERT INTO cards (id, title, status, board_id, contact_ID) VALUES (:id, :title, :status, :board_id, :contact_ID) ON CONFLICT (id) DO NOTHING"),
                card,
            )

            # Commit the transaction
            await session.commit()

            # Return a success response
            return json({"message": "Card and contact added successfully", "card": card})

        except IntegrityError as e:
            await session.rollback()
            if "contacts_phone_number_key" in str(e):
                return json({"error": "Esse contato já existe e não pode ser adicionado novamente"}, status=400)
            else:
                return json({"error": "An unexpected error occurred."}, status=500)
        except Exception as e:
            await session.rollback()
            return json({"error": str(e)}, status=500)

@app.delete("/removeCardandContact")
async def remove_card_and_contact(request):
    # Extract data from the request body
    card_id = request.json.get("card_id")

    # Validate required field
    if not card_id:
        raise BadRequest("Missing card_id")

    async with SessionLocal() as session:
        try:
            # Retrieve the contact ID associated with the card
            result = await session.execute(
                text("SELECT contact_ID FROM cards WHERE id = :card_id"),
                {"card_id": card_id},
            )
            contact_id = result.scalar()  # Extract the single value

            if not contact_id:
                return response.json({"error": "Card not found or has no associated contact"}, status=404)

            # Delete the card first
            await session.execute(
                text("DELETE FROM cards WHERE id = :card_id"),
                {"card_id": card_id},
            )

            # Delete the contact (if needed)
            await session.execute(
                text("DELETE FROM contacts WHERE id = :contact_id"),
                {"contact_id": contact_id},
            )

            # Commit the transaction
            await session.commit()

            return response.json({"message": "Card and contact deleted successfully"})

        except Exception as e:
            # Rollback transaction in case of an error
            await session.rollback()
            return response.json({"error": str(e)}, status=500)