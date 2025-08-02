from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from email_service import email_service
from database import db
import logging

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Subly Email Service",
    description="Email notification service for Subly platform",
    version="1.0.0"
)

class MessageNotificationRequest(BaseModel):
    recipient_email: str
    sender_name: str
    message_preview: str
    conversation_url: str

class ListingNotificationRequest(BaseModel):
    recipient_email: str
    host_name: str
    listing_title: str
    listing_address: str
    listing_price: str
    start_date: str
    end_date: str
    listing_url: str

class ListingDeletedRequest(BaseModel):
    recipient_email: str
    host_name: str
    listing_title: str
    listing_address: str
    listing_price: str
    removal_date: str
    dashboard_url: str

class ListingExpiredRequest(BaseModel):
    recipient_email: str
    host_name: str
    listing_title: str
    listing_address: str
    listing_price: str
    end_date: str
    expiration_date: str
    dashboard_url: str

class HealthResponse(BaseModel):
    status: str
    message: str

@app.get("/", response_model=HealthResponse)
async def root():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        message="Subly Email Service is running"
    )

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        message="Email service is operational"
    )

@app.post("/send-message-notification")
async def send_message_notification(request: MessageNotificationRequest):
    """Send a message notification email"""
    try:
        success = email_service.send_message_notification(
            recipient_email=request.recipient_email,
            sender_name=request.sender_name,
            message_preview=request.message_preview,
            conversation_url=request.conversation_url
        )

        if success:
            return {"status": "success", "message": "Email sent successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to send email")

    except Exception as e:
        logger.error(f"Error sending message notification: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/send-listing-added-notification")
async def send_listing_added_notification(request: ListingNotificationRequest):
    """Send a listing added notification email"""
    try:
        success = email_service.send_listing_added_notification(
            recipient_email=request.recipient_email,
            host_name=request.host_name,
            listing_title=request.listing_title,
            listing_address=request.listing_address,
            listing_price=request.listing_price,
            start_date=request.start_date,
            end_date=request.end_date,
            listing_url=request.listing_url
        )

        if success:
            return {"status": "success", "message": "Listing added notification sent successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to send email")

    except Exception as e:
        logger.error(f"Error sending listing added notification: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/send-listing-edited-notification")
async def send_listing_edited_notification(request: ListingNotificationRequest):
    """Send a listing edited notification email"""
    try:
        success = email_service.send_listing_edited_notification(
            recipient_email=request.recipient_email,
            host_name=request.host_name,
            listing_title=request.listing_title,
            listing_address=request.listing_address,
            listing_price=request.listing_price,
            start_date=request.start_date,
            end_date=request.end_date,
            listing_url=request.listing_url
        )

        if success:
            return {"status": "success", "message": "Listing edited notification sent successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to send email")

    except Exception as e:
        logger.error(f"Error sending listing edited notification: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/send-listing-deleted-notification")
async def send_listing_deleted_notification(request: ListingDeletedRequest):
    """Send a listing deleted notification email"""
    try:
        success = email_service.send_listing_deleted_notification(
            recipient_email=request.recipient_email,
            host_name=request.host_name,
            listing_title=request.listing_title,
            listing_address=request.listing_address,
            listing_price=request.listing_price,
            removal_date=request.removal_date,
            dashboard_url=request.dashboard_url
        )

        if success:
            return {"status": "success", "message": "Listing deleted notification sent successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to send email")

    except Exception as e:
        logger.error(f"Error sending listing deleted notification: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/send-listing-expired-notification")
async def send_listing_expired_notification(request: ListingExpiredRequest):
    """Send a listing expired notification email"""
    try:
        success = email_service.send_listing_expired_notification(
            recipient_email=request.recipient_email,
            host_name=request.host_name,
            listing_title=request.listing_title,
            listing_address=request.listing_address,
            listing_price=request.listing_price,
            end_date=request.end_date,
            expiration_date=request.expiration_date,
            dashboard_url=request.dashboard_url
        )

        if success:
            return {"status": "success", "message": "Listing expired notification sent successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to send email")

    except Exception as e:
        logger.error(f"Error sending listing expired notification: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/send-test-email")
async def send_test_email(email: str):
    """Send a test email for debugging"""
    try:
        success = email_service.send_message_notification(
            recipient_email=email,
            sender_name="Test User",
            message_preview="This is a test message to verify email functionality.",
            conversation_url="http://localhost:3000/messages"
        )
        
        if success:
            return {"status": "success", "message": "Test email sent successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to send test email")
            
    except Exception as e:
        logger.error(f"Error sending test email: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/config")
async def get_config():
    """Get current email service configuration (without sensitive data)"""
    from config import config
    return {
        "email_provider": email_service.provider,
        "from_email": email_service.from_email,
        "from_name": email_service.from_name,
        "smtp_host": config.SMTP_HOST,
        "smtp_port": config.SMTP_PORT,
        "smtp_user": config.SMTP_USER,
        "frontend_url": config.FRONTEND_URL,
        "supabase_url": config.SUPABASE_URL[:20] + "..." if config.SUPABASE_URL else None,
        "has_smtp_password": bool(config.SMTP_PASSWORD)
    }

@app.get("/debug/messages")
async def debug_messages():
    """Debug endpoint to check for recent messages"""
    try:
        # Get recent messages from last 24 hours
        from datetime import datetime, timedelta
        last_24h = (datetime.now() - timedelta(hours=24)).isoformat()
        
        messages = db.get_new_messages(last_24h)
        
        return {
            "status": "success",
            "messages_count": len(messages),
            "messages": messages[:5],  # Only show first 5 for debugging
            "last_check_time": last_24h
        }
    except Exception as e:
        logger.error(f"Error in debug messages: {e}")
        return {
            "status": "error",
            "error": str(e)
        }

@app.post("/debug/check-worker")
async def debug_check_worker():
    """Manually trigger the notification worker check"""
    try:
        from notification_worker import notification_worker
        
        # Manually trigger the check
        notification_worker.check_new_messages()
        
        return {
            "status": "success",
            "message": "Worker check triggered manually",
            "last_check_time": notification_worker.last_check_time
        }
    except Exception as e:
        logger.error(f"Error triggering worker check: {e}")
        return {
            "status": "error",
            "error": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    from config import config
    
    uvicorn.run(
        "api:app",
        host=config.HOST,
        port=config.PORT,
        reload=True
    ) 