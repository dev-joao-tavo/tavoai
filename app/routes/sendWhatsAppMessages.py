from sanic import Sanic, response
from db import SessionLocal, get_db_session
from sqlalchemy import select, update
from typing import List
import time
from models.models import Card, Contact, Board, User
from utils.utils import get_user_from_token
from sanic.exceptions import Unauthorized
from selenium.webdriver.common.by import By
import time
from routes.configs import initialize_driver
import asyncio
from sanic.response import json
import re
from datetime import datetime
from sqlalchemy.orm import Session
from selenium.common.exceptions import NoSuchElementException
# Standard library imports
import asyncio
import random
import re
from typing import List, Tuple, Dict, Any

# Third-party imports
from sanic import response
from sanic.request import Request
from sqlalchemy import select, update, func
from sqlalchemy.orm import selectinload
from selenium.webdriver.common.by import By

# Local application imports
import time
import random

app = Sanic.get_app()

from typing import List, Tuple

async def get_phone_numbers_and_names_by_status_and_board(status, board_id):
    async with get_db_session() as session:
        result = await session.execute(
            select(
                Contact.phone_number,
                Contact.contact_name.label('name'),  # Fixed here

                Contact.id.label('contact_id'),
                Card.id.label('card_id')  # Make sure this is included
            )
            .join(Card, Card.contact_id == Contact.id)
            .where(Card.status == status)
            .where(Card.board_id == board_id)
        )
        return result.all()  # This will now return (phone, name, contact_id, card_id)

async def login_check(driver):
    try:
        driver.get("https://web.whatsapp.com/send/?phone=+5531995854940")

        # Wait for the page to fully load
        await asyncio.sleep(random.uniform(15, 20))  # Random sleep to simulate loading time

        # Try to find the message input field
        test = driver.find_element(By.XPATH, '//div[@aria-label="Digite uma mensagem"]')
        return True
    except NoSuchElementException:
        return False  # Return False if the element is not found
    except Exception as e:
        print(f"Error in login_check: {e}")
        return False  # Catch other unexpected errors and return False


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
        print(f"Error! Não foi possível identificar o : {e}")
        return None

@app.route("/sendMessage", methods=["POST"])
async def send_whatsapp_messages(request):
    try:
        user_id = get_user_from_token(request)
        if not user_id:
            raise Unauthorized("Invalid or expired token.")

        data = request.json
        required_fields = ['status', 'message1', 'boardId']
        if not all(field in data for field in required_fields):
            return response.json(
                {"error": f"Missing required fields: {required_fields}"},
                status=400
            )

        status = data['status']
        message1 = data['message1']
        message2 = data.get('message2', '')
        message3 = data.get('message3', '')
        board_id = data['boardId']

        # Get board and validate
        async with get_db_session() as session:
            board = await session.get(Board, board_id)
            if not board or board.user_id != user_id:
                return response.json({"error": "Board not found or access denied"}, status=404)

            # Get contacts with card_ids - updated to match model
            contacts = await session.execute(
                select(
                    Contact.phone_number,
                    Contact.contact_name.label('name'),
                    Contact.id.label('contact_id'),
                    Card.id.label('card_id'),
                    Card.status  # Explicitly include status to avoid unconsumed column
                )
                .join(Card, Card.contact_id == Contact.id)
                .where(Card.status == status)
                .where(Card.board_id == board_id)
            )
            phone_numbers_and_names = contacts.all()

        if not phone_numbers_and_names:
            return response.json(
                {"error": f"No contacts found for status: {status}"},
                status=404
            )

        # Start background task
        asyncio.create_task(
            send_whatsapp_messages_async(
                user_id,
                phone_numbers_and_names,
                message1,
                message2,
                message3,
                board_id
            )
        )

        return response.json({
            "message": "Messages are being sent",
            "count": len(phone_numbers_and_names),
            "board_id": board_id
        })

    except Exception as e:
        return response.json(
            {"error": "Internal server error"},
            status=500
        )


async def send_whatsapp_messages_async(user_id, contacts, message1, message2, message3, board_id):
    driver = None
    results = {
        'successful': [],
        'failed': [],
        'board_id': board_id,
        'status': 'completed'
    }

    try:
        driver = await asyncio.to_thread(initialize_driver, user_id)
        async with get_db_session() as session:
            for contact in contacts:
                try:
                    phone, name, contact_id, card_id, _ = contact  # Unpack all fields including status
                    
                    # Update status to SENDING
                    await session.execute(
                        update(Card)
                        .where(Card.id == card_id)
                        .values(
                            sending_message_status="SENDING"
                        )
                    )
                    await session.commit()

                    # Send message logic
                    clean_number = re.sub(r"\D", "", phone)
                    driver.get(f"https://web.whatsapp.com/send/?phone=+55{clean_number}")
                    await asyncio.sleep(random.uniform(15, 20))

                    message_box = driver.find_element(By.XPATH, '//div[@aria-label="Digite uma mensagem"]')
                    messages = [msg.replace("@nome", name) 
                              for msg in [message1, message2, message3] if msg]

                    for msg in messages:
                        for char in msg:
                            message_box.send_keys(char)
                            await asyncio.sleep(random.uniform(0.1, 0.3))
                        
                        await asyncio.sleep(random.uniform(1, 2))
                        driver.find_element(By.XPATH, '//span[@data-icon="send"]').click()
                        await asyncio.sleep(random.uniform(3, 5))

                    # Update to success
                    await session.execute(
                        update(Card)
                        .where(Card.id == card_id)
                        .values(
                            sending_message_status="OK",
                            last_message=func.now()
                        )
                    )
                    results['successful'].append({'phone': phone, 'name': name})
                    await update_last_message(contact_id)

                except Exception as e:
                    error_msg = str(e)[:255]
                    logger.error(f"Failed to send to {phone}: {error_msg}")
                    
                    await session.execute(
                        update(Card)
                        .where(Card.id == card_id)
                        .values(
                            sending_message_status="ERROR",
                            last_message=func.now()
                        )
                    )
                    results['failed'].append({
                        'phone': phone,
                        'name': name,
                        'error': error_msg
                    })
                finally:
                    await session.commit()

    except Exception as e:
        error_msg = str(e)
        logger.error(f"Global messaging error: {error_msg}")
        results.update({
            'status': 'failed',
            'error': error_msg
        })
        
        # Mark all as failed if global error
        try:
            async with get_db_session() as session:
                card_ids = [c[3] for c in contacts]
                await session.execute(
                    update(Card)
                    .where(Card.id.in_(card_ids))
                    .values(
                        sending_message_status="ERROR",
                        last_message=func.now()
                    )
                )
                await session.commit()
        except Exception as db_error:
            logger.error(f"Failed to update card statuses: {str(db_error)}")

    finally:
        if driver:
            try:
                driver.quit()
            except Exception as e:
                logger.error(f"Error closing driver: {str(e)}")

    return results


async def update_last_message(contact_id):
    async with get_db_session() as session:
        await session.execute(
            update(Contact)
            .where(Contact.id == contact_id)
            .values(last_message_contact=func.now())
        )
        await session.commit()
        
@app.route("/whatsAppLogin", methods=["get"])
async def whats_app_login(request):
    driver = None  # Ensure driver is always available in the scope
    
    try:
        user_id = get_user_from_token(request)
        if not user_id:
            raise Unauthorized("Invalid or expired token.")
    
    except Unauthorized as e:
        return response.json({"error": str(e)}, status=401)
    except Exception as e:
        return response.json({"error": "An error occurred: " + str(e)}, status=400)

    try:        
        async with get_db_session() as session:
            result = await session.execute(select(User).filter(User.id == user_id))
            user = result.scalars().first()
        
        if not user:
            return response.json({"error": "User not found."}, status=404)

        driver = await asyncio.to_thread(initialize_driver, user_id)
        user_phone_number = user.user_wpp_phone_number
        code = await get_wpp_login_code(driver, user_phone_number)
        
        # Sleeping before sending the response if needed
        await asyncio.sleep(1)
        return response.json({"message": "Add this code to your WhatsApp", "code": code})

    except Exception as e:
        try:
            message_box = driver.find_element(By.XPATH, '//div[@aria-label="Digite uma mensagem"]')
            return response.json({"message": "Você já está logado no WhatsApp!"}, status=200)
        except:
            return response.json({"error": str(e)}, status=500)
    
    finally:
        # Start an asynchronous task to sleep and quit the driver concurrently
        if driver:
            asyncio.create_task(sleep_and_quit(driver))

# Define the sleep and quit logic in an async function
async def sleep_and_quit(driver):
    await asyncio.sleep(60)  # Sleep for 60 seconds
    driver.quit()  # Quit the driver

async def update_last_message(contact_id):
    async with get_db_session() as session:
        result = await session.execute(select(Contact).filter(Contact.id == contact_id))
        contact = result.scalars().first()

        if contact:
            contact.last_message_contact = datetime.utcnow()
            await session.commit()  

@app.route("/whatsAppLoginCheck", methods=["get"])
async def whats_app_login_check(request):
    driver = None  # Ensure driver is always available in the scope
    
    try:
        user_id = get_user_from_token(request)
        if not user_id:
            raise Unauthorized("Invalid or expired token.")
    
    except Unauthorized as e:
        return response.json({"error": str(e)}, status=401)
    except Exception as e:
        return response.json({"error": "An error occurred: " + str(e)}, status=400)

    try:        
        async with get_db_session() as session:
            result = await session.execute(select(User).filter(User.id == user_id))
            user = result.scalars().first()
        
        if not user:
            return response.json({"error": "User not found."}, status=404)

        driver = await asyncio.to_thread(initialize_driver, user_id)
        is_logged_in = await login_check(driver)

        # Sleeping before sending the response if needed
        await asyncio.sleep(1)
        driver.quit()
        if is_logged_in == True:
           return response.json({"message": "You are already logged in!", "is_logged_in":is_logged_in},status=200)
        if is_logged_in == False:
           return response.json({"message": "You are NOT logged in!", "is_logged_in":is_logged_in},status=200)

    except Exception as e:
        driver.quit()
        return response.json({"error": str(e)})
