const express = require('express');
const router = express.Router();

module.exports = (pool) => {
  // Get all listings
  router.get('/', async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT * FROM listings');
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get listing by id
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { rows } = await pool.query('SELECT * FROM listings WHERE id = $1', [id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create listing
  router.post('/', async (req, res) => {
    try {
      const { user_id, title, description, address, city, state, zip, country, price_per_night, start_date, end_date, max_occupancy, status } = req.body;
      const { rows } = await pool.query(
        `INSERT INTO listings (user_id, title, description, address, city, state, zip, country, price_per_night, start_date, end_date, max_occupancy, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
        [user_id, title, description, address, city, state, zip, country, price_per_night, start_date, end_date, max_occupancy, status]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update listing
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description, address, city, state, zip, country, price_per_night, start_date, end_date, max_occupancy, status } = req.body;
      const { rows } = await pool.query(
        `UPDATE listings SET title = $1, description = $2, address = $3, city = $4, state = $5, zip = $6, country = $7, price_per_night = $8, start_date = $9, end_date = $10, max_occupancy = $11, status = $12 WHERE id = $13 RETURNING *`,
        [title, description, address, city, state, zip, country, price_per_night, start_date, end_date, max_occupancy, status, id]
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete listing
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { rowCount } = await pool.query('DELETE FROM listings WHERE id = $1', [id]);
      if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}; 