from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from sanic import Sanic, response
from db import SessionLocal
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import time
import asyncio
from routes.configs import login, initialize_driver
from models.models import Card, Contact
from routes.others import get_user_from_token
from sanic.exceptions import Unauthorized

app = Sanic.get_app()

# Function to fetch phone numbers for a given status and board_id
async def get_phone_numbers_by_status_and_board(status: str, board_id: int) -> List[str]:
    phone_numbers = []
    async with SessionLocal() as session:
        try:
            # Fetch contact IDs from the cards table for the given status and board_id
            contact_ids_query = select(Card.contact_id).where(
                Card.status == status,
                Card.board_id == board_id,
            )
            contact_ids_result = await session.execute(contact_ids_query)
            contact_ids = [row[0] for row in contact_ids_result.fetchall()]

            # Fetch phone numbers for the retrieved contact IDs in a single query
            if contact_ids:
                phone_numbers_query = select(Contact.phone_number).where(Contact.id.in_(contact_ids))
                phone_numbers_result = await session.execute(phone_numbers_query)
                phone_numbers = [row[0] for row in phone_numbers_result.fetchall()]
        except Exception as e:
            print(f"Error fetching phone numbers: {e}")
            raise
    return phone_numbers

@app.route("/sendMessage", methods=["POST"])
async def send_whatsapp_messages(request):
    # Extract the JWT token from the request headers
    token = request.headers.get("Authorization")
    if not token:
        raise Unauthorized("Authorization token is missing.")

    # Remove 'Bearer ' prefix if it exists
    if token.startswith("Bearer "):
        token = token[7:]

    # Decode the token to get the user ID
    user_id = get_user_from_token(token)
    if not user_id:
        raise Unauthorized("Invalid or expired token.")

    # Parse JSON data from the request
    try:
        data = request.json
        status = data.get("status")
        board_id = data.get("board_id")
        message1 = data.get("message1")
        message2 = data.get("message2")
        message3 = data.get("message3")

        # Validate required fields
        if not all([status, board_id, message1]):
            return response.json(
                {"error": "status, board_id, and at least message1 are required."},
                status=400,
            )
    except Exception as e:
        return response.json({"error": "Invalid request body."}, status=400)

    # Combine messages into a single text
    message_text = f"{message1}\n{message2}\n{message3}" if message2 and message3 else message1

    # Fetch phone numbers for the given status and board_id
    try:
        phone_numbers = await get_phone_numbers_by_status_and_board(status, board_id)
        if not phone_numbers:
            return response.json(
                {"error": f"No contacts found for status: {status} and board_id: {board_id}"},
                status=404,
            )
    except Exception as e:
        return response.json({"error": f"Failed to fetch contacts: {str(e)}"}, status=500)

    # Initialize the Selenium driver
    driver = initialize_driver(user_id)

    # Send the message to each phone number
    successful_sends = []
    failed_sends = []

    for phone_number in phone_numbers:
        try:
            # Navigate to WhatsApp Web
            driver.get(f"https://web.whatsapp.com/send?phone={phone_number}")
            time.sleep(5)

            # Wait for the message input box to load
            message_box = WebDriverWait(driver, 30).until(
                EC.presence_of_element_located(
                    (By.XPATH, '//div[@aria-label="Digite uma mensagem"]')
                )
            )
            # Enter the message text
            message_box.send_keys(message_text)

            # Click the send button
            WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, '//button[@aria-label="Enviar"]'))
            ).click()

            # Wait for the message to be sent
            time.sleep(3)

            # Log successful sends
            successful_sends.append(phone_number)
        except Exception as e:
            # Log the error and continue with the next phone number
            print(f"Failed to send message to {phone_number}: {str(e)}")
            failed_sends.append(phone_number)

    # Close the Selenium driver
    driver.quit()

    # Return success response with details
    return response.json(
        {
            "status": "Messages sent!",
            "successful_sends": successful_sends,
            "failed_sends": failed_sends,
        }
    )