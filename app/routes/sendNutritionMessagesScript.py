
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from random import randint
from datetime import datetime
import time

from routes.messages import *
from routes.configs import login, initialize_driver, set_switcher, get_ids_from_stage

from selenium.webdriver.support.ui import WebDriverWait

from sanic.response import json
from sanic import Sanic
app = Sanic.get_app()

LastMessageId= "1194250"#name="CFV[1194250]"

# Pipeline stages
#NUTRINDO = "78978827"
NUTRINDO = "78978803"
pipelineStage = f"{NUTRINDO}"
PIPELINE_STAGES = {pipelineStage: f"pipeline_items__list_{NUTRINDO}"}


def send_message(driver, ids, messages):
    """Send a message to all leads in the provided list of IDs."""
    for lead_id in ids:
        driver.get(f"https://savassi.kommo.com/leads/detail/{lead_id}")
        time.sleep(randint(4,6))  # Allow the page to load
        data_str = driver.find_element(By.XPATH, f"//input[@name='CFV[{LastMessageId}]']").get_attribute("value")
        print(data_str)
        #diff = (datetime.today().date() - datetime.strptime(data_str, "%d-%m-%Y").date()).days
        set_switcher(driver)
        for message in messages:            
            lead_name = driver.find_element(By.XPATH, "//span[@class='tag']").get_attribute("title")
            message=message.replace("[nome]", lead_name)

            # Locate the message input field
            message_box = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, 'div[contenteditable="true"]'))
            )

            # Localize o campo de entrada de arquivos
            # file_input = driver.find_element(By.CSS_SELECTOR, 'input[type="file"]')
            # file_input.send_keys(r"C:\Users\jpjp1\Downloads\Higienização.mp4")
            
            # Wait for the video to load
            # time.sleep(3)
            
            message_box.send_keys(message)

            # Wait for the video to load
            # time.sleep(5)

            # Locate and click the "Enviar" button
            WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, '//span[text()="Enviar"]'))
            ).click()

            time.sleep(5)  # Brief delay before the next message

        #data_element = driver.find_element(By.XPATH, f"//input[@name='CFV[{LastMessageId}]']")
        #data_element.clear()
        #data_element.send_keys(f"{datetime.today().strftime('%d-%m-%Y')}")
        #time.sleep(5)  
        #botao = driver.find_element(By.ID, "save_and_close_contacts_link")
        #botao.click()       
        #time.sleep(3)  
            
    return len(ids)

@app.route("/run_send_nutrition_messages_script")
async def run_send_nutrition_messages_script(request):
    driver = initialize_driver()
    #login(driver)
    counter = 0
    for stage_id in PIPELINE_STAGES.values():
        ids = get_ids_from_stage(driver, stage_id)             
        message = pipelineStageMessage
        
        counter=counter+1
        number_of_leads_who_received_the_message = send_message(driver, ids, messages=message)
        print(f"{number_of_leads_who_received_the_message} leads received the message {counter}")
   
    return json({"message": "Send Nutrition Messages Script Went Well!"})


