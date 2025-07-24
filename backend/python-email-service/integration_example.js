// Example integration with Node.js backend
// Add this to your existing message creation endpoint
// Located in: backend/python-email-service/integration_example.js

const axios = require('axios');

/**
 * Send email notification when a new message is created
 * Add this to your existing message creation endpoint
 */
async function sendMessageNotification(messageData) {
  try {
    const response = await axios.post('http://localhost:8001/send-message-notification', {
      recipient_email: messageData.recipient.email,
      sender_name: messageData.sender.name || messageData.sender.first_name || 'Someone',
      message_preview: messageData.content.substring(0, 100) + (messageData.content.length > 100 ? '...' : ''),
      conversation_url: `http://localhost:3000/messages?conversation=${messageData.conversation_id}`
    });
    
    console.log('Email notification sent successfully');
    return response.data;
  } catch (error) {
    console.error('Failed to send email notification:', error.message);
    // Don't throw error - email failure shouldn't break message creation
    return null;
  }
}

/**
 * Example usage in your existing message creation endpoint
 * This would go in your backend/routes/messages.js file
 */
async function createMessage(req, res) {
  try {
    // Your existing message creation logic
    const { sender_id, recipient_id, content, conversation_id } = req.body;
    
    // Create message in database
    const message = await createMessageInDatabase({
      sender_id,
      recipient_id,
      content,
      conversation_id
    });
    
    // Get sender and recipient details
    const sender = await getUserById(sender_id);
    const recipient = await getUserById(recipient_id);
    
    // Send email notification (non-blocking)
    sendMessageNotification({
      recipient,
      sender,
      content,
      conversation_id
    }).catch(err => {
      console.error('Email notification failed:', err);
    });
    
    res.json({ success: true, message: 'Message created successfully' });
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
}

/**
 * Health check for the email service
 */
async function checkEmailServiceHealth() {
  try {
    const response = await axios.get('http://localhost:8001/health');
    console.log('Email service is healthy:', response.data);
    return true;
  } catch (error) {
    console.error('Email service is not responding:', error.message);
    return false;
  }
}

/**
 * Send test email for debugging
 */
async function sendTestEmail(email) {
  try {
    const response = await axios.post(`http://localhost:8001/send-test-email?email=${email}`);
    console.log('Test email sent successfully');
    return response.data;
  } catch (error) {
    console.error('Failed to send test email:', error.message);
    return null;
  }
}

module.exports = {
  sendMessageNotification,
  checkEmailServiceHealth,
  sendTestEmail
}; 