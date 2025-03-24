from sanic import Sanic, response
from db import SessionLocal, get_db_session
from sqlalchemy import select
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

import time
import random

app = Sanic.get_app()

from typing import List, Tuple

async def get_phone_numbers_and_names_by_status_and_board(status: str, board_id: int):
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
                phone_numbers_and_names_query = select(Contact.phone_number, Contact.contact_name, Contact.id).where(Contact.id.in_(contact_ids))
                phone_numbers_and_names_result = await session.execute(phone_numbers_and_names_query)
                phone_numbers_and_names = [(row[0], row[1], row[2]) for row in phone_numbers_and_names_result.fetchall()]
        except Exception as e:
            print(f"Error fetching phone numbers and names: {e}")
            raise
    return phone_numbers_and_names

async def login_check(driver):
    try:
        driver.get("https://web.whatsapp.com/send/?phone=+5531995854940")

        # Wait for the page to fully load
        await asyncio.sleep(random.uniform(15, 20))  # Random sleep to simulate loading time

        # Try to find the message input field
        test = driver.find_element(By.XPATH, '//div[@aria-label="Digite uma mensagem"]')
        print(">>>>>",test )
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

    
# **Sanic Route: Send WhatsApp Messages**
@app.route("/sendMessage", methods=["POST"])
async def send_whatsapp_messages(request):

    user_id = get_user_from_token(request)
    if not user_id:
        raise Unauthorized("Invalid or expired token.")

    try:
        data = request.json
        status = data.get("status")
        message1 = data.get("message1")
        message2 = data.get("message2")
        message3 = data.get("message3")
        boardId = data.get("boardId")

        if not status or not message1:
            return response.json({"error": "status and at least message1 are required."}, status=400)


    except Exception as e:
        return response.json({"error": "Invalid request body."}, status=400)

    async with get_db_session() as session:
        result = await session.execute(select(Board).filter(Board.id == boardId))
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
    failed_to_send_messages_to_these_customers = []
    succeeded_to_send_messages_to_these_customers = []
    try:
        for phone_number, name, contact_id in phone_numbers_and_names:
            try:
                # Open WhatsApp Web (you should already be logged in)
                clean_number = re.sub(r"\D", "", phone_number)  # Remove all non-digit characters

                driver.get(f"https://web.whatsapp.com/send/?phone=+55{clean_number}")

                # Wait for page to fully load
                await asyncio.sleep(random.uniform(15, 20))  # Random sleep to simulate loading time

                # Find the message input field
                message_box = driver.find_element(By.XPATH, '//div[@aria-label="Digite uma mensagem"]')

                # Prepare the messages
                messages = [message1.replace("@nome", name), message2.replace("@nome", name), message3.replace("@nome", name)]

                # Loop through each message and send one at a time
                for message in messages:
                    if message:  # Check if the message is not empty
                        message_text = message.replace("@nome", name)  # Replace @nome with the contact name
                        
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
                succeeded_to_send_messages_to_these_customers.append([phone_number, name])
                await update_last_message(contact_id)
            except:
                failed_to_send_messages_to_these_customers.append([phone_number, name])
        # Close browser after a short delay
        await asyncio.sleep(1)
        driver.quit()
        return response.json({"message": "Messages sent!","Messages sent to":succeeded_to_send_messages_to_these_customers, "Error sending messages to":failed_to_send_messages_to_these_customers})

    except:
        driver.quit()
        return response.json({"message": "Faça login no WhatsApp antes de enviar uma mensagem;"})

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
        print(";;;;;;;;;;;;;;;",is_logged_in)

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
