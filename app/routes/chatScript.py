
from selenium.webdriver.common.by import By


from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

import time
from random import randint
from routes.messages import *
#from routes.configs import login, initialize_driver, set_switcher, get_ids_from_stage
from sanic import Sanic
app = Sanic.get_app()
from openai import OpenAI

API_KEY="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"
client = OpenAI(api_key=API_KEY)

def sales_conversation(previous_messages):
    messages = [
        {"role": "system", "content": (
            "You are a friendly and helpful sales assistant focused on understanding the customer's needs. "
            "Ask clear, open-ended questions related to the product or service, encouraging the customer to share details. "
            "Maintain a conversational tone, be patient, and aim to gather essential information such as budget, preferences, and timeline. "
            "Keep your responses short and concise, ensuring that each message is brief but engaging."
        )}
    ]
    messages.extend(previous_messages)
    messages.append({"role": "user", "content": "Please ask the customer thoughtful questions to understand their needs better, such as what they are looking for, their budget, and any specific preferences they may have, while keeping your messages short."})

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=messages
    )

    return response.choices[0].message.content

def readMessages(driver,lead_id):

    # Open the chat page
    url = f"https://savassi.kommo.com/leads/detail/{i}"
    driver.get(url)

    # Background color mapping
    color_labels = {
        "rgba(245, 245, 245, 1)": "user",    # Customer messages as 'user'
        "rgba(0, 132, 192, 1)": "assistant"  # Store messages as 'assistant'
    }

    # Find all message containers
    message_containers = driver.find_elements(By.CLASS_NAME, "feed-note__content")

    chat_data = []

    for container in message_containers:
        try:
            # Get background color
            bg_color = container.value_of_css_property("background-color")
            sender = color_labels.get(bg_color, "user")  # Default to 'user' if color isn't mapped

            # Get all message paragraphs within this container
            messages = container.find_elements(By.CLASS_NAME, "feed-note__message_paragraph")
            message_text = "\n".join(msg.text.strip() for msg in messages if msg.text.strip())  # Remove empty messages

            if message_text:  # Only add non-empty messages
                chat_data.append({"role": sender, "content": message_text})

        except Exception as e:
            print(f"Error processing message: {e}")
    return chat_data  # Return data in correct format

def remove_non_bmp_characters(text):
    return ''.join(c for c in text if c <= '\uFFFF')

def send_message(driver, lead_id, previous_messages):
    driver.get(f"https://savassi.kommo.com/leads/detail/{lead_id}")
    time.sleep(randint(4,6))  # Allow the page to load
    set_switcher(driver)
    responseFromChatGpt = sales_conversation(previous_messages)
    # Locate the message input field
    message_box = WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, 'div[contenteditable="true"]'))
    )

    time.sleep(1)
    message_text = remove_non_bmp_characters(responseFromChatGpt)

    message_box.send_keys(message_text)

    time.sleep(2)

    # Locate and click the "Enviar" button
    WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.XPATH, '//span[text()="Enviar"]'))
    ).click()

    time.sleep(2)  # Brief delay before the next message

    return responseFromChatGpt

def main(lead_id):   
    #driver = initialize_driver()
        # Specify the path to the chromedriver executable
   #driver = initialize_driver()

    # Open WhatsApp Web
    driver.get('https://web.whatsapp.com')

    # Pause to allow manual QR code scan
    time.sleep(15) # Adjust this as necessary

    # Specify the name of the contact or group
    contact_name = 'test'
    message = 'test.'

    # Find the contact/group and open the chat
    search_box = driver.find_element_by_xpath('//div[@contenteditable="true"][@data-tab="3"]')
    search_box.send_keys(contact_name)
    search_box.send_keys(Keys.ENTER)

    # Send the message
    message_box = driver.find_element_by_xpath('//div[@contenteditable="true"][@data-tab="6"]')
    message_box.send_keys(message)
    message_box.send_keys(Keys.ENTER)

    # Wait and close the browser
    time.sleep(5)
    driver.quit()

    #login(driver)    
    #previous_messages = readMessages(driver,lead_id)
    #send_message(driver,lead_id,previous_messages)
    
    driver.quit()

@app.route("/run_chat_script")
async def run_chat_script(request):
    lead_id = request.args.get("lead_id")  
    main(lead_id=lead_id)
    return json({"message": "Read Chat Script Went Well!"})
