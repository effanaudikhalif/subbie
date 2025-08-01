import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables from the parent directory's .env file
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

class Config:
    # Supabase Configuration (from existing backend .env)
    SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    
    # Email Configuration (using Subly email)
    SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER = os.getenv("SMTP_USER", "subly.founder@gmail.com")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")  # You'll need to add this to your .env
    
    # SendGrid Configuration (optional)
    SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
    SENDGRID_FROM_EMAIL = os.getenv("SENDGRID_FROM_EMAIL")
    
    # Redis Configuration
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
    
    # Server Configuration
    HOST = os.getenv("EMAIL_SERVICE_HOST", "0.0.0.0")
    PORT = int(os.getenv("PORT", "8001"))
    
    # Email Settings
    EMAIL_FROM_NAME = os.getenv("EMAIL_FROM_NAME", "Subly")
    EMAIL_FROM_ADDRESS = os.getenv("EMAIL_FROM_ADDRESS", "subly.founder@gmail.com")
    
    # Email Provider (smtp or sendgrid)
    EMAIL_PROVIDER = os.getenv("EMAIL_PROVIDER", "smtp")
    
    # Frontend URL (from existing backend .env)
    FRONTEND_URL = os.getenv("FRONTEND_URL")
    if not FRONTEND_URL:
        # Only default to localhost in development
        FRONTEND_URL = "http://localhost:3000" if os.getenv("NODE_ENV") != "production" else None
        if not FRONTEND_URL:
            raise ValueError("FRONTEND_URL environment variable must be set in production")

config = Config() 