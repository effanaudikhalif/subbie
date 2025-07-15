const express = require('express');
const router = express.Router();

module.exports = (pool) => {
  // Get user's wishlist
  router.get('/user/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const { rows } = await pool.query(`
        SELECT w.*, l.*, u.name, u.avatar_url, univ.name as university_name
        FROM wishlist w
        JOIN listings l ON w.listing_id = l.id
        LEFT JOIN users u ON l.user_id = u.id
        LEFT JOIN universities univ ON u.university_id = univ.id
        WHERE w.user_id = $1 AND l.status = 'active'
        ORDER BY w.created_at DESC
      `, [userId]);

      // Fetch images for each listing
      for (let listing of rows) {
        const imageResult = await pool.query(
          'SELECT url FROM listing_images WHERE listing_id = $1 ORDER BY order_index',
          [listing.listing_id]
        );
        listing.images = imageResult.rows;
      }

      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Add listing to wishlist
  router.post('/', async (req, res) => {
    try {
      const { user_id, listing_id } = req.body;
      
      // Check if already in wishlist
      const existing = await pool.query(
        'SELECT id FROM wishlist WHERE user_id = $1 AND listing_id = $2',
        [user_id, listing_id]
      );

      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'Listing already in wishlist' });
      }

      const { rows } = await pool.query(
        'INSERT INTO wishlist (user_id, listing_id) VALUES ($1, $2) RETURNING *',
        [user_id, listing_id]
      );
      
      res.status(201).json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Remove listing from wishlist
  router.delete('/:userId/:listingId', async (req, res) => {
    try {
      const { userId, listingId } = req.params;
      const { rows } = await pool.query(
        'DELETE FROM wishlist WHERE user_id = $1 AND listing_id = $2 RETURNING *',
        [userId, listingId]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Wishlist item not found' });
      }
      
      res.json({ message: 'Removed from wishlist' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Check if listing is in user's wishlist
  router.get('/check/:userId/:listingId', async (req, res) => {
    try {
      const { userId, listingId } = req.params;
      const { rows } = await pool.query(
        'SELECT id FROM wishlist WHERE user_id = $1 AND listing_id = $2',
        [userId, listingId]
      );
      
      res.json({ inWishlist: rows.length > 0 });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}; 