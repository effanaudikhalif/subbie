const express = require('express');

module.exports = (pool) => {
  const router = express.Router();

  // Get all renter reviews
  router.get('/', async (req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT rr.*, 
               u1.name as reviewer_name,
               u2.name as reviewed_name,
               b.listing_id
        FROM renter_reviews rr
        JOIN users u1 ON rr.reviewer_id = u1.id
        JOIN users u2 ON rr.reviewed_id = u2.id
        JOIN bookings b ON rr.booking_id = b.id
        ORDER BY rr.created_at DESC
      `);
      res.json(rows);
    } catch (err) {
      console.error('Error fetching renter reviews:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get renter reviews by listing ID
  router.get('/listing/:listingId', async (req, res) => {
    try {
      const { listingId } = req.params;
      const { rows } = await pool.query(
        'SELECT * FROM renter_reviews WHERE listing_id = $1 ORDER BY created_at DESC',
        [listingId]
      );
      res.json(rows);
    } catch (err) {
      console.error('Error fetching listing reviews:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get renter reviews by user ID (as reviewed)
  router.get('/user/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const { rows } = await pool.query(
        'SELECT * FROM renter_reviews WHERE reviewed_id = $1 ORDER BY created_at DESC',
        [userId]
      );
      res.json(rows);
    } catch (err) {
      console.error('Error fetching user reviews:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get renter reviews by reviewer user ID
  router.get('/reviewer/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const { rows } = await pool.query(`
        SELECT rr.*, 
               u1.name as reviewer_name,
               u2.name as reviewed_name,
               b.listing_id
        FROM renter_reviews rr
        JOIN users u1 ON rr.reviewer_id = u1.id
        JOIN users u2 ON rr.reviewed_id = u2.id
        JOIN bookings b ON rr.booking_id = b.id
        WHERE rr.reviewer_id = $1
        ORDER BY rr.created_at DESC
      `, [userId]);
      res.json(rows);
    } catch (err) {
      console.error('Error fetching renter reviews by reviewer:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Create a new renter review
  router.post('/', async (req, res) => {
    try {
      const { 
        listing_id,
        reviewer_id, 
        reviewed_id, 
        punctuality, 
        communication, 
        property_care, 
        compliance, 
        comment 
      } = req.body;

      // Validate required fields
      if (!listing_id || !reviewer_id || !reviewed_id || 
          !punctuality || !communication || !property_care || !compliance) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Validate all ratings are between 1 and 5
      const ratings = [punctuality, communication, property_care, compliance];
      for (const rating of ratings) {
        if (rating < 1 || rating > 5) {
          return res.status(400).json({ error: 'All ratings must be between 1 and 5' });
        }
      }

      // Check if reviewee is not self-review
      if (reviewer_id === reviewed_id) {
        return res.status(400).json({ error: 'You cannot review yourself' });
      }

      // Check if reviewer has already written a review for this listing and reviewed
      const { rows: existingReview } = await pool.query(
        'SELECT * FROM renter_reviews WHERE listing_id = $1 AND reviewer_id = $2 AND reviewed_id = $3',
        [listing_id, reviewer_id, reviewed_id]
      );

      if (existingReview.length > 0) {
        return res.status(400).json({ error: 'You have already written a review for this person for this listing' });
      }

      // Create the review
      const { rows } = await pool.query(`
        INSERT INTO renter_reviews (
          listing_id,
          reviewer_id, 
          reviewed_id, 
          punctuality, 
          communication, 
          property_care, 
          compliance, 
          comment
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
        RETURNING *
      `, [
        listing_id, 
        reviewer_id, 
        reviewed_id, 
        punctuality, 
        communication, 
        property_care, 
        compliance, 
        comment
      ]);

      res.json(rows[0]);
    } catch (err) {
      console.error('Error creating renter review:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Update a renter review
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { 
        punctuality, 
        communication, 
        property_care, 
        compliance, 
        comment 
      } = req.body;

      const { rows } = await pool.query(`
        UPDATE renter_reviews SET 
          punctuality = $1,
          communication = $2,
          property_care = $3,
          compliance = $4,
          comment = $5,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $6 
        RETURNING *
      `, [punctuality, communication, property_care, compliance, comment, id]);

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Review not found' });
      }

      res.json(rows[0]);
    } catch (err) {
      console.error('Error updating renter review:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Delete a renter review
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { rows } = await pool.query(
        'DELETE FROM renter_reviews WHERE id = $1 RETURNING *',
        [id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Review not found' });
      }

      res.json({ message: 'Review deleted successfully' });
    } catch (err) {
      console.error('Error deleting renter review:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get average rating for a user (as reviewed)
  router.get('/average/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const { rows } = await pool.query(`
        SELECT 
          AVG(rating) as average_rating,
          COUNT(*) as total_reviews,
          AVG(punctuality) as avg_punctuality,
          AVG(communication) as avg_communication,
          AVG(property_care) as avg_property_care,
          AVG(compliance) as avg_compliance
        FROM renter_reviews 
        WHERE reviewed_id = $1
      `, [userId]);

      res.json(rows[0]);
    } catch (err) {
      console.error('Error fetching average rating:', err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}; 