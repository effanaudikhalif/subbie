#!/usr/bin/env python3
"""
Test script for Subly Email Service Integration
This script tests the email service functionality.
"""

import requests
import json
import time

def test_health_check():
    """Test the health check endpoint"""
    try:
        response = requests.get('http://localhost:8001/health')
        if response.status_code == 200:
            print("✅ Health check passed")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Email service is not running")
        print("Start it with: python main.py")
        return False

def test_send_email():
    """Test sending a message notification email"""
    try:
        test_data = {
            "recipient_email": "test@example.com",  # Replace with your email for testing
            "sender_name": "Test User",
            "message_preview": "Hi! This is a test message to verify the email service is working correctly.",
            "conversation_url": "http://localhost:3000/messages?conversation=test-123"
        }
        
        response = requests.post(
            'http://localhost:8001/send-message-notification',
            json=test_data
        )
        
        if response.status_code == 200:
            print("✅ Test email sent successfully")
            return True
        else:
            print(f"❌ Test email failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Email service is not running")
        return False

def test_nodejs_integration():
    """Test the Node.js integration"""
    try:
        # Simulate a message creation request
        test_message = {
            "conversation_id": "test-conversation-123",
            "sender_id": "test-sender-456",
            "body": "This is a test message from the Node.js backend"
        }
        
        response = requests.post(
            'http://localhost:4000/messages',  # Your Node.js backend
            json=test_message
        )
        
        if response.status_code == 201:
            print("✅ Node.js integration test passed")
            return True
        else:
            print(f"❌ Node.js integration test failed: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Node.js backend is not running")
        return False

def main():
    print("🧪 Testing Subly Email Service Integration...")
    print()
    
    # Test 1: Health check
    health_ok = test_health_check()
    print()
    
    # Test 2: Send test email
    if health_ok:
        email_ok = test_send_email()
        print()
    else:
        email_ok = False
    
    # Test 3: Node.js integration (optional)
    print("Testing Node.js integration (requires both services running)...")
    nodejs_ok = test_nodejs_integration()
    print()
    
    # Summary
    print("📊 Test Results:")
    print(f"  Health Check: {'✅ PASS' if health_ok else '❌ FAIL'}")
    print(f"  Email Service: {'✅ PASS' if email_ok else '❌ FAIL'}")
    print(f"  Node.js Integration: {'✅ PASS' if nodejs_ok else '❌ FAIL'}")
    print()
    
    if health_ok and email_ok:
        print("🎉 Email service is working correctly!")
        print()
        print("Next steps:")
        print("1. Configure your Supabase credentials in .env")
        print("2. Set up Gmail App Password")
        print("3. Start both services:")
        print("   - Node.js: cd ../.. && npm start")
        print("   - Python: python main.py")
    else:
        print("⚠️  Some tests failed. Check the configuration and try again.")

if __name__ == "__main__":
    main() 