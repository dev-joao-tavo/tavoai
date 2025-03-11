from sanic import Sanic, response
from db import SessionLocal, get_db_session
from sqlalchemy import select
from typing import List
import time
from models.models import Card, Contact, Board
from routes.others import get_user_from_token
from sanic.exceptions import Unauthorized
from selenium.webdriver.common.by import By
import time
from routes.configs import initialize_driver

app = Sanic.get_app()

from typing import List, Tuple

async def get_phone_numbers_and_names_by_status_and_board(status: str, board_id: int) -> List[Tuple[str, str]]:
    phone_numbers_and_names = []
    async with SessionLocal() as session:
        try:
            # Fetch contact IDs from the cards table for the given status and board_id
            contact_ids_query = select(Card.contact_id).where(
                Card.status == status,
                Card.board_id == board_id,
            )
            contact_ids_result = await session.execute(contact_ids_query)
            contact_ids = [row[0] for row in contact_ids_result.fetchall()]

            # Fetch phone numbers and contact names for the retrieved contact IDs in a single query
            if contact_ids:
                phone_numbers_and_names_query = select(Contact.phone_number, Contact.contact_name).where(Contact.id.in_(contact_ids))
                phone_numbers_and_names_result = await session.execute(phone_numbers_and_names_query)
                phone_numbers_and_names = [(row[0], row[1]) for row in phone_numbers_and_names_result.fetchall()]
        except Exception as e:
            print(f"Error fetching phone numbers and names: {e}")
            raise
    return phone_numbers_and_names

    
# **Sanic Route: Send WhatsApp Messages**
@app.route("/sendMessage", methods=["POST"])
async def send_whatsapp_messages(request):
    token = request.headers.get("Authorization")
    if not token:
        raise Unauthorized("Authorization token is missing.")

    token = token[7:] if token.startswith("Bearer ") else token
    user_id = get_user_from_token(token)
    if not user_id:
        raise Unauthorized("Invalid or expired token.")

    try:
        data = request.json
        status = data.get("status")
        message1 = data.get("message1")
        message2 = data.get("message2")
        message3 = data.get("message3")

        if not status or not message1:
            return response.json({"error": "status and at least message1 are required."}, status=400)


    except Exception as e:
        return response.json({"error": "Invalid request body."}, status=400)

    async with get_db_session() as session:
        result = await session.execute(select(Board).filter(Board.user_id == user_id))
        board = result.scalars().first()

    if not board:
       return response.json({"error": "Board not found for user."}, status=404)

    try:
        phone_numbers_and_names = await get_phone_numbers_and_names_by_status_and_board(status, board.id)
        if not phone_numbers_and_names:
            return response.json(
                {"error": f"No contacts found for status: {status} and board_id: {board.id}"},
                status=404,
            )
    except Exception as e:
        return response.json({"error": f"Failed to fetch contacts: {str(e)}"}, status=500)
    
    for phone_number, name in phone_numbers_and_names:
        # Start WebDriver
        driver = initialize_driver()
        

        # Open WhatsApp Web (you should already be logged in)
        driver.get(f"https://web.whatsapp.com/send/?phone=+55{phone_number}")

        # Wait for page to fully load
        time.sleep(10)

        # Find the message input field
        message_box = driver.find_element(By.XPATH, '//div[@aria-label="Digite uma mensagem"]')

        message_text = f"{message1}\n{message2}\n{message3}" if message2 and message3 else message1

        message_text = message_text.replace("[nome]", name)  # Replace [nome] with the contact name
    
        message_box.send_keys(message_text)
        time.sleep(1)

        # Find and click the send button
        send_button = driver.find_element(By.XPATH, '//span[@data-icon="send"]')
        send_button.click()

        print(f"Message to {phone_number} was sent successfully")

    # Close browser after a short delay
    time.sleep(5)
    driver.quit()

    return response.json({"message": "Messages sent!"})
