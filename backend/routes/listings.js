const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const EmailNotifications = require('../emailNotifications');
const router = express.Router();

// Configure multer for file uploads, saves files to the disk and not memory
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

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept all image files - we'll convert unsupported formats automatically
    console.log('File upload attempt:', {
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });

    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      console.log('File rejected - not an image:', {
        filename: file.originalname,
        mimetype: file.mimetype
      });
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
    return res.status(400).json({ error: err.message });
  } else if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
};

// Helper function to convert images to web-compatible formats
const convertImage = async (inputPath, outputPath, originalName) => {
  try {
    console.log(`Converting image: ${originalName}`);
    
    // Define web-compatible formats that don't need conversion
    const webCompatibleFormats = ['jpeg', 'jpg', 'png', 'gif', 'webp'];
    
    // Check if file exists
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input file does not exist: ${inputPath}`);
    }
    
    // Get image metadata
    const metadata = await sharp(inputPath).metadata();
    console.log(`Image metadata:`, { 
      format: metadata.format, 
      width: metadata.width, 
      height: metadata.height,
      orientation: metadata.orientation,
      exif: metadata.exif ? 'present' : 'none'
    });
    
    // If it's already a web-compatible format and reasonably sized, just rename it
    if (webCompatibleFormats.includes(metadata.format) && 
        metadata.width <= 2048 && metadata.height <= 2048) {
      console.log(`Image is already web-compatible, keeping original format`);
      
      // If input and output paths are different, move/rename the file
      if (inputPath !== outputPath) {
        fs.renameSync(inputPath, outputPath);
      }
      return outputPath;
    }
    
    // Convert to JPEG with optimization, preserving orientation
    await sharp(inputPath)
      .rotate() // Automatically rotate based on EXIF orientation data (fixes HEIC portrait/landscape issues)
      .resize(2048, 2048, { 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .jpeg({ 
        quality: 85, 
        progressive: true 
      })
      .toFile(outputPath);
      
    console.log(`Successfully converted ${originalName} to optimized JPEG`);
    
    // Remove original file if conversion was successful and paths are different
    if (inputPath !== outputPath && fs.existsSync(outputPath)) {
      fs.unlinkSync(inputPath);
      console.log(`Removed original file: ${inputPath}`);
    }
    
    return outputPath;
    
  } catch (error) {
    console.error(`Error converting image ${originalName}:`, error);
    
    // If conversion fails, try to keep the original file
    if (fs.existsSync(inputPath) && inputPath !== outputPath) {
      try {
        fs.renameSync(inputPath, outputPath);
        console.log(`Conversion failed, kept original file as fallback`);
        return outputPath;
      } catch (renameError) {
        console.error(`Failed to rename original file:`, renameError);
      }
    }
    
    throw error;
  }
};

module.exports = (pool) => {
  const emailNotifications = new EmailNotifications();

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
          AND l.end_date >= CURRENT_TIMESTAMP
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
          WHERE (l.status IS NULL OR l.status IN ('active', 'approved'))
          AND l.end_date >= CURRENT_TIMESTAMP
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
        WHERE (l.status IS NULL OR l.status IN ('active', 'approved'))
        AND l.end_date >= CURRENT_TIMESTAMP
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
  router.post('/', async (req, res) => {
    try {
      const {
        user_id, title, description, address, unit, city, state, zip, country,
        neighborhood, latitude, longitude, price_per_night, start_date, end_date, max_occupancy, status,
        property_type, guest_space, bedrooms, bathrooms, amenities, occupants, image_urls
      } = req.body;

      console.log('Creating listing with data:', req.body);

      // Validate required fields
      if (!user_id || !title || !description || !address || !city || !state || !zip || !price_per_night || !start_date || !end_date) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Arrays are already parsed (from JSON request)
      const amenitiesArray = amenities || [];
      const occupantsArray = occupants || [];

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

      console.log('Created listing:', listing.id);

      // Insert amenities
      if (amenitiesArray.length > 0) {
        for (const amenity of amenitiesArray) {
          await pool.query(
            'INSERT INTO listing_amenities (listing_id, amenity) VALUES ($1, $2)',
            [listing.id, amenity]
          );
        }
        console.log('Inserted amenities:', amenitiesArray);
      }

      // Insert occupants
      if (occupantsArray.length > 0) {
        for (const occupant of occupantsArray) {
          await pool.query(
            'INSERT INTO listing_occupants (listing_id, occupant) VALUES ($1, $2)',
            [listing.id, occupant]
          );
        }
        console.log('Inserted occupants:', occupantsArray);
      }

      // Handle image URLs from Supabase Storage
      if (image_urls && image_urls.length > 0) {
        for (let i = 0; i < image_urls.length; i++) {
          const imageUrl = image_urls[i];
          
          await pool.query(
            'INSERT INTO listing_images (listing_id, url, order_index) VALUES ($1, $2, $3)',
            [listing.id, imageUrl, i]
          );
        }
        console.log('Inserted image URLs:', image_urls);
      }

      // Send email notification for listing added
      try {
        // Get host information
        const hostResult = await pool.query('SELECT name, email FROM users WHERE id = $1', [user_id]);
        if (hostResult.rows.length > 0) {
          const host = hostResult.rows[0];
          await emailNotifications.sendListingAddedNotification(
            host.email,
            host.name,
            listing
          );
        }
      } catch (emailError) {
        console.error('Failed to send listing added email notification:', emailError);
        // Don't fail the request if email fails
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
      const { 
        title, description, address, unit, city, state, zip, country, neighborhood,
        latitude, longitude, price_per_night, start_date, end_date, max_occupancy, 
        property_type, guest_space, bedrooms, bathrooms, amenities, occupants,
        image_urls
      } = req.body;

      console.log('Updating listing with data:', req.body);

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
      if (amenities && amenities.length > 0) {
        // Delete existing amenities
        await pool.query('DELETE FROM listing_amenities WHERE listing_id = $1', [id]);
        
        // Insert new amenities
        for (const amenity of amenities) {
          await pool.query(
            'INSERT INTO listing_amenities (listing_id, amenity) VALUES ($1, $2)',
            [id, amenity]
          );
        }
        console.log('Updated amenities:', amenities);
      }

      // Update occupants
      if (occupants && occupants.length > 0) {
        // Delete existing occupants
        await pool.query('DELETE FROM listing_occupants WHERE listing_id = $1', [id]);
        
        // Insert new occupants
        for (const occupant of occupants) {
          await pool.query(
            'INSERT INTO listing_occupants (listing_id, occupant) VALUES ($1, $2)',
            [id, occupant]
          );
        }
        console.log('Updated occupants:', occupants);
      }

      // Handle image URLs from Supabase Storage
      if (image_urls && image_urls.length > 0) {
        // Delete existing images for this listing
        await pool.query('DELETE FROM listing_images WHERE listing_id = $1', [id]);
        
        // Insert new image URLs with proper order
        for (let i = 0; i < image_urls.length; i++) {
          const imageUrl = image_urls[i];
          
          await pool.query(
            'INSERT INTO listing_images (listing_id, url, order_index) VALUES ($1, $2, $3)',
            [id, imageUrl, i]
          );
        }
        console.log('Updated image URLs:', image_urls);
      }

      // Send email notification for listing edited
      try {
        // Get host information
        const hostResult = await pool.query('SELECT u.name, u.email FROM users u JOIN listings l ON u.id = l.user_id WHERE l.id = $1', [id]);
        if (hostResult.rows.length > 0) {
          const host = hostResult.rows[0];
          await emailNotifications.sendListingEditedNotification(
            host.email,
            host.name,
            rows[0]
          );
        }
      } catch (emailError) {
        console.error('Failed to send listing edited email notification:', emailError);
        // Don't fail the request if email fails
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
      
      // Get listing and host information before deletion
      const listingResult = await pool.query('SELECT l.*, u.name, u.email FROM listings l JOIN users u ON l.user_id = u.id WHERE l.id = $1', [id]);
      if (listingResult.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      
      const listing = listingResult.rows[0];
      const host = { name: listing.name, email: listing.email };
      
      // Delete the listing
      const { rowCount } = await pool.query('DELETE FROM listings WHERE id = $1', [id]);
      if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
      
      // Send email notification for listing deleted
      try {
        await emailNotifications.sendListingDeletedNotification(
          host.email,
          host.name,
          listing
        );
      } catch (emailError) {
        console.error('Failed to send listing deleted email notification:', emailError);
        // Don't fail the request if email fails
      }
      
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