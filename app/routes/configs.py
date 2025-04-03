import os
import logging
from typing import Optional
from selenium.webdriver.chrome.options import Options
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.common.exceptions import WebDriverException
from models.models import User
from sqlalchemy.future import select
from db import get_db_session
import asyncio

# Config (could move to settings file)
CHROMEDRIVER_PATH = "/usr/local/bin/chromedriver"
PROFILE_BASE_DIR = "/tmp/chrome_profiles"
DEFAULT_HEADLESS = False

logger = logging.getLogger(__name__)

async def initialize_driver(user_id: int, new_process_status: str) -> Optional[webdriver.Chrome]:
    """Initialize a Chrome driver for a specific user with profile isolation.
    
    Returns:
        webdriver.Chrome: The initialized driver if successful
        None: If driver cannot be initialized or user is not available
    """
    try:
        async with get_db_session() as session:  # Assuming async session
            # Lock the user row for update
            result = await session.execute(
                select(User).where(User.id == user_id).with_for_update()
            )
            user = result.scalars().first()

            if not user:
                logger.warning(f"User {user_id} not found")
                return None

            if user.driver_status != "FREE":
                return None

            # Setup Chrome options
            chrome_options = Options()
            user_profile_dir = os.path.join(PROFILE_BASE_DIR, f"user_{user_id}")
            os.makedirs(user_profile_dir, exist_ok=True)
            chrome_options.add_argument(f"--user-data-dir={user_profile_dir}")
            chrome_options.add_argument(f"--profile-directory=Profile_{user_id}")

            if DEFAULT_HEADLESS:
                chrome_options.add_argument("--headless=new")

            # Initialize driver in a thread
            try:
                driver = await asyncio.to_thread(
                    lambda: webdriver.Chrome(
                        service=Service(CHROMEDRIVER_PATH),
                        options=chrome_options
                    )
                )
            except WebDriverException as e:
                logger.error(f"Failed to initialize driver for user {user_id}: {str(e)}")
                return None

            # Update user status
            user.driver_status = new_process_status
            await session.commit()
            return driver

    except Exception as e:
        logger.error(f"Unexpected error initializing driver for user {user_id}: {str(e)}")
        return None

async def quit_driver(user_id: int, driver: webdriver.Chrome) -> bool:
    """Clean up the driver and update user status.
    
    Returns:
        bool: True if both driver quit and status update succeeded, False otherwise
    """
    success = True
    
    # Quit the driver
    try:
        await asyncio.to_thread(driver.quit)
    except Exception as e:
        logger.error(f"Error quitting driver for user {user_id}: {str(e)}")
        success = False

    # Update user status
    try:
        async with get_db_session() as session:
            result = await session.execute(
                select(User).where(User.id == user_id).with_for_update()
            )
            user = result.scalars().first()
            
            if user:
                user.driver_status = "FREE"
                await session.commit()
            else:
                logger.warning(f"User {user_id} not found during driver cleanup")
                success = False
    except Exception as e:
        logger.error(f"Error updating driver status for user {user_id}: {str(e)}")
        success = False

    return success