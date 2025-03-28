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

app = Sanic.get_app()

@app.get("/daily-count")
async def get_daily_message_count(request):
    user_id = get_user_from_token(request)
    if not user_id:
        raise BadRequest("Invalid or expired token.")

    date_str = request.args.get("date")
    if not date_str:
        raise BadRequest("Date parameter is required")

    try:
        date = datetime.fromisoformat(date_str).date()
        next_day = date + timedelta(days=1)
    except ValueError:
        raise BadRequest("Invalid date format. Use YYYY-MM-DD")

    async with get_db_session() as session:
        result = await session.execute(
            select(func.sum(MessageHistory.total_recipients))
            .where(MessageHistory.user_id == user_id)
            .where(MessageHistory.sent_at >= date)
            .where(MessageHistory.sent_at < next_day)
        )
        count = result.scalar() or 0
        
    return json({"count": count})

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