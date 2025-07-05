const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

module.exports = (pool) => {
  // Get all listings
  router.get('/', async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT * FROM listings');
      
      // Fetch images for each listing
      for (let listing of rows) {
        const imageResult = await pool.query(
          'SELECT url FROM listing_images WHERE listing_id = $1 ORDER BY order_index LIMIT 1',
          [listing.id]
        );
        listing.images = imageResult.rows;
      }
      
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
      
      const listing = rows[0];
      
      // Fetch images for the listing
      const imageResult = await pool.query(
        'SELECT url, order_index FROM listing_images WHERE listing_id = $1 ORDER BY order_index',
        [listing.id]
      );
      listing.images = imageResult.rows;
      
      res.json(listing);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create listing
  router.post('/', upload.array('photos', 10), async (req, res) => {
    try {
      const {
        user_id, title, description, address, city, state, zip, country,
        price_per_night, start_date, end_date, max_occupancy, status,
        property_type, guest_space, bedrooms, bathrooms, amenities, occupants
      } = req.body;

      // Parse JSON arrays
      const amenitiesArray = amenities ? JSON.parse(amenities) : [];
      const occupantsArray = occupants ? JSON.parse(occupants) : [];

      // Insert the listing
      const { rows } = await pool.query(
        `INSERT INTO listings (
          user_id, title, description, address, city, state, zip, country,
          price_per_night, start_date, end_date, max_occupancy, status,
          property_type, guest_space, bedrooms, bathrooms
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING *`,
        [
          user_id, title, description, address, city, state, zip, country,
          price_per_night, start_date, end_date, max_occupancy || 1, status || 'active',
          property_type || 'apartment', guest_space || 'entire_place', bedrooms || 1, bathrooms || 1
        ]
      );

      const listing = rows[0];

      // Insert amenities
      if (amenitiesArray.length > 0) {
        for (const amenity of amenitiesArray) {
          await pool.query(
            'INSERT INTO listing_amenities (listing_id, amenity) VALUES ($1, $2)',
            [listing.id, amenity]
          );
        }
      }

      // Insert occupants
      if (occupantsArray.length > 0) {
        for (const occupant of occupantsArray) {
          await pool.query(
            'INSERT INTO listing_occupants (listing_id, occupant) VALUES ($1, $2)',
            [listing.id, occupant]
          );
        }
      }

      // Handle photo uploads
      if (req.files && req.files.length > 0) {
        for (let i = 0; i < req.files.length; i++) {
          const file = req.files[i];
          // Store the file path relative to the uploads directory
          const imageUrl = `/uploads/${file.filename}`;
          
          await pool.query(
            'INSERT INTO listing_images (listing_id, url, order_index) VALUES ($1, $2, $3)',
            [listing.id, imageUrl, i]
          );
        }
      }

      res.status(201).json(listing);
    } catch (err) {
      console.error('Error creating listing:', err);
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