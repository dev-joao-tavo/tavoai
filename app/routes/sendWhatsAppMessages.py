from sanic import Sanic, response
from db import SessionLocal, get_db_session
from models.models import Card, Contact, Board, User
from utils.utils import get_user_from_token,get_driver_status_from_user_id,get_driver_status_message
from sanic.exceptions import Unauthorized
import time
from routes.configs import initialize_driver,quit_driver
import asyncio
import re
from datetime import datetime
from typing import Any
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from sqlalchemy import select, update, func
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains
import random
from datetime import datetime
from models.models import MessageHistory  # Make sure this model exists

app = Sanic.get_app()

async def update_message_history(history_id, contact_id, success):
    try:
        async with get_db_session() as session:
            history = await session.get(MessageHistory, history_id)
            if not history:
                return
            
            # Initialize lists if None
            history.successful_recipients = history.successful_recipients or []
            history.failed_recipients = history.failed_recipients or []
            
            if success:
                if contact_id not in history.successful_recipients:  # Prevent duplicates
                    history.successful_recipients.append(contact_id)
                    history.success_count += 1
            else:
                if contact_id not in history.failed_recipients:  # Prevent duplicates
                    history.failed_recipients.append(contact_id)
                    history.failure_count += 1
            
            history.total_recipients = history.success_count + history.failure_count
            await session.commit()
    except Exception as e:
        raise

async def create_message_history(user_id, message_content, channel='whatsapp', message_type='transactional'):
    try:
        async with get_db_session() as session:
            history = MessageHistory(
                user_id=user_id,
                message_content=message_content,
                channel=channel,
                message_type=message_type,
                sent_at=datetime.utcnow(),
                success_count=0,
                failure_count=0,
                total_recipients=0,
                successful_recipients=[],
                failed_recipients=[]
            )
            session.add(history)
            await session.commit()
            await session.refresh(history)
            return history.id
    except Exception as e:
        raise

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
    if driver is None:
        return False  # Ensure driver is valid

    try:
        driver.get("https://web.whatsapp.com/send/?phone=+5531995854940")

        # Wait dynamically for the message input field
        WebDriverWait(driver, 20).until(
            EC.presence_of_element_located((By.XPATH, '//div[@aria-label="Digite uma mensagem"]'))
        )
        return True
    except Exception:
        return False  # Return False if element is not found
    
async def get_wpp_login_code(driver, user_phone_number):
    start_time = time.time()
    try:
        # 1. Load WhatsApp Web
        print("Loading WhatsApp Web...")
        driver.get("https://web.whatsapp.com/")
        await asyncio.sleep(10)  # Initial page load

        try:
            WebDriverWait(driver, 2).until(
                EC.presence_of_element_located((By.XPATH, '//div[@aria-label="Digite uma mensagem"]'))
            )
            return "ALREADY_LOGGED_IN"
        except:
            pass

        # 2. TAB navigation to open phone login
        actions = ActionChains(driver)
        actions.send_keys(Keys.TAB, Keys.TAB, Keys.ENTER).perform()
        print("Used TAB navigation to open phone login")
        await asyncio.sleep(1)

        # 3. Enter phone number with country code
        actions.send_keys(Keys.TAB, Keys.TAB).perform()

        actions.send_keys(f"+55{user_phone_number}").perform()
        print("Phone number entered")
        await asyncio.sleep(1)

        # 4. Submit form (TAB to focus then ENTER)
        actions.send_keys(Keys.TAB, Keys.ENTER).perform()
        print("Form submitted")

        # 5. Retrieve login code
        login_code = WebDriverWait(driver, 15).until(
            lambda d: d.find_element(By.CSS_SELECTOR, '[data-link-code]').get_attribute('data-link-code')
        )
        print(f"Success in {time.time()-start_time:.2f}s - Code: {login_code}")
        return login_code

    except Exception as e:
        print(f"Failed after {time.time()-start_time:.2f}s: {str(e)}")
        try:
            error = driver.find_element(By.CSS_SELECTOR, '[role="alert"]')
            print(f"WhatsApp Error: {error.text}")
        except:
            pass
        return None
    
@app.route("/sendMessage", methods=["POST"])
async def send_whatsapp_messages(request):
    try:
        user_id = get_user_from_token(request)
        if not user_id:
            raise Unauthorized("Invalid or expired token.")
        driver_status = await get_driver_status_from_user_id(user_id)
        if driver_status!="FREE":
            return response.json({"message": get_driver_status_message(driver_status)},status=400)

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

        # Combine messages for history
        full_message = "\n".join([msg for msg in [message1, message2, message3] if msg])
        
        # Create message history record
        history_id = await create_message_history(user_id, full_message)

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
                board_id,
                history_id  # Pass history_id to the async function
            )
        )

        return response.json({
            "message": "Messages are being sent",
            "count": len(phone_numbers_and_names),
            "board_id": board_id,
            "history_id": history_id
        })

    except Exception as e:
        return response.json(
            {"error": "Internal server error"},
            status=500
        )


async def send_whatsapp_messages_async(user_id, contacts, message1, message2, message3, board_id, history_id):
    driver = None
    results = {
        'successful': [],
        'failed': [],
        'board_id': board_id,
        'status': 'completed'
    }

    try:
        driver = await initialize_driver(user_id,new_process_status="SENDING_WPP_MESSAGES")

        async with get_db_session() as session:
            for contact in contacts:
                try:
                    phone, name, contact_id, card_id, _ = contact  # Unpack all fields including status
                    
                    result = await session.execute(
                        select(User).where(User.id == user_id).with_for_update()
                    )
                    driver_status = result.scalars().first().driver_status 

                    if driver_status != "SENDING_WPP_MESSAGES":
                        break

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
                    
                    try: 
                        message_box = WebDriverWait(driver, 20).until(
                            EC.presence_of_element_located((By.XPATH, '//div[@aria-label="Digite uma mensagem"]'))
                        )
                    except:
                        try:
                            driver.get(f"https://web.whatsapp.com/send/?phone=+5531995854940")
                            message_box = WebDriverWait(driver, 20).until(
                                EC.presence_of_element_located((By.XPATH, '//div[@aria-label="Digite uma mensagem"]'))
                            )
                            await session.execute(
                                update(Card)
                                .where(Card.id == card_id)
                                .values(
                                    sending_message_status="ERROR_WRONG_PHONE_NUMBER"
                                )
                            )
                            await session.commit()
                            continue
                        except:
                            quit_driver(driver, user_id)
                            # Update status to SENDING
                            await session.execute(
                                update(Card)
                                .where(Card.id == card_id)
                                .values(
                                    sending_message_status="ERROR_NOT_LOGGED_IN"
                                )
                            )
                            await session.commit()
                            return

                    messages = [msg.replace("@nome", name) 
                              for msg in [message1, message2, message3] if msg]

                    for msg in messages:
                        for char in msg:
                            message_box.send_keys(char)
                            await asyncio.sleep(random.uniform(0.05, 0.15))
                        
                        send_button = WebDriverWait(driver, 10).until(
                            EC.element_to_be_clickable((By.XPATH, '//span[@data-icon="send"]'))
                        )
                        send_button.click()               
                        await asyncio.sleep(random.uniform(2, 4))

                    # Update to success
                    await session.execute(
                        update(Card)
                        .where(Card.id == card_id)
                        .values(
                            sending_message_status="SENT",
                            last_message=func.now()
                        )
                    )
                    results['successful'].append({'phone': phone, 'name': name})
                    await update_last_message(contact_id)
                    
                    # Update message history with success
                    await update_message_history(history_id, contact_id, True)

                except Exception as e:
                    error_msg = str(e)[:255]
                    
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
                    
                    # Update message history with failure
                    await update_message_history(history_id, contact_id, False)
                    
                finally:
                    await session.commit()

    except Exception as e:
        error_msg = str(e)
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
                # Update message history for all contacts as failed
                for contact in contacts:
                    _, _, contact_id, _, _ = contact
                    await update_message_history(history_id, contact_id, False)
                await session.commit()
        except Exception as db_error:
            raise
    finally:
        if driver:
            try:
                await quit_driver(user_id, driver)

            except Exception as e:
                raise
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
       
        driver_status = await get_driver_status_from_user_id(user_id)
        if driver_status!="FREE":
            return response.json({"message": get_driver_status_message(driver_status)},status=400)

    except Exception as e:
        return response.json({"error": "An error occurred: " + str(e)}, status=400)

    try:        
        async with get_db_session() as session:
            result = await session.execute(select(User).filter(User.id == user_id))
            user = result.scalars().first()
        
        if not user:
            return response.json({"error": "User not found."}, status=404)

        driver = await initialize_driver(user_id,new_process_status="WPP_LOGIN")

        user_phone_number = user.user_wpp_phone_number
        code = await get_wpp_login_code(driver, user_phone_number)
        
        if code == "ÄLREADY_LOGGED_IN":
            try:
                async with get_db_session() as session:
                    await session.execute(
                        update(Card)
                        .where(Card.sending_message_status == "ALREADY_LOGGED_IN")
                        .values(sending_message_status="default")
                    )
                    await session.commit()
                return response.json({"message": "You are already logged in.", "code": "ÄLREADY_LOGGED_IN"}, status=200)

            except:
                pass

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
            asyncio.create_task(sleep_and_quit(driver, user_id))

# Define the sleep and quit logic in an async function
async def sleep_and_quit(driver, user_id):
    await asyncio.sleep(60)  # Sleep for 60 seconds
    await quit_driver(user_id, driver)

async def update_last_message(contact_id):
    async with get_db_session() as session:
        result = await session.execute(select(Contact).filter(Contact.id == contact_id))
        contact = result.scalars().first()

        if contact:
            contact.last_message_contact = datetime.utcnow()
            await session.commit()  

@app.route("/whatsAppLoginCheck", methods=["get"])
async def whats_app_login_check(request):
    driver = None  # Ensure driver is always available in scope
    
    try:
        user_id = get_user_from_token(request)
        if not user_id:
            raise Unauthorized("Invalid or expired token.")
        
        driver_status = await get_driver_status_from_user_id(user_id)
        if driver_status != "FREE":
            return response.json({"message": get_driver_status_message(driver_status)}, status=400)

        async with get_db_session() as session:
            result = await session.execute(select(User).filter(User.id == user_id))
            user = result.scalars().first()
        
            if not user:
                return response.json({"error": "User not found."}, status=404)

            driver = await initialize_driver(user_id, new_process_status="CHECKING_WPP_LOGIN")

            if not driver:
                return response.json({"error": "Failed to initialize WebDriver"}, status=500)

            is_logged_in = await login_check(driver)

            if is_logged_in:
                await session.execute(
                    update(Card)
                    .where(Card.sending_message_status == "ERROR_NOT_LOGGED_IN")
                    .values(sending_message_status="default")
                )
                await session.commit()
                if driver:
                    await quit_driver(user_id, driver) 
                return response.json({"message": "You are already logged in!", "is_logged_in": True}, status=200)
            else:
                if driver:
                    await quit_driver(user_id, driver) 
                return response.json({"message": "You are NOT logged in!", "is_logged_in": False}, status=200)

    except Unauthorized as e:
        return response.json({"error": str(e)}, status=401)
    except Exception as e:
        if driver:
            await quit_driver(user_id, driver) 
        return response.json({"error": "An error occurred: " + str(e)}, status=400)
    finally:
        if driver:
            await quit_driver(user_id, driver)  # Ensures driver is closed no matter what
