
from selenium.webdriver.chrome.options import Options
from selenium import webdriver
from selenium.webdriver.chrome.service import Service


def initialize_driver():
    chrome_options = Options()
    # Path to Chrome user data (macOS)
    chrome_user_dir = "/Users/usuario/Library/Application Support/Google/Chrome"

    # Set user profile directory
    chrome_options.add_argument(f"--user-data-dir={chrome_user_dir}")
    chrome_options.add_argument("--profile-directory=Profile 8")  # Adjust to your active profile

    # Use the system-wide ChromeDriver path
    service = Service("/usr/local/bin/chromedriver")

    return webdriver.Chrome(service=service, options=chrome_options)

