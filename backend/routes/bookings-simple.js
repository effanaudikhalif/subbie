const express = require('express');
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // DISABLED FOR TESTING
const router = express.Router();

module.exports = (pool) => {
  // Get all bookings
  router.get('/', async (req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT b.*, l.title as listing_title, l.city, l.state, 
               g.name as guest_name, h.name as host_name
        FROM bookings b
        LEFT JOIN listings l ON b.listing_id = l.id
        LEFT JOIN users g ON b.guest_id = g.id
        LEFT JOIN users h ON b.host_id = h.id
        ORDER BY b.created_at DESC
      `);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get booking by id
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { rows } = await pool.query(`
        SELECT b.*, l.title as listing_title, l.city, l.state, 
               g.name as guest_name, h.name as host_name
        FROM bookings b
        LEFT JOIN listings l ON b.listing_id = l.id
        LEFT JOIN users g ON b.guest_id = g.id
        LEFT JOIN users h ON b.host_id = h.id
        WHERE b.id = $1
      `, [id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create booking (SIMPLIFIED - NO STRIPE FOR TESTING)
  router.post('/', async (req, res) => {
    try {
      const { 
        listing_id, 
        guest_id, 
        host_id, 
        start_date, 
        end_date, 
        price_per_night, 
        total_price
      } = req.body;

      // Validate booking date (max 7 days in advance)
      const startDate = new Date(start_date);
      const today = new Date();
      const maxDate = new Date();
      maxDate.setDate(today.getDate() + 7);
      
      if (startDate > maxDate) {
        return res.status(400).json({ 
          error: 'Bookings can only be made up to 7 days in advance',
          details: 'This ensures timely host payouts before guest arrival'
        });
      }

      // Calculate expiration time (24 hours from now)
      const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Create booking in database (no Stripe integration)
      const { rows } = await pool.query(
        `INSERT INTO bookings (
          listing_id, guest_id, host_id, start_date, end_date, 
          price_per_night, total_price, status, payment_status, 
          expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [
          listing_id, guest_id, host_id, start_date, end_date, 
          price_per_night, total_price, 'pending', 'pending',
          expires_at
        ]
      );

      console.log('Booking created successfully (no payment processing)');
      res.status(201).json(rows[0]);
    } catch (err) {
      console.error('Error creating booking:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Host accepts booking (SIMPLIFIED - NO STRIPE FOR TESTING)
  router.put('/:id/accept', async (req, res) => {
    try {
      const { id } = req.params;
      console.log('Accepting booking:', id);
      
      // Get booking details
      const { rows } = await pool.query(
        'SELECT * FROM bookings WHERE id = $1',
        [id]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      const booking = rows[0];
      console.log('Booking found:', booking.status, booking.payment_status);

      // Check if booking has expired
      if (new Date() > new Date(booking.expires_at)) {
        return res.status(400).json({ error: 'Booking request has expired' });
      }

      // Check if booking is still pending
      if (booking.status !== 'pending') {
        return res.status(400).json({ 
          error: 'Booking is not in pending status',
          details: `Current status: ${booking.status}`
        });
      }

      // Update booking status to confirmed (no payment processing)
      const { rows: updatedRows } = await pool.query(
        `UPDATE bookings SET 
          status = $1, 
          payment_status = $2
        WHERE id = $3 RETURNING *`,
        ['confirmed', 'paid', id]
      );

      console.log('Booking accepted successfully (no payment processing)');
      res.json(updatedRows[0]);
    } catch (err) {
      console.error('Error accepting booking:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Host declines booking (SIMPLIFIED - NO STRIPE FOR TESTING)
  router.put('/:id/decline', async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get booking details
      const { rows } = await pool.query(
        'SELECT * FROM bookings WHERE id = $1',
        [id]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      const booking = rows[0];

      // Check if booking is still pending
      if (booking.status !== 'pending') {
        return res.status(400).json({ error: 'Booking is not in pending status' });
      }

      // Update booking status (no Stripe cancellation needed)
      const { rows: updatedRows } = await pool.query(
        `UPDATE bookings SET status = $1, payment_status = $2 WHERE id = $3 RETURNING *`,
        ['cancelled', 'released', id]
      );

      res.json(updatedRows[0]);
    } catch (err) {
      console.error('Error declining booking:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Guest cancels booking (SIMPLIFIED - NO STRIPE FOR TESTING)
  router.put('/:id/cancel', async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get booking details
      const { rows } = await pool.query(
        'SELECT * FROM bookings WHERE id = $1',
        [id]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      const booking = rows[0];

      // Check if booking is still pending
      if (booking.status !== 'pending') {
        return res.status(400).json({ error: 'Booking is not in pending status' });
      }

      // Update booking status (no Stripe cancellation needed)
      const { rows: updatedRows } = await pool.query(
        `UPDATE bookings SET status = $1, payment_status = $2 WHERE id = $3 RETURNING *`,
        ['cancelled', 'released', id]
      );

      res.json(updatedRows[0]);
    } catch (err) {
      console.error('Error cancelling booking:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Update booking (general update)
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

  // Get bookings for a specific user
  router.get('/user/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const { rows } = await pool.query(`
        SELECT b.*, l.title as listing_title, l.city, l.state, 
               g.name as guest_name, h.name as host_name
        FROM bookings b
        LEFT JOIN listings l ON b.listing_id = l.id
        LEFT JOIN users g ON b.guest_id = g.id
        LEFT JOIN users h ON b.host_id = h.id
        WHERE b.guest_id = $1 OR b.host_id = $1
        ORDER BY b.created_at DESC
      `, [userId]);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}; 