const express = require('express');
const router = express.Router();

module.exports = (pool) => {
  // Get all listing images
  router.get('/', async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT * FROM listing_images');
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get listing image by id
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { rows } = await pool.query('SELECT * FROM listing_images WHERE id = $1', [id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create listing image
  router.post('/', async (req, res) => {
    try {
      const { listing_id, url, order_index } = req.body;
      const { rows } = await pool.query(
        'INSERT INTO listing_images (listing_id, url, order_index) VALUES ($1, $2, $3) RETURNING *',
        [listing_id, url, order_index]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update listing image
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { url, order_index } = req.body;
      const { rows } = await pool.query(
        'UPDATE listing_images SET url = $1, order_index = $2 WHERE id = $3 RETURNING *',
        [url, order_index, id]
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete listing image
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { rowCount } = await pool.query('DELETE FROM listing_images WHERE id = $1', [id]);
      if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}; 