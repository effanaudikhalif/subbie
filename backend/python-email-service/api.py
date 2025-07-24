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
    return {
        "email_provider": email_service.provider,
        "from_email": email_service.from_email,
        "from_name": email_service.from_name
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