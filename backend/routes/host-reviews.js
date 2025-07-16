const express = require('express');

module.exports = (pool) => {
  const router = express.Router();

  // Get all reviews
  router.get('/', async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT * FROM host_reviews ORDER BY created_at DESC');
      res.json(rows);
    } catch (err) {
      console.error('Error fetching reviews:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get reviews for a specific booking
  router.get('/booking/:bookingId', async (req, res) => {
    try {
      const { bookingId } = req.params;
      const { rows } = await pool.query(
        'SELECT * FROM host_reviews WHERE booking_id = $1 ORDER BY created_at DESC',
        [bookingId]
      );
      res.json(rows);
    } catch (err) {
      console.error('Error fetching booking reviews:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get reviews for a specific user (as reviewee)
  router.get('/user/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const { rows } = await pool.query(
        'SELECT * FROM host_reviews WHERE reviewee_id = $1 ORDER BY created_at DESC',
        [userId]
      );
      res.json(rows);
    } catch (err) {
      console.error('Error fetching user reviews:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Create a new review
  router.post('/', async (req, res) => {
    try {
      const { 
        booking_id, 
        reviewer_id, 
        reviewee_id, 
        cleanliness_rating,
        accuracy_rating,
        communication_rating,
        location_rating,
        value_rating,
        comment 
      } = req.body;

      // Validate required fields
      if (!booking_id || !reviewer_id || !reviewee_id || 
          !cleanliness_rating || !accuracy_rating || !communication_rating || 
          !location_rating || !value_rating) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Validate all ratings are between 1 and 5
      const ratings = [cleanliness_rating, accuracy_rating, communication_rating, location_rating, value_rating];
      for (const rating of ratings) {
        if (rating < 1 || rating > 5) {
          return res.status(400).json({ error: 'All ratings must be between 1 and 5' });
        }
      }

      // Check if booking exists and is completed
      const { rows: bookingRows } = await pool.query(
        'SELECT * FROM bookings WHERE id = $1',
        [booking_id]
      );

      if (bookingRows.length === 0) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      const booking = bookingRows[0];
      if (booking.status !== 'ended') {
        return res.status(400).json({ error: 'Reviews can only be written for completed bookings' });
      }

      // Check if reviewer is either the guest or host of this booking
      if (reviewer_id !== booking.guest_id && reviewer_id !== booking.host_id) {
        return res.status(403).json({ error: 'You can only review participants of this booking' });
      }

      // Check if reviewee is the other participant (not self-review)
      if (reviewer_id === reviewee_id) {
        return res.status(400).json({ error: 'You cannot review yourself' });
      }

      if (reviewee_id !== booking.guest_id && reviewee_id !== booking.host_id) {
        return res.status(400).json({ error: 'You can only review the other participant of this booking' });
      }

      // Check if reviewer has already written a review for this booking and reviewee
      const { rows: existingReview } = await pool.query(
        'SELECT * FROM host_reviews WHERE booking_id = $1 AND reviewer_id = $2 AND reviewee_id = $3',
        [booking_id, reviewer_id, reviewee_id]
      );

      if (existingReview.length > 0) {
        return res.status(400).json({ error: 'You have already written a review for this person for this booking' });
      }

      // Create the review
      const { rows } = await pool.query(
        `INSERT INTO host_reviews (
          booking_id, 
          reviewer_id, 
          reviewee_id, 
          cleanliness_rating,
          accuracy_rating,
          communication_rating,
          location_rating,
          value_rating,
          comment
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [booking_id, reviewer_id, reviewee_id, cleanliness_rating, accuracy_rating, communication_rating, location_rating, value_rating, comment]
      );

      console.log('Review created:', rows[0].id);
      res.json(rows[0]);
    } catch (err) {
      console.error('Error creating review:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Update a review
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { 
        cleanliness_rating, 
        accuracy_rating, 
        communication_rating, 
        location_rating, 
        value_rating, 
        comment 
      } = req.body;

      // Validate ratings if provided
      const ratings = [cleanliness_rating, accuracy_rating, communication_rating, location_rating, value_rating];
      for (const rating of ratings) {
        if (rating !== undefined && (rating < 1 || rating > 5)) {
          return res.status(400).json({ error: 'All ratings must be between 1 and 5' });
        }
      }

      // Get the review
      const { rows } = await pool.query(
        'SELECT * FROM host_reviews WHERE id = $1',
        [id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Review not found' });
      }

      const review = rows[0];

      // Check if user is the reviewer
      if (review.reviewer_id !== req.body.reviewer_id) {
        return res.status(403).json({ error: 'You can only update your own reviews' });
      }

      // Check if review is within time limit (30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      if (new Date(review.created_at) < thirtyDaysAgo) {
        return res.status(400).json({ error: 'Reviews can only be updated within 30 days of creation' });
      }

      // Update the review
      const { rows: updatedRows } = await pool.query(
        `UPDATE host_reviews SET 
          cleanliness_rating = COALESCE($1, cleanliness_rating),
          accuracy_rating = COALESCE($2, accuracy_rating),
          communication_rating = COALESCE($3, communication_rating),
          location_rating = COALESCE($4, location_rating),
          value_rating = COALESCE($5, value_rating),
          comment = COALESCE($6, comment),
          updated_at = now()
        WHERE id = $7 RETURNING *`,
        [cleanliness_rating, accuracy_rating, communication_rating, location_rating, value_rating, comment, id]
      );

      res.json(updatedRows[0]);
    } catch (err) {
      console.error('Error updating review:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Delete a review
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { reviewer_id } = req.body;

      // Get the review
      const { rows } = await pool.query(
        'SELECT * FROM host_reviews WHERE id = $1',
        [id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Review not found' });
      }

      const review = rows[0];

      // Check if user is the reviewer
      if (review.reviewer_id !== reviewer_id) {
        return res.status(403).json({ error: 'You can only delete your own reviews' });
      }

      // Check if review is within time limit (30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      if (new Date(review.created_at) < thirtyDaysAgo) {
        return res.status(400).json({ error: 'Reviews can only be deleted within 30 days of creation' });
      }

      // Delete the review
      await pool.query('DELETE FROM host_reviews WHERE id = $1', [id]);

      res.json({ message: 'Review deleted successfully' });
    } catch (err) {
      console.error('Error deleting review:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get review by ID
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { rows } = await pool.query('SELECT * FROM host_reviews WHERE id = $1', [id]);
      
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Review not found' });
      }
      
      res.json(rows[0]);
    } catch (err) {
      console.error('Error fetching review:', err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}; 