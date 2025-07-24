import asyncio
import threading
import logging
from api import app
from notification_worker import notification_worker
from config import config
import uvicorn

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

def start_worker():
    """Start the notification worker in a separate thread"""
    try:
        logger.info("Starting notification worker...")
        # The worker runs continuously in the background
        while True:
            import time
            time.sleep(60)
    except KeyboardInterrupt:
        logger.info("Stopping notification worker...")

def start_api():
    """Start the FastAPI server"""
    try:
        logger.info(f"Starting API server on {config.HOST}:{config.PORT}")
        uvicorn.run(
            "api:app",
            host=config.HOST,
            port=config.PORT,
            reload=False  # Disable reload in production
        )
    except Exception as e:
        logger.error(f"Error starting API server: {e}")

def main():
    """Main function to start both API and worker"""
    logger.info("Starting Subly Email Service...")
    
    # Start the notification worker in a separate thread
    worker_thread = threading.Thread(target=start_worker, daemon=True)
    worker_thread.start()
    
    # Start the API server in the main thread
    start_api()

if __name__ == "__main__":
    main() 