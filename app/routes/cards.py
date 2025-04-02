from sanic.response import json
from sanic import Sanic, response
from sanic.exceptions import BadRequest
from random import randint
from db import SessionLocal
from sqlalchemy import text, update, and_ # Import text from sqlalchemy
from models.models import Board, Contact, Card, User
from db import get_db_session
from sqlalchemy.future import select
from utils.utils import get_user_from_token
from sanic.exceptions import Unauthorized

from datetime import timedelta
from sanic.exceptions import Unauthorized, ServerError
from sqlalchemy.exc import SQLAlchemyError
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
                "sending_message_status": "NEVER_SENT",
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
                "sending_message_status":"NEVER_SENT"
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
    
from sanic import Blueprint
from sanic.response import json
from sanic.exceptions import BadRequest, NotFound
from models.models import MessageHistory, Contact
from db import get_db_session
from sqlalchemy.future import select
from sqlalchemy import func, and_
from utils.utils import get_user_from_token
from datetime import datetime
from sanic import Sanic


@app.get("/message-history")
async def get_message_history(request):
    """Get paginated message history with filters"""
    user_id = get_user_from_token(request)
    if not user_id:
        raise BadRequest("Invalid or expired token.")

    # Pagination
    page = int(request.args.get("page", 1))
    per_page = min(int(request.args.get("per_page", 10)), 100)  # Limit to 100 per page

    # Filters
    filters = [MessageHistory.user_id == user_id]
    
    # Date filters (ISO format: YYYY-MM-DD)
    if start_date := request.args.get("start_date"):
        try:
            filters.append(MessageHistory.sent_at >= datetime.fromisoformat(start_date))
        except ValueError:
            raise BadRequest("Invalid start_date format. Use ISO format (YYYY-MM-DD).")
    
    if end_date := request.args.get("end_date"):
        try:
            # Include the entire end date by adding time
            end_date_dt = datetime.fromisoformat(end_date).replace(hour=23, minute=59, second=59)
            filters.append(MessageHistory.sent_at <= end_date_dt)
        except ValueError:
            raise BadRequest("Invalid end_date format. Use ISO format (YYYY-MM-DD).")
    
    # Status filter (success/failed)
    if status := request.args.get("status"):
        if status.lower() == "success":
            filters.append(MessageHistory.success_count > 0)
        elif status.lower() == "failed":
            filters.append(MessageHistory.failure_count > 0)
        else:
            raise BadRequest("Status must be 'success' or 'failed'")

    async with get_db_session() as session:
        try:
            # Count total matching records
            count_result = await session.execute(
                select(func.count()).select_from(MessageHistory).where(*filters)
            )
            total = count_result.scalar()

            # Get paginated results
            result = await session.execute(
                select(MessageHistory)
                .where(*filters)
                .order_by(MessageHistory.sent_at.desc())
                .limit(per_page)
                .offset((page - 1) * per_page)
            )
            
            histories = result.scalars().all()
            
            return json({
                "data": [{
                    "id": h.id,
                    "message_content": h.message_content[:100] + "..." if len(h.message_content) > 100 else h.message_content,  # Preview
                    "success_count": h.success_count,
                    "failure_count": h.failure_count,
                    "total_recipients": h.total_recipients,
                    "sent_at": h.sent_at.isoformat(),
                    "channel": h.channel,
                    "is_completed": h.completed_at is not None
                } for h in histories],
                "pagination": {
                    "page": page,
                    "per_page": per_page,
                    "total": total,
                    "total_pages": max(1, (total + per_page - 1) // per_page)
                }
            })
            
        except Exception as e:
            return json({"error": f"Database error: {str(e)}"}, status=500)

@app.get("/message-history/<history_id:int>")
async def get_message_details(request, history_id: int):
    """Get detailed message history with recipient info"""
    user_id = get_user_from_token(request)
    if not user_id:
        raise BadRequest("Invalid or expired token.")

    async with get_db_session() as session:
        try:
            # Get the history record with user validation
            history_result = await session.execute(
                select(MessageHistory).where(
                    and_(
                        MessageHistory.id == history_id,
                        MessageHistory.user_id == user_id
                    )
                )
            )
            history = history_result.scalars().first()
            
            if not history:
                raise NotFound("Message history not found or not owned by user")

            # Get contacts in a single query
            all_recipient_ids = history.successful_recipients + history.failed_recipients
            contacts_result = await session.execute(
                select(Contact.id, Contact.contact_name, Contact.phone_number)
                .where(Contact.id.in_(all_recipient_ids))
            )
            contacts = {cid: {"name": name, "phone": phone} for cid, name, phone in contacts_result}

            return json({
                "id": history.id,
                "message_content": history.message_content,
                "sent_at": history.sent_at.isoformat(),
                "completed_at": history.completed_at.isoformat() if history.completed_at else None,
                "channel": history.channel,
                "stats": {
                    "success_rate": round(history.success_count / history.total_recipients * 100, 1) if history.total_recipients > 0 else 0,
                    "success_count": history.success_count,
                    "failure_count": history.failure_count,
                    "total_recipients": history.total_recipients
                },
                 "recipients": {
                    "successful": [{
                        "id": cid,
                        "name": contacts.get(cid, {}).get("name"),
                        "phone": contacts.get(cid, {}).get("phone"),
                        "delivered_at": None  # You would need to store this
                    } for cid in history.successful_recipients],
                    "failed": [{
                        "id": cid,
                        "name": contacts.get(cid, {}).get("name"),
                        "phone": contacts.get(cid, {}).get("phone"),
                        "error": "Failed to deliver"  # Should store actual error
                    } for cid in history.failed_recipients]
                }})
            
        except Exception as e:
            return json({"error": f"Database error: {str(e)}"}, status=500)
        
@app.get("/message-history/daily-count")  # Added missing leading slash
async def get_daily_message_count(request):
    """Returns the count of messages sent by the user today
    ---
    parameters:
      - name: date
        in: query
        type: string
        format: date
        required: true
        description: Date in YYYY-MM-DD format
    responses:
      200:
        description: Returns message count
        schema:
          type: object
          properties:
            count:
              type: integer
              description: Total messages sent on specified date
            limit:
              type: integer
              description: User's daily message limit
      400:
        description: Invalid request
      401:
        description: Unauthorized
    """
    # Authentication
    user_id = get_user_from_token(request)
    if not user_id:
        raise Unauthorized("Invalid or expired token.")

    # Input validation
    date_str = request.args.get("date")
    if not date_str:
        raise BadRequest("Date parameter is required (YYYY-MM-DD)")

    try:
        date = datetime.fromisoformat(date_str).date()
        next_day = date + timedelta(days=1)
    except ValueError as e:
        raise BadRequest(f"Invalid date format: {str(e)}. Use YYYY-MM-DD")

    async with get_db_session() as session:
        try:
            # Get user's daily limit (could be stored in user table)
            user = await session.get(User, user_id)
            daily_limit = getattr(user, 'daily_message_limit', 200)  # Default 200
            
            # Get count of messages sent
            result = await session.execute(
                select(func.coalesce(func.sum(MessageHistory.total_recipients), 0))
                .where(MessageHistory.user_id == user_id)
                .where(MessageHistory.sent_at >= date)
                .where(MessageHistory.sent_at < next_day)
            )
            count = result.scalar_one() or 0  # More explicit than scalar()
            
            return json({
                "count": count,
                "limit": daily_limit,
                "remaining": max(0, daily_limit - count)  # Prevent negative numbers
            })
            
        except SQLAlchemyError as e:
            raise ServerError("Database error occurred")


from datetime import datetime
from typing import Optional

@app.get("/contacts/<contact_id:int>")
async def get_contact(request, contact_id: int):
    """Get a single contact by ID"""
    user_id = get_user_from_token(request)
    if not user_id:
        raise BadRequest("Invalid or expired token.")

    async with get_db_session() as session:
        try:
            # Get contact with user validation
            contact_result = await session.execute(
                select(Contact).where(
                    and_(
                        Contact.id == contact_id,
                        Contact.user_id == user_id
                    )
                )
            )
            contact = contact_result.scalars().first()
            
            if not contact:
                raise NotFound("Contact not found or not owned by user")

            return json({
                "id": contact.id,
                "phone_number": contact.phone_number,
                "contact_name": contact.contact_name,
                "last_message_contact": contact.last_message_contact.isoformat() if contact.last_message_contact else None,
                "notes": contact.each_contact_notes
            })
            
        except Exception as e:
            return json({"error": f"Database error: {str(e)}"}, status=500)

@app.put("/contacts/<contact_id:int>")
async def update_contact(request, contact_id: int):
    """Update contact information"""
    user_id = get_user_from_token(request)
    if not user_id:
        raise BadRequest("Invalid or expired token.")

    data = request.json
    if not data:
        raise BadRequest("No data provided")

    async with get_db_session() as session:
        try:
            # Verify contact exists and belongs to user
            contact_result = await session.execute(
                select(Contact).where(
                    and_(
                        Contact.id == contact_id,
                        Contact.user_id == user_id
                    )
                )
            )
            contact = contact_result.scalars().first()
            
            if not contact:
                raise NotFound("Contact not found or not owned by user")

            # Update fields if they exist in request
            if "phone_number" in data:
                if not data["phone_number"]:
                    raise BadRequest("Phone number cannot be empty")
                contact.phone_number = data["phone_number"]
                
            if "contact_name" in data:
                contact.contact_name = data["contact_name"]
                
            if "each_contact_notes" in data:
                contact.each_contact_notes = data["each_contact_notes"]

            contact.last_message_contact = datetime.utcnow()
            await session.commit()

            return json({
                "success": True,
                "updated_contact": {
                    "id": contact.id,
                    "phone_number": contact.phone_number,
                    "contact_name": contact.contact_name,
                    "notes": contact.each_contact_notes,
                }
            })
            
        except Exception as e:
            await session.rollback()
            return json({"error": f"Database error: {str(e)}"}, status=500)

@app.patch("/contacts/<contact_id:int>/notes")
async def update_contact_notes(request, contact_id: int):
    """Update just the notes for a contact"""
    user_id = get_user_from_token(request)
    if not user_id:
        raise BadRequest("Invalid or expired token.")

    data = request.json
    if not data or "notes" not in data:
        raise BadRequest("Notes content is required")

    async with get_db_session() as session:
        try:
            # Verify contact exists and belongs to user
            contact_result = await session.execute(
                select(Contact).where(
                    and_(
                        Contact.id == contact_id,
                        Contact.user_id == user_id
                    )
                )
            )
            contact = contact_result.scalars().first()
            
            if not contact:
                raise NotFound("Contact not found or not owned by user")

            # Update notes
            contact.each_contact_notes = data["notes"]
            contact.last_message_contact = datetime.utcnow()
            await session.commit()

            return json({
                "success": True,
                "id": contact.id,
                "updated_notes": contact.each_contact_notes,
            })
            
        except Exception as e:
            await session.rollback()
            return json({"error": f"Database error: {str(e)}"}, status=500)