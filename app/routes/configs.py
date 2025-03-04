from selenium.webdriver.common.action_chains import ActionChains
from selenium.common.exceptions import NoSuchElementException, ElementNotInteractableException
import time
from selenium.webdriver.chrome.options import Options
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
from random import randint
from selenium.webdriver.support.ui import WebDriverWait
import time

# Constants
LOGIN_URL = "https://savassi.kommo.com/leads/pipeline/"
USERNAME = "jpjp1441@gmail.com"
PASSWORD = "Savassi1!"  # Use environment variables or config files for better security

def safe_click(driver, xpath): 
    """Attempts to find and click an element safely without crashing."""
    try:
        element = driver.find_element(By.XPATH, xpath)
        element.click()
        time.sleep(2)
    except (NoSuchElementException, ElementNotInteractableException) as e:
        print(f"Warning: Could not interact with element {xpath}. Error: {e}")

def set_switcher(driver):  
    try:
        switcher = driver.find_element(By.XPATH, "//div[@class='feed-compose-switcher']")
        actions = ActionChains(driver)
        actions.move_to_element(switcher).perform()
        time.sleep(2)
    except NoSuchElementException as e:
        print(f"Warning: Could not find switcher element. Error: {e}")
    finally:
        safe_click(driver, "//div[@data-id='chat']")
        safe_click(driver, "//div[@id='feed_compose_user']")
        safe_click(driver, "//div[@data-group='external']")

def login(driver):
    driver.get(LOGIN_URL)

    WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.ID, "session_end_login")))

    driver.find_element(By.ID, "session_end_login").send_keys(USERNAME)
    driver.find_element(By.NAME, "password").send_keys(PASSWORD)

    WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.ID, "auth_submit"))
    ).click()

    # Wait for the dashboard to load
    time.sleep(5)

def get_ids_from_stage(driver, stage_id):
    """Retrieve all data-ids from a specified pipeline stage."""
    time.sleep(2)
    driver.get(LOGIN_URL)
    time.sleep(2)
    for i in range(30):  
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(1)

    ids = []
    soup = BeautifulSoup(driver.page_source, 'html.parser')
    target_div = soup.find('div', {'id': stage_id})
    if target_div:
        ids = [div.get('data-id') for div in target_div.find_all('div') if div.get('data-id')]

    print(f"{len(ids)} leads were found on this stage: {stage_id}  \n")
    return ids

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options

def initialize_driver():
    # Set up Chrome options
    chrome_options = Options()

    # Specify the Chrome user data directory
    chrome_user_dir = "/home/ubuntu/chrome_user_data"  # Custom directory for Chrome user data
    chrome_options.add_argument("--user-data-dir=" + chrome_user_dir)

    # Specify the profile directory (optional)
    chrome_options.add_argument("--profile-directory=Profile 5")  # e.g., Profile for selenium

    # Add headless mode and other options for server environments
    chrome_options.add_argument("--headless")  # Run in headless mode
    chrome_options.add_argument("--no-sandbox")  # Required for running as root
    chrome_options.add_argument("--disable-dev-shm-usage")  # Overcome limited resource problems

    # Specify the Chrome for Testing binary location
    chrome_options.binary_location = "/usr/local/bin/chrome-for-testing"

    # Initialize the WebDriver with the path to chromedriver
    service = Service("/usr/local/bin/chromedriver")  # Updated path to ChromeDriver
    driver = webdriver.Chrome(service=service, options=chrome_options)

    return driver
#def initialize_driver():
#    chrome_options = Options()
#
#    chrome_user_dir = r"C:\Users\jpjp1\AppData\Local\Google\Chrome\User Data"
#
#    chrome_options.add_argument("--user-data-dir="+chrome_user_dir )
#
#    service = Service(r"C:\Users\jpjp1\Documents\SNDN\app\services\chromedriver.exe")
#    chrome_options.add_argument("--profile-directory=Profile 5") #e.g. Profile for selenium
#
#    return webdriver.Chrome(service=service, options=chrome_options)