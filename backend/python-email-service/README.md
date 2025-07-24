# Subly Email Service

A Python-based email notification service for the Subly rental platform. This service handles sending email notifications when users receive new messages.

**Location**: `backend/python-email-service/`

## Features

- **Message Notifications**: Send emails when users receive new messages
- **Background Processing**: Automated checking for new messages every 2 minutes
- **Multiple Email Providers**: Support for SMTP and SendGrid
- **HTML Email Templates**: Professional-looking email notifications
- **REST API**: Manual triggering and health check endpoints
- **Database Integration**: Works with Supabase for data access
- **Shared Configuration**: Uses your existing backend `.env` file

## Project Structure

```
backend/
├── python-email-service/     # This service
│   ├── api.py                 # FastAPI application with endpoints
│   ├── config.py              # Configuration management
│   ├── database.py            # Supabase database operations
│   ├── email_service.py       # Email sending functionality
│   ├── main.py               # Main entry point
│   ├── notification_worker.py # Background worker for processing
│   ├── requirements.txt       # Python dependencies
│   ├── templates/            # Email HTML templates
│   │   └── message_notification.html
│   ├── integration_example.js # Node.js integration example
│   ├── setup.py              # Setup and configuration checker
│   └── README.md            # This file
├── .env                      # Shared environment variables
├── routes/                   # Your existing Node.js routes
├── index.js                 # Your existing Node.js server
└── ...                      # Other backend files
```

## Setup

### 1. Install Dependencies

```bash
cd backend/python-email-service
pip install -r requirements.txt
```

### 2. Install Redis (Required for Celery)

**macOS:**
```bash
brew install redis
brew services start redis
```

**Ubuntu/Debian:**
```bash
sudo apt-get install redis-server
sudo systemctl start redis
```

### 3. Configure Email Settings

Add the following to your existing `backend/.env` file:

```bash
# Email Configuration (Add these to your existing .env)
SMTP_PASSWORD=your_gmail_app_password
EMAIL_FROM_NAME=Subly
EMAIL_FROM_ADDRESS=subly.founder@gmail.com
EMAIL_PROVIDER=smtp

# Optional: Customize email service settings
EMAIL_SERVICE_HOST=0.0.0.0
EMAIL_SERVICE_PORT=8001
```

### 4. Email Provider Setup

#### Gmail SMTP Setup
1. Enable 2-factor authentication on `subly.founder@gmail.com`
2. Generate an App Password for "Mail"
3. Add `SMTP_PASSWORD=your_app_password` to `backend/.env`

#### SendGrid (Alternative)
1. Create a SendGrid account
2. Verify your sender email address
3. Generate an API key
4. Add to `backend/.env`:
   ```bash
   SENDGRID_API_KEY=your_sendgrid_api_key
   SENDGRID_FROM_EMAIL=subly.founder@gmail.com
   EMAIL_PROVIDER=sendgrid
   ```

## Running the Service

### Start the Complete Service
```bash
cd backend/python-email-service
python main.py
```

This starts both:
- FastAPI server on port 8001
- Background notification worker

### Start Components Separately

**API Server Only:**
```bash
cd backend/python-email-service
python api.py
```

**Worker Only:**
```bash
cd backend/python-email-service
python notification_worker.py
```

## API Endpoints

### Health Check
```bash
GET http://localhost:8001/health
```

### Send Message Notification
```bash
POST http://localhost:8001/send-message-notification
Content-Type: application/json

{
  "recipient_email": "user@example.com",
  "sender_name": "John Doe",
  "message_preview": "Hi, I'm interested in your listing...",
  "conversation_url": "http://localhost:3000/messages?conversation=123"
}
```

### Send Test Email
```bash
POST http://localhost:8001/send-test-email?email=test@example.com
```

### Get Configuration
```bash
GET http://localhost:8001/config
```

## Integration with Node.js Backend

The email service is already integrated with your Node.js backend! When a message is created in your Node.js backend, it automatically calls the Python service to send email notifications.

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
cd backend/python-email-service && python main.py

# Terminal 3: Test integration
python test_integration.py
```

## Database Schema Requirements

Your Supabase database should have these tables:

### messages table
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES users(id),
  conversation_id UUID REFERENCES conversations(id),
  body TEXT NOT NULL,
  sent_at TIMESTAMP DEFAULT NOW(),
  email_sent BOOLEAN DEFAULT FALSE
);
```

### conversations table
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID REFERENCES users(id),
  host_id UUID REFERENCES users(id),
  listing_id UUID REFERENCES listings(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### users table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  first_name TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Environment Variables

The service uses your existing `backend/.env` file and expects these variables:

### Required (from your existing .env):
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- `FRONTEND_URL` - Your frontend URL

### Required (add to your .env):
- `SMTP_PASSWORD` - Gmail App Password

### Optional (add to your .env):
- `EMAIL_FROM_NAME` - Email sender name (default: "Subly")
- `EMAIL_FROM_ADDRESS` - Email sender address (default: "subly.founder@gmail.com")
- `EMAIL_PROVIDER` - Email provider (default: "smtp")
- `EMAIL_SERVICE_HOST` - Email service host (default: "0.0.0.0")
- `EMAIL_SERVICE_PORT` - Email service port (default: "8001")

## Monitoring and Logs

The service logs all activities. Check logs for:
- Email sending success/failure
- Database connection issues
- New message processing
- Worker status

## Troubleshooting

### Email Not Sending
1. Check Gmail App Password is correct in `backend/.env`
2. Verify `subly.founder@gmail.com` is the sender
3. Check logs for specific error messages

### Worker Not Processing Messages
1. Ensure Redis is running
2. Check database connection
3. Verify table schema matches requirements
4. Review logs for database errors

### API Not Responding
1. Check if service is running on correct port
2. Verify firewall settings
3. Check logs for startup errors

### Configuration Issues
1. Run `python setup.py` to check configuration
2. Verify all required environment variables are in `backend/.env`
3. Check that `SMTP_PASSWORD` is set correctly

## Development

### Adding New Email Templates
1. Create HTML template in `templates/` directory
2. Add template rendering method in `email_service.py`
3. Update API endpoints as needed

### Adding New Notification Types
1. Create new worker method in `notification_worker.py`
2. Add corresponding email template
3. Update database queries as needed

## Production Deployment

### Environment Variables
- Use production Supabase credentials in `backend/.env`
- Configure production email provider
- Set appropriate Redis URL
- Use production frontend URLs

### Process Management
Consider using:
- **PM2**: Process manager for Node.js-style deployment
- **Docker**: Containerized deployment
- **Systemd**: Linux service management

### Security
- Use HTTPS in production
- Implement API authentication
- Secure Redis access
- Validate email addresses 