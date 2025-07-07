const express = require('express');
const router = express.Router();

module.exports = (pool) => {
  // Get or create a conversation for a listing/user pair
  router.post('/find-or-create', async (req, res) => {
    const { listing_id, guest_id, host_id } = req.body;
    if (!listing_id || !guest_id || !host_id) {
      return res.status(400).json({ error: 'listing_id, guest_id, and host_id are required' });
    }
    try {
      // Try to find existing conversation
      const { rows } = await pool.query(
        'SELECT * FROM conversations WHERE listing_id = $1 AND guest_id = $2 AND host_id = $3',
        [listing_id, guest_id, host_id]
      );
      if (rows.length > 0) {
        return res.json(rows[0]);
      }
      // Create new conversation
      const insert = await pool.query(
        'INSERT INTO conversations (listing_id, guest_id, host_id) VALUES ($1, $2, $3) RETURNING *',
        [listing_id, guest_id, host_id]
      );
      res.status(201).json(insert.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get all conversations for a user (as guest or host)
  router.get('/user/:user_id', async (req, res) => {
    const { user_id } = req.params;
    try {
      const { rows } = await pool.query(
        'SELECT * FROM conversations WHERE guest_id = $1 OR host_id = $1 ORDER BY created_at DESC',
        [user_id]
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get a conversation by id
  router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const { rows } = await pool.query('SELECT * FROM conversations WHERE id = $1', [id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}; 