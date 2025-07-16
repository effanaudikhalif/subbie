const express = require('express');

module.exports = (pool) => {
  const router = express.Router();

  // Get all bookings
  router.get('/', async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT * FROM bookings ORDER BY created_at DESC');
      res.json(rows);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get bookings by user (guest or host)
  router.get('/user/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const { rows } = await pool.query(
        'SELECT * FROM bookings WHERE guest_id = $1 OR host_id = $1 ORDER BY created_at DESC',
        [userId]
      );
      res.json(rows);
    } catch (err) {
      console.error('Error fetching user bookings:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Create a new booking
  router.post('/', async (req, res) => {
    try {
      const { 
        listing_id, 
        guest_id, 
        host_id, 
        check_in_date, 
        check_out_date, 
        total_price,
        guest_count 
      } = req.body;

      // Calculate fees (1.5% each for host and guest)
      const hostSublyFeePercentage = 0.015; // 1.5% from host
      const guestSublyFeePercentage = 0.015; // 1.5% from guest
      const hostSublyFee = total_price * hostSublyFeePercentage;
      const guestSublyFee = total_price * guestSublyFeePercentage;
      const totalSublyFee = hostSublyFee + guestSublyFee; // 3% total

      // Get the listing to get price_per_night
      const { rows: listingRows } = await pool.query(
        'SELECT price_per_night FROM listings WHERE id = $1',
        [listing_id]
      );
      
      if (listingRows.length === 0) {
        return res.status(404).json({ error: 'Listing not found' });
      }
      
      const price_per_night = listingRows[0].price_per_night;

      const { rows } = await pool.query(
        `INSERT INTO bookings (
          listing_id, 
          guest_id, 
          host_id, 
          start_date, 
          end_date, 
          price_per_night,
          total_price,
          status,
          payment_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [
          listing_id, 
          guest_id, 
          host_id, 
          check_in_date, 
          check_out_date, 
          price_per_night,
          total_price,
          'pending', // Start as pending
          'pending' // Payment status
        ]
      );

      console.log('Booking created:', rows[0].id);
      res.json(rows[0]);
    } catch (err) {
      console.error('Error creating booking:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Host accepts booking
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

      // Check if booking is still pending
      if (booking.status !== 'pending') {
        return res.status(400).json({ error: 'Booking is not in pending status' });
      }

      // Update booking status to confirmed
      const { rows: updatedRows } = await pool.query(
        `UPDATE bookings SET 
          status = $1, 
          payment_status = $2
        WHERE id = $3 RETURNING *`,
        ['confirmed', 'paid', id]
      );

      console.log('Booking approved successfully');
      res.json(updatedRows[0]);
    } catch (err) {
      console.error('Error accepting booking:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Host declines booking
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

      // Update booking status
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

  // Guest cancels booking with reason
  router.put('/:id/cancel', async (req, res) => {
    try {
      const { id } = req.params;
      const { cancellation_reason, cancellation_details } = req.body;
      
      // Get booking details
      const { rows } = await pool.query(
        'SELECT * FROM bookings WHERE id = $1',
        [id]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      const booking = rows[0];

      // Only allow cancellation if booking is pending or confirmed
      if (!['pending', 'confirmed'].includes(booking.status)) {
        return res.status(400).json({ error: 'Booking cannot be cancelled in current status' });
      }

      // Update booking status with cancellation details
      const { rows: updatedRows } = await pool.query(
        `UPDATE bookings SET 
          status = $1, 
          payment_status = $2,
          cancellation_reason = $3,
          cancellation_details = $4,
          cancelled_by = $5,
          cancelled_at = CURRENT_TIMESTAMP
        WHERE id = $6 RETURNING *`,
        ['cancelled', 'released', cancellation_reason, cancellation_details, 'guest', id]
      );

      res.json(updatedRows[0]);
    } catch (err) {
      console.error('Error cancelling booking:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Host cancels booking with reason
  router.put('/:id/cancel-host', async (req, res) => {
    try {
      const { id } = req.params;
      const { cancellation_reason, cancellation_details } = req.body;
      
      // Get booking details
      const { rows } = await pool.query(
        'SELECT * FROM bookings WHERE id = $1',
        [id]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      const booking = rows[0];

      // Only allow cancellation if booking is pending or confirmed
      if (!['pending', 'confirmed'].includes(booking.status)) {
        return res.status(400).json({ error: 'Booking cannot be cancelled in current status' });
      }

      // Update booking status with cancellation details
      const { rows: updatedRows } = await pool.query(
        `UPDATE bookings SET 
          status = $1, 
          payment_status = $2,
          cancellation_reason = $3,
          cancellation_details = $4,
          cancelled_by = $5,
          cancelled_at = CURRENT_TIMESTAMP
        WHERE id = $6 RETURNING *`,
        ['cancelled', 'released', cancellation_reason, cancellation_details, 'host', id]
      );

      res.json(updatedRows[0]);
    } catch (err) {
      console.error('Error cancelling booking:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Host ends booking (only for confirmed bookings)
  router.put('/:id/end', async (req, res) => {
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

      // Only allow ending if booking is confirmed
      if (booking.status !== 'confirmed') {
        return res.status(400).json({ error: 'Only confirmed bookings can be ended' });
      }

      // Update booking status to ended
      const { rows: updatedRows } = await pool.query(
        `UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *`,
        ['ended', id]
      );

      res.json(updatedRows[0]);
    } catch (err) {
      console.error('Error ending booking:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get booking by ID
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { rows } = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
      
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      
      res.json(rows[0]);
    } catch (err) {
      console.error('Error fetching booking:', err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}; 