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
from playwright.async_api import async_playwright

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
import os

async def get_qrcode(phone, message_text):
    async with async_playwright() as p:
        # Launch the browser with a custom user-agent and disable automation flags
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            bypass_csp=True,  # Bypass Content Security Policy if needed
        )
        page = await context.new_page()

        try:
            # Navigate to WhatsApp Web
            print("Navigating to WhatsApp Web...")
            await page.goto('https://web.whatsapp.com', timeout=60000)  # 60 seconds timeout

            # Check if the URL is correct
            current_url = page.url
            print("Current URL:", current_url)
            if "web.whatsapp.com" not in current_url:
                raise Exception("Not on WhatsApp Web. Current URL: " + current_url)

            # Debug: Take a screenshot of the entire page
            await page.screenshot(path='whatsapp_page.png')
            print("Screenshot of the page saved as 'whatsapp_page.png'")

            # Wait for the QR code element to appear
            print("Waiting for QR code...")
            time.sleep(30)
            await page.screenshot(path='whatsapp_page_before_closing.png')

            qr_code = await page.wait_for_selector('canvas', timeout=60000)  # Wait up to 60 seconds

            # Verify the QR code element
            if await qr_code.is_visible():
                print("QR code is visible on the page.")
            else:
                raise Exception("QR code is not visible.")

            # Take a screenshot of the QR code
            await qr_code.screenshot(path='qrcode.png')
            print("QR code saved as 'qrcode.png'")

        except Exception as e:
            print(f"An error occurred: {e}")

        finally:
            # Close the browser
            await page.screenshot(path='whatsapp_page_before_closing.png')
            print("Screenshot of the page saved as 'whatsapp_page_before_closing.png'")

            await browser.close()


    
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
    #browser = await initialize_browser(user_id, board.user_id)

    # **Send Messages Concurrently**
    #tasks = [send_whatsapp_message(browser, phone, message_text) for phone in phone_numbers]
    tasks = [get_qrcode(phone, message_text) for phone in phone_numbers]
    
    results = await asyncio.gather(*tasks)

    # **Close Browser**
    #await browser.close()

    successful_sends = [phone for phone, status in results if status == "success"]
    failed_sends = [phone for phone, status in results if status == "failed"]

    return response.json(
        {
            "status": "Messages sent!",
            "successful_sends": successful_sends,
            "failed_sends": failed_sends,
        }
    )