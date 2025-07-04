const express = require('express');
const router = express.Router();

module.exports = (pool) => {
  // Get all users
  router.get('/', async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT * FROM users');
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get user by id
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create user
  router.post('/', async (req, res) => {
    try {
      const { id, university_id, name, email, phone, stripe_account } = req.body;
      const { rows } = await pool.query(
        'INSERT INTO users (id, university_id, name, email, phone, stripe_account) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [id, university_id, name, email, phone, stripe_account]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update user
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { university_id, name, email, phone, stripe_account } = req.body;
      const { rows } = await pool.query(
        'UPDATE users SET university_id = $1, name = $2, email = $3, phone = $4, stripe_account = $5 WHERE id = $6 RETURNING *',
        [university_id, name, email, phone, stripe_account, id]
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete user
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { rowCount } = await pool.query('DELETE FROM users WHERE id = $1', [id]);
      if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}; 