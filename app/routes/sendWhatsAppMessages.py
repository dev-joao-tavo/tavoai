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

app = Sanic.get_app()

# Function to fetch phone numbers for a given status
async def get_phone_numbers_by_status(status: str) -> List[str]:
    phone_numbers = []
    async with SessionLocal() as session:
        try:
            # Step 1: Fetch contact IDs from the cards table for the given status
            contact_ids_query = select(Card.contact_id).where(Card.status == status)
            contact_ids_result = await session.execute(contact_ids_query)
            contact_ids = [row[0] for row in contact_ids_result.fetchall()]

            # Step 2: Fetch phone numbers for the retrieved contact IDs in a single query
            if contact_ids:
                phone_numbers_query = select(Contact.phone_number).where(Contact.id.in_(contact_ids))
                phone_numbers_result = await session.execute(phone_numbers_query)
                phone_numbers = [row[0] for row in phone_numbers_result.fetchall()]
        except Exception as e:
            print(f"Error fetching phone numbers: {e}")
            raise
    return phone_numbers

@app.route("/sendMessage", methods=["POST"])
async def sendWhatsAppMessages(request):
    # Parse JSON data from the request
    data = request.json
    status = data.get("status")
    message1 = data.get("message1")
    message2 = data.get("message2")
    message3 = data.get("message3")

    # Validate required fields
    if not status:
        return response.json({"error": "Status is required"}, status=400)

    # Combine messages into a single text
    message_text = f"{message1}\n{message2}\n{message3}"
    #message_text = message1

    # Fetch phone numbers for the given status
    try:
        phone_numbers = await get_phone_numbers_by_status(status)
        if not phone_numbers:
            return response.json({"error": f"No contacts found for status: {status}"}, status=404)
    except Exception as e:
        return response.json({"error": f"Failed to fetch contacts: {str(e)}"}, status=500)

    # Initialize the Selenium driver
    driver = initialize_driver()

    # Send the message to each phone number
    for phone_number in phone_numbers:
        try:
            # Navigate to WhatsApp Web
            driver.get(f'https://web.whatsapp.com/send?phone={phone_number}')
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

        except Exception as e:
            # Log the error and continue with the next phone number
            print(f"Failed to send message to {phone_number}: {str(e)}")
            continue

    # Close the driver
    driver.quit()

    # Return success response
    return response.json({"status": "Messages sent!", "contacts": phone_numbers})