const express = require('express');
const router = express.Router();

module.exports = (pool) => {
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
      res.status(201).json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}; 