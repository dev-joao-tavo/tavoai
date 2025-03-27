from sanic.response import json
from sanic import Sanic, response
from sanic.exceptions import BadRequest
from random import randint
from db import SessionLocal
from sqlalchemy import text, update, and_ # Import text from sqlalchemy
from models.models import Board, Contact, Card
from db import get_db_session
from sqlalchemy.future import select
from utils.utils import get_user_from_token
from sanic.exceptions import Unauthorized

import csv
import io

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
                "user_id": user_id,
                "sending_message_status": "OK",
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
                "sending_message_status":"OK"
            }

            # Insert card into the database
            await session.execute(
                text("INSERT INTO cards (id, title, status, board_id, contact_ID, sending_message_status) VALUES (:id, :title, :status, :board_id, :contact_ID, :sending_message_status) ON CONFLICT (id) DO NOTHING"),
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
        
@app.post("/import-contacts")
async def import_contacts(request):
    # Authentication
    user_id = get_user_from_token(request)
    if not user_id:
        raise Unauthorized("Invalid or expired token.")

    # Validate request contains file and required fields
    if 'csv_file' not in request.files:
        raise BadRequest("No CSV file uploaded")
    
    board_id = request.form.get("board_id")
    status = request.form.get("status")
    
    if not board_id or not status:
        raise BadRequest("Missing board_id or status")

    # Get the uploaded file
    csv_file = request.files['csv_file'][0]
    if not csv_file.name.endswith('.csv'):
        raise BadRequest("File must be a CSV")

    # Process CSV
    success_count = 0
    error_count = 0
    errors = []
    
    try:
        # Read and decode the file
        file_content = csv_file.body.decode('utf-8-sig')
        csv_reader = csv.DictReader(io.StringIO(file_content))
        
        # Validate CSV headers
        if not all(col in csv_reader.fieldnames for col in ['Numero', 'Nome']):
            raise BadRequest("CSV must contain 'Numero' and 'Nome' columns")

        async with get_db_session() as session:
            # Verify board exists and belongs to user
            board = await session.execute(
                select(Board).where(
                    and_(
                        Board.id == int(board_id),
                        Board.user_id == user_id
                    )
                )
            )
            board = board.scalars().first()
            if not board:
                raise BadRequest(f"Board with id={board_id} not found or doesn't belong to user")

            # Process each row
            for row_num, row in enumerate(csv_reader, start=2):  # row_num starts at 2
                try:
                    phone_number = row['Numero'].strip()
                    contact_name = row['Nome'].strip()
                    
                    if not phone_number or not contact_name:
                        errors.append(f"Row {row_num}: Missing phone number or name")
                        error_count += 1
                        continue

                    # Check if contact already exists for this user
                    existing_contact = await session.execute(
                        select(Contact).where(
                            and_(
                                Contact.phone_number == phone_number,
                                Contact.user_id == user_id
                            )
                        )
                    )
                    existing_contact = existing_contact.scalars().first()

                    if existing_contact:
                        contact_id = existing_contact.id
                        # Update contact name if different
                        if existing_contact.contact_name != contact_name:
                            await session.execute(
                                update(Contact)
                                .where(Contact.id == contact_id)
                                .values(contact_name=contact_name)
                            )
                    else:
                        # Create new contact
                        contact = Contact(
                            phone_number=phone_number,
                            contact_name=contact_name,
                            user_id=user_id
                        )
                        session.add(contact)
                        await session.flush()  # To get the generated ID
                        contact_id = contact.id

                    # Create card (or update if exists)
                    existing_card = await session.execute(
                        select(Card).where(
                            and_(
                                Card.board_id == int(board_id),
                                Card.contact_id == contact_id
                            )
                        )
                    )
                    existing_card = existing_card.scalars().first()

                    if existing_card:
                        # Update existing card
                        await session.execute(
                            update(Card)
                            .where(Card.id == existing_card.id)
                            .values(
                                title=contact_name,
                                status=status
                            )
                        )
                    else:
                        # Create new card
                        card = Card(
                            board_id=int(board_id),
                            contact_id=contact_id,
                            title=contact_name,
                            status=status
                        )
                        session.add(card)

                    success_count += 1

                except IntegrityError as e:
                    errors.append(f"Row {row_num}: Database integrity error - {str(e)}")
                    error_count += 1
                    await session.rollback()
                    continue
                except Exception as e:
                    errors.append(f"Row {row_num}: {str(e)}")
                    error_count += 1
                    await session.rollback()
                    continue

            await session.commit()

        return response.json({
            "message": "Import completed",
            "success_count": success_count,
            "error_count": error_count,
            "errors": errors
        })

    except Exception as e:
        return response.json({
            "error": str(e),
            "success_count": success_count,
            "error_count": error_count,
            "errors": errors
        }, status=500)