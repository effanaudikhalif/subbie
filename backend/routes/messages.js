const express = require('express');
const router = express.Router();
const axios = require('axios');

module.exports = (pool) => {
  /**
   * Send email notification for new messages
   */
  async function sendMessageNotification(messageData) {
    try {
      // Get conversation details to find participants
      const { rows: conversations } = await pool.query(
        'SELECT * FROM conversations WHERE id = $1',
        [messageData.conversation_id]
      );
      
      if (conversations.length === 0) {
        console.error('Conversation not found');
        return;
      }
      
      const conversation = conversations[0];
      
      // Get sender details
      const { rows: senders } = await pool.query(
        'SELECT * FROM users WHERE id = $1',
        [messageData.sender_id]
      );
      
      if (senders.length === 0) {
        console.error('Sender not found');
        return;
      }
      
      const sender = senders[0];
      
      // Determine recipient (the other person in the conversation)
      let recipient_id;
      if (conversation.guest_id === messageData.sender_id) {
        recipient_id = conversation.host_id;
      } else {
        recipient_id = conversation.guest_id;
      }
      
      // Get recipient details
      const { rows: recipients } = await pool.query(
        'SELECT * FROM users WHERE id = $1',
        [recipient_id]
      );
      
      if (recipients.length === 0) {
        console.error('Recipient not found');
        return;
      }
      
      const recipient = recipients[0];
      
      // Send email notification
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const emailServiceUrl = process.env.EMAIL_SERVICE_URL || 'http://localhost:8001';
      
      const response = await axios.post(`${emailServiceUrl}/send-message-notification`, {
        recipient_email: recipient.email,
        sender_name: sender.name || sender.first_name || 'Someone',
        message_preview: messageData.body.substring(0, 100) + (messageData.body.length > 100 ? '...' : ''),
        conversation_url: `${frontendUrl}/messages?conversation=${messageData.conversation_id}`
      });
      
      console.log('Email notification sent successfully');
      return response.data;
    } catch (error) {
      console.error('Failed to send email notification:', error.message);
      // Don't throw error - email failure shouldn't break message creation
      return null;
    }
  }

  // Get all messages for a conversation
  router.get('/conversation/:conversation_id', async (req, res) => {
    const { conversation_id } = req.params;
    try {
      const { rows } = await pool.query(
        'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY sent_at ASC',
        [conversation_id]
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Post a new message
  router.post('/', async (req, res) => {
    const { conversation_id, sender_id, body } = req.body;
    if (!conversation_id || !sender_id || !body) {
      return res.status(400).json({ error: 'conversation_id, sender_id, and body are required' });
    }
    try {
      const { rows } = await pool.query(
        'INSERT INTO messages (conversation_id, sender_id, body) VALUES ($1, $2, $3) RETURNING *',
        [conversation_id, sender_id, body]
      );
      
      console.log(`Message created: ${rows[0].id}`);
      
      // Send email notification (non-blocking)
      sendMessageNotification({
        message: rows[0],
        conversation_id,
        sender_id,
        body
      }).catch(err => {
        console.error('Email notification failed:', err);
      });
      
      res.status(201).json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}; 