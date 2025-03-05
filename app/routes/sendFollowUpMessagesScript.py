from selenium.webdriver.common.by import By

from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

import time
from random import randint
from routes.messages import *
#from routes.configs import login, initialize_driver, set_switcher, get_ids_from_stage

from sanic.response import json
from sanic import Sanic
app = Sanic.get_app()

# Constants
LOGIN_URL = "https://savassi.kommo.com/leads/pipeline/"
USERNAME = "jpjp1441@gmail.com"
PASSWORD = "Savassi1!"  # Use environment variables or config files for better security
DRIVER_PATH = "chromedriver.exe"

# Pipeline stages
PIPELINE_STAGES = {
    "1ª Mensagem (2nd day)": "pipeline_items__list_78264027",
    "2ª Mensagem (4th day)": "pipeline_items__list_78978779",
    "3ª Mensagem (6th day)": "pipeline_items__list_78981707" 
}


def send_message(driver, ids, messages):
    """Send a message to all leads in the provided list of IDs."""
    
    for lead_id in ids:
        driver.get(f"https://savassi.kommo.com/leads/detail/{lead_id}")
        time.sleep(randint(4,6))  # Allow the page to load
        set_switcher(driver)
        
        for message in messages:
            
            lead_name = driver.find_element(By.XPATH, "//span[@class='tag']").get_attribute("title")
            message=message.replace("[nome]", lead_name)

            # Locate the message input field
            message_box = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, 'div[contenteditable="true"]'))
            )

            time.sleep(2)
            
            message_box.send_keys(message)

            time.sleep(2)

            # Locate and click the "Enviar" button
            WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, '//span[text()="Enviar"]'))
            ).click()

            time.sleep(2)  # Brief delay before the next message
    return len(ids)




@app.route("/run_send_followup_messages_script")
async def run_send_followup_messages_script(request):
    #driver = initialize_driver()
    login(driver)
    counter = 0
    for stage_id in PIPELINE_STAGES.values():
        ids = get_ids_from_stage(driver, stage_id)
        
        if  stage_id == PIPELINE_STAGES["1ª Mensagem (2nd day)"]:
            message = message1
        
        if stage_id == PIPELINE_STAGES["2ª Mensagem (4th day)"]:
            message = message2
        
        if stage_id == PIPELINE_STAGES["3ª Mensagem (6th day)"]:
            message = message3
        
        counter=counter+1
        number_of_leads_who_received_the_message = send_message(driver, ids, messages=message)
        print(f"{number_of_leads_who_received_the_message} leads received the message {counter}")
    

    return json({"message": "Send Follow-Up Messages Script Went Well!"})
