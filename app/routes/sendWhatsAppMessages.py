from sanic import Sanic, response
from db import SessionLocal, get_db_session
from sqlalchemy import select
from typing import List
import time
import asyncio
from routes.configs import initialize_browser
from models.models import Card, Contact, Board
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


# **Async Function: Send WhatsApp Message**
import asyncio
import qrcode_terminal

async def send_whatsapp_message(browser, phone_number: str, message_text: str):
    try:
        # Create a new page
        page = await browser.new_page()

        # Navigate to WhatsApp Web
        await page.goto("https://web.whatsapp.com")
        print("Opened WhatsApp Web.")

        # Wait for QR code to appear
        try:
            page_content = await page.content()

            # Print the full HTML content of the page
            print("\n\n==== PAGE CONTENT ====\n")
            print(page_content)
            print("\n======================\n")
            
            qr_code_selector = 'canvas[aria-label="Scan this QR code to link a device!"]'
            await page.wait_for_selector(qr_code_selector, timeout=10000)
            print("QR code loaded. Displaying in terminal...")

            # Take a screenshot of the QR code
            qr_code_element = await page.query_selector(qr_code_selector)
            qr_code_screenshot = await qr_code_element.screenshot()
            
            # Display the QR code in the terminal
            qrcode_terminal.draw(qr_code_screenshot)
        except Exception as e:
            print("Failed to load QR code.", e)
            await page.close()
            return phone_number, "failed: QR code not found"

        # Wait for the chat list to appear (indicating successful login)
        await page.wait_for_selector('div[aria-label="Chat list"]', timeout=120000)
        print("Logged in successfully. Navigating to the chat...")

        # Navigate to the specific chat
        await page.goto(f"https://web.whatsapp.com/send?phone={phone_number}")
        print(f"Navigated to chat with {phone_number}.")

        # Wait for the message input box to appear
        try:
            message_box = await page.wait_for_selector('div[aria-label="Digite uma mensagem"]', timeout=30000)
            await message_box.fill(message_text)
            print("Message typed.")
        except Exception as e:
            print("Failed to find the message input box.")
            await page.close()
            return phone_number, "failed: message input box not found"

        # Click the send button
        try:
            send_button = await page.wait_for_selector('button[aria-label="Enviar"]', timeout=10000)
            await send_button.click()
            print("Message sent.")
        except Exception as e:
            print("Failed to find the send button.")
            await page.close()
            return phone_number, "failed: send button not found"

        # Wait for a few seconds to ensure the message is sent
        await asyncio.sleep(3)

        # Close the page
        await page.close()
        print("Page closed.")

        return phone_number, "success"

    except Exception as e:
        print(f"An error occurred: {e}")
        await page.close()
        return phone_number, f"failed: {str(e)}"

    
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

        message_text = f"{message1}\n{message2}\n{message3}" if message2 and message3 else message1

    except Exception as e:
        return response.json({"error": "Invalid request body."}, status=400)

    async with get_db_session() as session:
        result = await session.execute(select(Board).filter(Board.user_id == user_id))
        board = result.scalars().first()

    if not board:
        return response.json({"error": "Board not found for user."}, status=404)

    try:
        phone_numbers = await get_phone_numbers_by_status_and_board(status, board.id)
        if not phone_numbers:
            return response.json(
                {"error": f"No contacts found for status: {status} and board_id: {board.id}"},
                status=404,
            )
    except Exception as e:
        return response.json({"error": f"Failed to fetch contacts: {str(e)}"}, status=500)

    # **Initialize Async Playwright Browser**
    browser = await initialize_browser(user_id, board.user_id)

    # **Send Messages Concurrently**
    tasks = [send_whatsapp_message(browser, phone, message_text) for phone in phone_numbers]
    results = await asyncio.gather(*tasks)

    # **Close Browser**
    await browser.close()

    successful_sends = [phone for phone, status in results if status == "success"]
    failed_sends = [phone for phone, status in results if status == "failed"]

    return response.json(
        {
            "status": "Messages sent!",
            "successful_sends": successful_sends,
            "failed_sends": failed_sends,
        }
    )