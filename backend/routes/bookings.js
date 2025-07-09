const express = require('express');
const router = express.Router();

module.exports = (pool) => {
  // Get all bookings
  router.get('/', async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT * FROM bookings');
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get booking by id
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { rows } = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create booking
  router.post('/', async (req, res) => {
    try {
      const { listing_id, guest_id, host_id, start_date, end_date, price_per_night, total_price, status, payment_status } = req.body;
      const { rows } = await pool.query(
        `INSERT INTO bookings (listing_id, guest_id, host_id, start_date, end_date, price_per_night, total_price, status, payment_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [listing_id, guest_id, host_id, start_date, end_date, price_per_night, total_price, status, payment_status]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update booking
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { start_date, end_date, price_per_night, total_price, status, payment_status } = req.body;
      const { rows } = await pool.query(
        `UPDATE bookings SET start_date = $1, end_date = $2, price_per_night = $3, total_price = $4, status = $5, payment_status = $6 WHERE id = $7 RETURNING *`,
        [start_date, end_date, price_per_night, total_price, status, payment_status, id]
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete booking
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { rowCount } = await pool.query('DELETE FROM bookings WHERE id = $1', [id]);
      if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get all bookings for a specific user (guest)
  router.get('/user/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const { rows } = await pool.query('SELECT * FROM bookings WHERE guest_id = $1', [userId]);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}; 