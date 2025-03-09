

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
from webdriver_manager.chrome import ChromeDriverManager


chrome_options = webdriver.ChromeOptions()
chrome_options.add_argument("--headless")  # Run in headless mode
chrome_options.add_argument("--disable-notifications")  # Disable notifications
chrome_options.add_argument("--disable-gpu")  # Disable GPU acceleration
chrome_options.add_argument("--no-sandbox")  # Disable sandboxing
chrome_options.add_argument("--disable-dev-shm-usage")  # Avoid memory issues
chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")

# Set up the Chrome driver
service = Service(ChromeDriverManager().install())
driver = webdriver.Chrome(service=service, options=chrome_options)
phone=321
try:
    # Navigate to WhatsApp Web
    print("Navigating to WhatsApp Web...")
    driver.get("https://web.whatsapp.com")

    # Continuously take screenshots every 10 seconds
    screenshot_count = 1
    for i in range(1,6):
        print(f"Taking screenshot {screenshot_count}...")
        driver.save_screenshot(f"qr_code_{phone}_{screenshot_count}.png")
        print(f"Screenshot {screenshot_count} captured successfully for {phone}.")
        screenshot_count += 1
        time.sleep(10)  # Wait for 10 seconds before taking the next screenshot

    # Wait for the QR code to appear using aria-label
    print("Waiting for QR code...")
    qr_code_selector = (By.XPATH, '//div[@aria-label="Scan this QR code to link a device!"]')
    WebDriverWait(driver, 60).until(EC.presence_of_element_located(qr_code_selector))

except Exception as e:
    print(f"Error: {e}")
finally:
    # Close the browser
    driver.quit()