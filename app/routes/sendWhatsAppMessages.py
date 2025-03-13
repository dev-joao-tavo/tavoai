from sanic import Sanic, response
from db import SessionLocal, get_db_session
from sqlalchemy import select
from typing import List
import time
from models.models import Card, Contact, Board, User
from routes.others import get_user_from_token
from sanic.exceptions import Unauthorized
from selenium.webdriver.common.by import By
import time
from routes.configs import initialize_driver
import asyncio

import time
import random

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


async def get_wpp_login_code(driver, user_phone_number):
    try:
        driver.get(f"https://web.whatsapp.com/")

        # Wait for page to fully load
        await asyncio.sleep(random.uniform(8, 12))  # Random sleep to simulate loading time

        # Click on the chevron icon
        chevron_button = driver.find_element(By.CSS_SELECTOR, '[data-icon="chevron"]')
        chevron_button.click()
        await asyncio.sleep(2)

        # Find the phone input field using a more specific CSS selector
        phone_input = driver.find_element(By.CSS_SELECTOR, "input[aria-label='Insira seu número de telefone.']")
        phone_input.clear()  # Clear the field before entering the new number
        phone_input.send_keys(f"{user_phone_number}")
        await asyncio.sleep(1)

        # Click on the "Next" button
        next_button = driver.find_element(By.XPATH, "//div[contains(text(), 'Avançar')]")
        next_button.click()
        await asyncio.sleep(3)  # Wait for the next screen to load

        # Get the login code
        code_div = driver.find_element(By.CSS_SELECTOR, '[data-link-code]')
        login_code = code_div.get_attribute("data-link-code")

        print("WhatsApp Web Login Code:", login_code)
        return login_code
        
    except Exception as e:
        print(f"Error capturing QR code: {e}")
        return None

    
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
       # Run Selenium in a background thread
    
    asyncio.create_task(send_whatsapp_messages_async(user_id, phone_numbers_and_names, message1, message2, message3))

    return response.json({"message": "WhatsApp messages are being sent in the background."})

async def send_whatsapp_messages_async(user_id, phone_numbers_and_names, message1, message2, message3):
    """Runs Selenium in a non-blocking background task"""
    driver = await asyncio.to_thread(initialize_driver, user_id)

    try:
        for phone_number, name in phone_numbers_and_names:
            # Open WhatsApp Web (you should already be logged in)
            driver.get(f"https://web.whatsapp.com/send/?phone=+55{phone_number}")

            # Wait for page to fully load
            await asyncio.sleep(random.uniform(8, 12))  # Random sleep to simulate loading time

            # Find the message input field
            message_box = driver.find_element(By.XPATH, '//div[@aria-label="Digite uma mensagem"]')

            # Prepare the messages
            messages = [message1.replace("[nome]", name), message2.replace("[nome]", name), message3.replace("[nome]", name)]

            # Loop through each message and send one at a time
            for message in messages:
                if message:  # Check if the message is not empty
                    message_text = message.replace("[nome]", name)  # Replace [nome] with the contact name
                    
                    # Simulate typing effect
                    for char in message_text:
                        message_box.send_keys(char)
                        await asyncio.sleep(random.uniform(0.1, 0.3))  # Random delay between typing each character

                    # Wait a little before sending the message
                    await asyncio.sleep(random.uniform(1, 2))  # Random delay before clicking send

                    # Find and click the send button
                    send_button = driver.find_element(By.XPATH, '//span[@data-icon="send"]')
                    send_button.click()

                    print(f"Message to {phone_number} was sent successfully: {message_text}")

                    await asyncio.sleep(random.uniform(3, 5))  # Random delay between sending messages

        # Close browser after a short delay
        await asyncio.sleep(1)
        driver.quit()

        return response.json({"message": "Messages sent!"})

    except:
        return response.json({"message": "login before sending a message;"})

@app.route("/whatsAppLogin", methods=["get"])
async def whats_app_login(request):
    try:
        token = request.headers.get("Authorization")
        if not token:
            raise Unauthorized("Authorization token is missing.")

        token = token[7:] if token.startswith("Bearer ") else token
        user_id = get_user_from_token(token)
        if not user_id:
            raise Unauthorized("Invalid or expired token.")
    
    except Exception as e:
        return response.json({"error": "Invalid request body."}, status=400)
    
    try:        
        async with get_db_session() as session:
            result = await session.execute(select(User).filter(User.id == user_id))
            user = result.scalars().first()
        driver = await asyncio.to_thread(initialize_driver, user_id)

        user_phone_number= user.user_wpp_phone_number

        code = await get_wpp_login_code(driver,user_phone_number)
        await asyncio.sleep(1)
        
    except:

        driver.quit()

    return response.json({"message": "Add this code  to your WhatsApp","code":code})