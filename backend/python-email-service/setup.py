#!/usr/bin/env python3
"""
Setup script for Subly Email Service
This script helps configure the email service with the correct settings.
"""

import os
import sys
from pathlib import Path

def check_backend_env():
    """Check if backend .env file exists and has required variables"""
    # Look for .env file in the backend directory (same level as python-email-service)
    backend_env_path = Path(__file__).parent.parent / '.env'
    
    if not backend_env_path.exists():
        print("❌ Backend .env file not found")
        print(f"Expected location: {backend_env_path}")
        return False
    
    print("✅ Backend .env file found")
    
    # Load the environment variables from the backend .env file
    from dotenv import load_dotenv
    load_dotenv(backend_env_path)
    
    # Check for required environment variables
    required_vars = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'FRONTEND_URL'
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"❌ Missing required environment variables: {', '.join(missing_vars)}")
        return False
    
    print("✅ All required environment variables found")
    return True

def check_email_config():
    """Check email configuration"""
    # Load environment variables from backend .env
    backend_env_path = Path(__file__).parent.parent / '.env'
    from dotenv import load_dotenv
    load_dotenv(backend_env_path)
    
    smtp_password = os.getenv("SMTP_PASSWORD")
    
    if not smtp_password:
        print("⚠️  SMTP_PASSWORD not found in backend .env")
        print("You need to add this to your backend .env file:")
        print("SMTP_PASSWORD=your_gmail_app_password")
        print()
        print("To set up Gmail App Password:")
        print("1. Enable 2-factor authentication on subly.founder@gmail.com")
        print("2. Generate an App Password for 'Mail'")
        print("3. Add SMTP_PASSWORD=your_app_password to backend/.env")
        return False
    
    print("✅ SMTP_PASSWORD configured")
    return True

def check_dependencies():
    """Check if required dependencies are installed"""
    try:
        import fastapi
        import uvicorn
        import celery
        import redis
        import jinja2
        import supabase
        import sendgrid
        print("✅ All Python dependencies are installed")
        return True
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("Run: pip install -r requirements.txt")
        return False

def check_redis():
    """Check if Redis is running"""
    try:
        import redis
        r = redis.Redis(host='localhost', port=6379, db=0)
        r.ping()
        print("✅ Redis is running")
        return True
    except Exception as e:
        print("❌ Redis is not running")
        print("Install Redis:")
        print("  macOS: brew install redis && brew services start redis")
        print("  Ubuntu: sudo apt-get install redis-server && sudo systemctl start redis")
        return False

def main():
    print("🚀 Setting up Subly Email Service...")
    print("📁 Using backend .env file for configuration")
    print()
    
    # Check backend environment
    env_ok = check_backend_env()
    print()
    
    # Check email configuration
    email_ok = check_email_config()
    print()
    
    # Check dependencies
    deps_ok = check_dependencies()
    print()
    
    # Check Redis
    redis_ok = check_redis()
    print()
    
    if env_ok and email_ok and deps_ok and redis_ok:
        print("✅ Setup complete!")
        print()
        print("Configuration:")
        print(f"  Supabase URL: {os.getenv('NEXT_PUBLIC_SUPABASE_URL', 'Not set')}")
        print(f"  Frontend URL: {os.getenv('FRONTEND_URL', 'Not set')}")
        print(f"  Email From: subly.founder@gmail.com")
        print()
        print("Next steps:")
        print("1. Add SMTP_PASSWORD to backend/.env file")
        print("2. Run: python main.py")
        print("3. Test with: curl http://localhost:8001/health")
    else:
        print("❌ Setup incomplete. Please fix the issues above.")

if __name__ == "__main__":
    main() 