# Quick Start Guide - Subly Email Service

## 🚀 Setup in 5 Minutes

### 1. Configure Email Settings

Add the following to your existing `backend/.env` file:

```bash
# Email Configuration (Add these to your existing .env)
SMTP_PASSWORD=your_gmail_app_password
EMAIL_FROM_NAME=Subly
EMAIL_FROM_ADDRESS=subly.founder@gmail.com
EMAIL_PROVIDER=smtp
```

### 2. Set Up Gmail App Password

1. Go to your Google Account settings
2. Enable 2-factor authentication on `subly.founder@gmail.com`
3. Generate an App Password for "Mail"
4. Add that password to `SMTP_PASSWORD` in `backend/.env`

### 3. Start the Email Service

```bash
cd backend/python-email-service
python3 main.py
```

### 4. Test the Service

```bash
# Test health check
curl http://localhost:8001/health

# Test email sending (replace with your email)
curl -X POST http://localhost:8001/send-test-email?email=your@email.com
```

## 🔧 Integration with Your Backend

The email service is already integrated with your Node.js backend! When users send messages, they'll automatically receive email notifications.

### How It Works:

1. **User sends message** → Node.js creates message in database
2. **Node.js calls Python service** → Sends email notification
3. **Recipient gets email** → With message preview and link to conversation

### Manual Testing:

```bash
# Start both services
# Terminal 1: Node.js backend
cd backend && npm start

# Terminal 2: Python email service  
cd backend/python-email-service && python3 main.py

# Terminal 3: Test integration
python3 test_integration.py
```

## 📧 Email Features

- **Professional HTML templates** with Subly branding
- **Message previews** showing first 100 characters
- **Direct links** to conversations
- **Mobile-friendly** design
- **Automatic sending** when messages are created

## 🛠️ Troubleshooting

### Email Not Sending?
1. Check Gmail App Password is correct in `backend/.env`
2. Verify `subly.founder@gmail.com` is the sender
3. Check logs for specific error messages

### Service Not Starting?
1. Ensure Redis is running: `brew services start redis`
2. Check all dependencies: `pip3 install -r requirements.txt`
3. Verify `backend/.env` file exists and has `SMTP_PASSWORD`

### Integration Not Working?
1. Check both services are running
2. Verify Node.js backend is on port 4000
3. Check Python service is on port 8001
4. Test with: `python3 test_integration.py`

### Configuration Issues?
1. Run setup check: `python3 setup.py`
2. Verify all required variables are in `backend/.env`
3. Check that `SMTP_PASSWORD` is set correctly

## 📁 File Structure

```
backend/
├── .env                       # Shared environment variables
├── python-email-service/      # Email service
│   ├── main.py                # Start the service
│   ├── api.py                 # REST API endpoints
│   ├── email_service.py       # Email sending logic
│   ├── notification_worker.py # Background processing
│   ├── database.py            # Supabase integration
│   ├── config.py              # Configuration management
│   ├── templates/             # Email HTML templates
│   ├── test_integration.py    # Test the integration
│   ├── setup.py               # Configuration checker
│   └── README.md              # Full documentation
├── routes/                    # Your existing Node.js routes
├── index.js                   # Your existing Node.js server
└── ...                        # Other backend files
```

## 🎯 What's Next?

1. **Add SMTP_PASSWORD to backend/.env**
2. **Start both services**
3. **Test with real messages**
4. **Monitor logs** for any issues

The email service will automatically send notifications whenever users receive new messages in your Subly platform!

## 🔍 Configuration Check

Run this to verify everything is set up correctly:

```bash
cd backend/python-email-service
python3 setup.py
```

This will check:
- ✅ Backend .env file exists
- ✅ Required environment variables are present
- ✅ Email configuration is set up
- ✅ Python dependencies are installed
- ✅ Redis is running 