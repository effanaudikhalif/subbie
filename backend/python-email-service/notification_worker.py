from celery import Celery
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from database import db
from email_service import email_service
from config import config
from datetime import datetime, timedelta
import logging
from typing import Dict, Any, List
import time
import os

logger = logging.getLogger(__name__)

# Initialize Celery with environment-based Redis URL
redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
celery_app = Celery('notification_worker', broker=redis_url)

# Initialize scheduler
scheduler = BackgroundScheduler()

class NotificationWorker:
    def __init__(self):
        self.last_check_time = datetime.now().isoformat()
        self.processed_messages = set()  # Track processed messages in memory
        self.setup_scheduler()
    
    def setup_scheduler(self):
        """Setup the scheduler to check for new messages every 2 minutes"""
        scheduler.add_job(
            func=self.check_new_messages,
            trigger=IntervalTrigger(minutes=2),
            id='check_messages',
            name='Check for new messages',
            replace_existing=True
        )
        scheduler.start()
        logger.info("Notification worker scheduler started")
    
    def check_new_messages(self):
        """Check for new messages and send notifications"""
        try:
            logger.info(f"🔍 Checking for new messages since {self.last_check_time}")
            
            # Clear processed messages periodically to prevent memory leaks
            if len(self.processed_messages) > 1000:
                logger.info("🧹 Clearing processed messages cache to prevent memory leak")
                self.processed_messages.clear()
            
            # Get new messages from database
            new_messages = db.get_new_messages(self.last_check_time)
            
            if not new_messages:
                logger.info("✅ No new messages found to process")
                return
            
            logger.info(f"📧 Found {len(new_messages)} new messages to process")
            
            # Process each new message (filter out already processed ones)
            unprocessed_messages = [msg for msg in new_messages if msg.get('id') not in self.processed_messages]
            logger.info(f"📤 {len(unprocessed_messages)} unprocessed messages out of {len(new_messages)} total")
            
            for message in unprocessed_messages:
                logger.info(f"📤 Processing message {message.get('id')} from conversation {message.get('conversation_id')}")
                self.process_message(message)
            
            # Update last check time
            self.last_check_time = datetime.now().isoformat()
            logger.info(f"✅ Finished processing messages. Next check after {self.last_check_time}")
            
        except Exception as e:
            logger.error(f"❌ Error checking new messages: {e}")
            import traceback
            traceback.print_exc()
    
    def process_message(self, message: Dict[str, Any]):
        """Process a single message and send notification"""
        try:
            message_id = message.get('id')
            sender_id = message.get('sender_id')
            conversation_id = message.get('conversation_id')
            content = message.get('body', '')  # Using 'body' field instead of 'content'
            
            # Check if we already processed this message in this session
            if message_id in self.processed_messages:
                logger.info(f"Message {message_id} already processed in this session, skipping")
                return
            
            # Get sender information
            sender = db.get_user_by_id(sender_id)
            if not sender:
                logger.error(f"Sender {sender_id} not found for message {message_id}")
                return
            
            # Get conversation participants
            participants = db.get_conversation_participants(conversation_id)
            if not participants:
                logger.error(f"No participants found for conversation {conversation_id}")
                return
            
            # Find recipient (the other person in the conversation)
            recipient = None
            for participant in participants:
                if participant.get('id') != sender_id:
                    recipient = participant
                    break
            
            if not recipient:
                logger.error(f"No recipient found for message {message_id}")
                return
            
            # Send email notification
            self.send_notification(message, sender, recipient, conversation_id)
            
            # Mark message as processed in memory and log it
            self.processed_messages.add(message_id)
            db.mark_message_notified(message_id)
            
        except Exception as e:
            logger.error(f"Error processing message {message.get('id')}: {e}")
    
    def send_notification(self, message: Dict[str, Any], sender: Dict[str, Any], recipient: Dict[str, Any], conversation_id: str):
        """Send email notification for a new message"""
        try:
            recipient_email = recipient.get('email')
            if not recipient_email:
                logger.error(f"No email found for recipient {recipient.get('id')}")
                return

            sender_name = sender.get('name', sender.get('first_name', 'Someone'))
            message_preview = message.get('body', '')[:100] + ('...' if len(message.get('body', '')) > 100 else '')

            # Create conversation URL using frontend URL from config
            conversation_url = f"{config.FRONTEND_URL}/messages?conversation={conversation_id}"

            # Extract recipient first name from full name
            recipient_full_name = recipient.get('full_name', '')
            recipient_first_name = recipient_full_name.split()[0] if recipient_full_name else ''

            # Send email
            success = email_service.send_message_notification(
                recipient_email=recipient_email,
                recipient_first_name=recipient_first_name,
                sender_name=sender_name,
                message_preview=message_preview,
                conversation_url=conversation_url
            )
            
            if success:
                logger.info(f"Email notification sent to {recipient_email} for message {message.get('id')}")
            else:
                logger.error(f"Failed to send email notification to {recipient_email}")
                
        except Exception as e:
            logger.error(f"Error sending notification: {e}")

# Celery task for manual triggering
@celery_app.task
def send_message_notification_task(message_id: str):
    """Celery task for sending message notifications"""
    try:
        # Get message from database
        # This would need to be implemented based on your database structure
        logger.info(f"Processing message notification for {message_id}")
        # Implementation would go here
    except Exception as e:
        logger.error(f"Error in notification task: {e}")

# Initialize worker
notification_worker = NotificationWorker()

if __name__ == "__main__":
    try:
        logger.info("Starting notification worker...")
        # Keep the worker running
        while True:
            time.sleep(60)
    except KeyboardInterrupt:
        logger.info("Stopping notification worker...")
        scheduler.shutdown() 