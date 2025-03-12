
from selenium.webdriver.chrome.options import Options
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
import os


def initialize_driver(user_id):
    chrome_options = Options()
    # Path to Chrome user data (macOS)
    chrome_user_dir = "/Users/usuario/Library/Application Support/Google/Chrome"
    
    PROFILE_BASE_DIR = "/tmp/chrome_profiles"  # Base directory for profiles

    # Define a persistent profile directory for each user
    user_profile_dir = os.path.join(PROFILE_BASE_DIR, f"user_{user_id}")
    chrome_options.add_argument(f"--user-data-dir={user_profile_dir}")

    chrome_options.add_argument(f"--profile-directory=Profile {user_id}")  # Adjust to your active profile

    # Use the system-wide ChromeDriver path
    service = Service("/usr/local/bin/chromedriver")

    return webdriver.Chrome(service=service, options=chrome_options)

