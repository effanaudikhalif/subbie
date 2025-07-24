# Email Notification System

## Overview

The email notification system automatically sends emails to hosts when their listings are added, edited, deleted, or expired. The system is designed to keep hosts informed about the status of their properties on the Subly platform.

## Features

### ✅ **Implemented Notifications**

1. **Listing Added** - Sent when a new listing is created
2. **Listing Edited** - Sent when a listing is updated
3. **Listing Deleted** - Sent when a listing is removed
4. **Listing Expired** - Sent when a listing automatically expires

### 📧 **Email Templates**

- **Professional Design**: All emails use consistent, branded templates
- **Responsive Layout**: Mobile-friendly email design
- **Clear Call-to-Actions**: Direct links to view listings or dashboard
- **Detailed Information**: Includes listing details, dates, and pricing

## Architecture

### **Components**

1. **Email Templates** (`backend/python-email-service/templates/`)
   - `listing_added.html` - New listing confirmation
   - `listing_edited.html` - Listing update notification
   - `listing_deleted.html` - Listing removal confirmation
   - `listing_expired.html` - Expiration notification

2. **Email Service** (`backend/python-email-service/`)
   - FastAPI-based email service
   - Supports SMTP and SendGrid providers
   - Template rendering with Jinja2

3. **Node.js Integration** (`backend/`)
   - `emailNotifications.js` - HTTP client for email service
   - `mockEmailService.js` - Mock service for testing
   - Integrated into listing routes

### **Email Providers**

- **SMTP** (Gmail, Outlook, etc.)
- **SendGrid** (Cloud email service)
- **Mock Service** (For development/testing)

## Implementation Details

### **Backend Integration**

The email notifications are integrated into the main listing operations:

```javascript
// Listing Creation
router.post('/', async (req, res) => {
  // ... create listing logic ...
  
  // Send email notification
  await emailNotifications.sendListingAddedNotification(
    host.email, host.name, listing
  );
});

// Listing Update
router.put('/:id', async (req, res) => {
  // ... update listing logic ...
  
  // Send email notification
  await emailNotifications.sendListingEditedNotification(
    host.email, host.name, listing
  );
});

// Listing Deletion
router.delete('/:id', async (req, res) => {
  // ... delete listing logic ...
  
  // Send email notification
  await emailNotifications.sendListingDeletedNotification(
    host.email, host.name, listing
  );
});
```

### **Automatic Expiration**

The expiration service automatically sends notifications when listings expire:

```javascript
// Expiration Service
async expireListings() {
  // Get expiring listings
  const expiringListings = await pool.query(`
    SELECT l.*, u.name, u.email 
    FROM listings l 
    JOIN users u ON l.user_id = u.id
    WHERE l.end_date < CURRENT_TIMESTAMP
  `);
  
  // Update status to inactive
  await pool.query(`
    UPDATE listings 
    SET status = 'inactive' 
    WHERE end_date < CURRENT_TIMESTAMP
  `);
  
  // Send email notifications
  for (const listing of expiringListings.rows) {
    await emailNotifications.sendListingExpiredNotification(
      listing.email, listing.name, listing
    );
  }
}
```

## Configuration

### **Environment Variables**

```bash
# Email Service Configuration
EMAIL_SERVICE_URL=http://localhost:8001
EMAIL_PROVIDER=smtp  # or sendgrid
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# SendGrid Configuration (optional)
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=your-email@domain.com

# Email Settings
EMAIL_FROM_NAME=Subly
EMAIL_FROM_ADDRESS=notifications@subly.com
```

### **Email Service Setup**

1. **Install Python Dependencies**:
   ```bash
   cd backend/python-email-service
   pip install -r requirements.txt
   ```

2. **Start Email Service**:
   ```bash
   python3 main.py
   # or
   uvicorn api:app --host 0.0.0.0 --port 8001
   ```

3. **Configure Email Provider**:
   - Update `.env` file with your email credentials
   - Test with `/send-test-email` endpoint

## Testing

### **Mock Email Service**

For development and testing, a mock email service is available that logs notifications instead of sending actual emails:

```javascript
// Use mock service instead of real email service
const MockEmailService = require('../mockEmailService');
const emailNotifications = new MockEmailService();
```

### **Test Endpoints**

```bash
# Test email notification
curl -X POST http://localhost:4000/api/test-email-notification \
  -H "Content-Type: application/json" \
  -d '{
    "type": "listing_added",
    "recipientEmail": "test@example.com",
    "hostName": "Test Host",
    "listingData": {
      "id": "test-123",
      "title": "Test Listing",
      "address": "123 Test St",
      "city": "Test City",
      "state": "TS",
      "zip": "12345",
      "price_per_night": "100",
      "start_date": "2025-01-01",
      "end_date": "2025-01-31"
    }
  }'

# View mock notifications
curl http://localhost:4000/api/mock-email-notifications

# Clear mock notifications
curl -X DELETE http://localhost:4000/api/mock-email-notifications
```

### **Manual Expiration Test**

```bash
# Trigger expiration check
curl -X POST http://localhost:4000/api/expire-listings

# Check for expired listings
curl http://localhost:4000/api/listings
```

## Email Templates

### **Listing Added Template**

- **Subject**: "Your listing '[Title]' has been added to Subly"
- **Content**: Welcome message, listing details, view listing link
- **Design**: Green gradient header with celebration emoji

### **Listing Edited Template**

- **Subject**: "Your listing '[Title]' has been updated on Subly"
- **Content**: Update confirmation, listing details, view listing link
- **Design**: Blue gradient header with edit emoji

### **Listing Deleted Template**

- **Subject**: "Your listing '[Title]' has been removed from Subly"
- **Content**: Removal confirmation, listing details, dashboard link
- **Design**: Red gradient header with delete emoji

### **Listing Expired Template**

- **Subject**: "Your listing '[Title]' has expired on Subly"
- **Content**: Expiration notification, listing details, reactivation options
- **Design**: Yellow gradient header with clock emoji

## Error Handling

### **Graceful Degradation**

- Email failures don't break listing operations
- All email operations are wrapped in try-catch blocks
- Failed emails are logged but don't affect user experience

### **Logging**

```javascript
try {
  await emailNotifications.sendListingAddedNotification(
    host.email, host.name, listing
  );
} catch (emailError) {
  console.error('Failed to send listing added email notification:', emailError);
  // Don't fail the request if email fails
}
```

## Production Deployment

### **Email Service**

1. **Deploy Python Service**:
   - Use production WSGI server (Gunicorn)
   - Set up proper environment variables
   - Configure email provider credentials

2. **Configure Email Provider**:
   - Set up domain authentication
   - Configure SPF/DKIM records
   - Monitor email deliverability

3. **Monitoring**:
   - Set up email delivery monitoring
   - Monitor bounce rates
   - Track email engagement

### **Scaling Considerations**

- **Queue System**: For high volume, consider using Redis/RabbitMQ
- **Rate Limiting**: Implement email rate limiting
- **Batching**: Send emails in batches for efficiency
- **Retry Logic**: Implement retry mechanism for failed emails

## Security

### **Email Security**

- **Authentication**: Use app passwords for SMTP
- **Encryption**: TLS/SSL for email transmission
- **Validation**: Validate email addresses before sending
- **Rate Limiting**: Prevent email abuse

### **Data Protection**

- **PII Handling**: Secure handling of user email addresses
- **Template Security**: Sanitize user data in email templates
- **Access Control**: Restrict email service access

## Future Enhancements

### **Planned Features**

1. **Email Preferences**: Allow users to opt-out of specific notifications
2. **Rich Notifications**: Include listing images in emails
3. **SMS Notifications**: Add SMS support for urgent notifications
4. **Push Notifications**: Mobile app push notifications
5. **Notification Center**: In-app notification history

### **Advanced Features**

1. **Smart Scheduling**: Send emails at optimal times
2. **A/B Testing**: Test different email templates
3. **Analytics**: Track email open rates and engagement
4. **Personalization**: Dynamic content based on user behavior

## Troubleshooting

### **Common Issues**

1. **Email Service Not Starting**:
   - Check Python dependencies
   - Verify port availability
   - Check environment variables

2. **Emails Not Sending**:
   - Verify email provider credentials
   - Check SMTP settings
   - Monitor email service logs

3. **Template Rendering Issues**:
   - Check Jinja2 template syntax
   - Verify template file paths
   - Test template rendering

### **Debug Commands**

```bash
# Check email service health
curl http://localhost:8001/health

# Test email configuration
curl http://localhost:8001/config

# View email service logs
tail -f /var/log/email-service.log
```

## Support

For issues with the email notification system:

1. Check the logs for error messages
2. Verify email service configuration
3. Test with mock email service
4. Contact the development team

---

**Note**: This system is designed to be robust and user-friendly, ensuring hosts stay informed about their listings while maintaining a smooth user experience. 