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
  // Get all listings (optionally filter by user_id or exclude user_id)
  router.get('/', async (req, res) => {
    try {
      const { user_id, exclude_user_id } = req.query;
      let rows;
      
      if (user_id) {
        const result = await pool.query(`
          SELECT l.*, u.name, u.avatar_url, univ.name as university_name
          FROM listings l 
          LEFT JOIN users u ON l.user_id = u.id 
          LEFT JOIN universities univ ON u.university_id = univ.id
          WHERE l.user_id = $1
        `, [user_id]);
        rows = result.rows;
      } else if (exclude_user_id) {
        const { city } = req.query;
        let query = `
          SELECT l.*, u.name, u.avatar_url, univ.name as university_name
          FROM listings l 
          LEFT JOIN users u ON l.user_id = u.id
          LEFT JOIN universities univ ON u.university_id = univ.id
          WHERE (l.status IS NULL OR l.status IN ('active', 'approved'))
          AND l.user_id != $1
        `;
        let params = [exclude_user_id];
        
        if (city) {
          query += ` AND LOWER(l.city) = LOWER($2)`;
          params.push(city);
        }
        
        query += ` ORDER BY l.created_at DESC LIMIT 3`;
        
        const result = await pool.query(query, params);
        rows = result.rows;
      } else {
        const result = await pool.query(`
          SELECT l.*, u.name, u.avatar_url, univ.name as university_name
          FROM listings l 
          LEFT JOIN users u ON l.user_id = u.id
          LEFT JOIN universities univ ON u.university_id = univ.id
          WHERE l.status IS NULL OR l.status IN ('active', 'approved')
        `);
        rows = result.rows;
      }
      // Fetch images for each listing
      for (let listing of rows) {
        const imageResult = await pool.query(
          'SELECT url FROM listing_images WHERE listing_id = $1 ORDER BY order_index',
          [listing.id]
        );
        listing.images = imageResult.rows;
      }
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get average ratings for listings
  router.get('/average-ratings', async (req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT 
          l.id as listing_id,
          AVG((hr.cleanliness_rating + hr.accuracy_rating + hr.communication_rating + hr.location_rating + hr.value_rating) / 5.0) as average_rating,
          COUNT(hr.id) as total_reviews
        FROM listings l
        LEFT JOIN host_reviews hr ON l.id = hr.listing_id
        GROUP BY l.id
      `);
      
      const ratingsMap = {};
      rows.forEach(row => {
        ratingsMap[row.listing_id] = {
          average_rating: row.average_rating ? parseFloat(row.average_rating) : 0,
          total_reviews: parseInt(row.total_reviews)
        };
      });
      
      res.json(ratingsMap);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get listing by id
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { rows } = await pool.query(`
        SELECT l.*, u.name, u.avatar_url, univ.name as university_name
        FROM listings l 
        LEFT JOIN users u ON l.user_id = u.id 
        LEFT JOIN universities univ ON u.university_id = univ.id
        WHERE l.id = $1
      `, [id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      
      const listing = rows[0];
      
      // Fetch images for the listing
      const imageResult = await pool.query(
        'SELECT url, order_index FROM listing_images WHERE listing_id = $1 ORDER BY order_index',
        [listing.id]
      );
      listing.images = imageResult.rows;

      // Fetch amenities for the listing
      const amenitiesResult = await pool.query(
        `SELECT a.code, a.name, a.category, a.is_premium
         FROM listing_amenities la
         JOIN amenities a ON la.amenity = a.code
         WHERE la.listing_id = $1
         ORDER BY a.category, a.name`,
        [listing.id]
      );
      listing.amenities = amenitiesResult.rows;

      // Fetch occupants for the listing
      const occupantsResult = await pool.query(
        'SELECT occupant FROM listing_occupants WHERE listing_id = $1',
        [listing.id]
      );
      listing.occupants = occupantsResult.rows.map(r => r.occupant);

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
        neighborhood, latitude, longitude, price_per_night, start_date, end_date, max_occupancy, status,
        property_type, guest_space, bedrooms, bathrooms, amenities, occupants
      } = req.body;

      // Parse JSON arrays
      const amenitiesArray = amenities ? JSON.parse(amenities) : [];
      const occupantsArray = occupants ? JSON.parse(occupants) : [];

      // Insert the listing
      const { rows } = await pool.query(
        `INSERT INTO listings (
          user_id, title, description, address, city, state, zip, country,
          neighborhood, latitude, longitude, price_per_night, start_date, end_date, max_occupancy, status,
          property_type, guest_space, bedrooms, bathrooms
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20) RETURNING *`,
        [
          user_id, title, description, address, city, state, zip, country,
          neighborhood || null, latitude || null, longitude || null, price_per_night, start_date, end_date, max_occupancy || 1, status || 'active',
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
  router.put('/:id', upload.array('photo_replacements', 10), async (req, res) => {
    try {
      const { id } = req.params;
      const { 
        title, description, address, unit, city, state, zip, country, neighborhood,
        latitude, longitude, price_per_night, start_date, end_date, max_occupancy, 
        property_type, guest_space, bedrooms, bathrooms, amenities, occupants,
        photo_indices
      } = req.body;

      // Update the listing
      const { rows } = await pool.query(
        `UPDATE listings SET 
          title = $1, description = $2, address = $3, unit = $4, city = $5, state = $6, 
          zip = $7, country = $8, neighborhood = $9, latitude = $10, longitude = $11,
          price_per_night = $12, start_date = $13, end_date = $14, max_occupancy = $15,
          property_type = $16, guest_space = $17, bedrooms = $18, bathrooms = $19
        WHERE id = $20 RETURNING *`,
        [
          title, description, address, unit, city, state, zip, country, neighborhood,
          latitude, longitude, price_per_night, start_date, end_date, max_occupancy,
          property_type, guest_space, bedrooms, bathrooms, id
        ]
      );
      
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });

      // Update amenities
      if (amenities) {
        // Parse amenities if it's a JSON string
        let amenitiesArray = amenities;
        if (typeof amenities === 'string') {
          try {
            amenitiesArray = JSON.parse(amenities);
          } catch (e) {
            console.error('Error parsing amenities:', e);
            amenitiesArray = [];
          }
        }
        
        // Delete existing amenities
        await pool.query('DELETE FROM listing_amenities WHERE listing_id = $1', [id]);
        
        // Insert new amenities
        for (const amenity of amenitiesArray) {
          await pool.query(
            'INSERT INTO listing_amenities (listing_id, amenity) VALUES ($1, $2)',
            [id, amenity]
          );
        }
      }

      // Update occupants
      if (occupants) {
        // Parse occupants if it's a JSON string
        let occupantsArray = occupants;
        if (typeof occupants === 'string') {
          try {
            occupantsArray = JSON.parse(occupants);
          } catch (e) {
            console.error('Error parsing occupants:', e);
            occupantsArray = [];
          }
        }
        
        // Delete existing occupants
        await pool.query('DELETE FROM listing_occupants WHERE listing_id = $1', [id]);
        
        // Insert new occupants
        for (const occupant of occupantsArray) {
          await pool.query(
            'INSERT INTO listing_occupants (listing_id, occupant) VALUES ($1, $2)',
            [id, occupant]
          );
        }
      }

      // Handle photo replacements
      if (req.files && req.files.length > 0 && photo_indices) {
        const photoIndices = Array.isArray(photo_indices) ? photo_indices : [photo_indices];
        
        for (let i = 0; i < req.files.length; i++) {
          const file = req.files[i];
          const photoIndex = parseInt(photoIndices[i]);
          
          // Get the current image to replace
          const currentImageResult = await pool.query(
            'SELECT url FROM listing_images WHERE listing_id = $1 AND order_index = $2',
            [id, photoIndex]
          );
          
          if (currentImageResult.rows.length > 0) {
            const currentImage = currentImageResult.rows[0];
            
            // Delete the old file if it exists
            if (currentImage.url && currentImage.url.startsWith('/uploads/')) {
              const oldFilePath = path.join(__dirname, '..', currentImage.url);
              if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
              }
            }
            
            // Store the new file
            const imageUrl = `/uploads/${file.filename}`;
            
            // Update the database record
            await pool.query(
              'UPDATE listing_images SET url = $1 WHERE listing_id = $2 AND order_index = $3',
              [imageUrl, id, photoIndex]
            );
          }
        }
      }

      res.json(rows[0]);
    } catch (err) {
      console.error('Error updating listing:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Update listing status
  router.put('/:id/status', async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const { rows } = await pool.query(
        'UPDATE listings SET status = $1 WHERE id = $2 RETURNING *',
        [status, id]
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

  // Get available dates for a listing
  router.get('/:id/available-dates', async (req, res) => {
    try {
      const { id } = req.params;
      const { rows } = await pool.query('SELECT start_date, end_date FROM listings WHERE id = $1', [id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      const { start_date, end_date } = rows[0];
      if (!start_date || !end_date) return res.json([]);
      const availableDates = [];
      let current = new Date(start_date);
      const end = new Date(end_date);
      while (current <= end) {
        availableDates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }
      res.json(availableDates);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}; 