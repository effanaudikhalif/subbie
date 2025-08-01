const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + req.params.id + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept image files with specific MIME types and extensions
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp',
      'image/heic',
      'image/heif',
      'image/svg+xml',
      'image/bmp',
      'image/tiff'
    ];
    
    const allowedExtensions = [
      '.jpg', '.jpeg', '.png', '.gif', '.webp', 
      '.heic', '.heif', '.svg', '.bmp', '.tiff', '.tif'
    ];
    
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    // Check both MIME type and file extension for better compatibility
    if (file.mimetype.startsWith('image/') || 
        allowedMimeTypes.includes(file.mimetype.toLowerCase()) ||
        allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed! Supported formats: JPG, PNG, GIF, WebP, HEIC, HEIF, SVG, BMP, TIFF'), false);
    }
  }
});

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
    }
    return res.status(400).json({ error: err.message });
  } else if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
};

// Helper function to convert avatar images to web-compatible formats
const convertAvatar = async (inputPath, outputPath, originalName) => {
  try {
    console.log(`Converting avatar: ${originalName}`);
    
    // Check if file exists
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input file does not exist: ${inputPath}`);
    }
    
    // Get image metadata
    const metadata = await sharp(inputPath).metadata();
    console.log(`Avatar metadata:`, { 
      format: metadata.format, 
      width: metadata.width, 
      height: metadata.height 
    });
    
    // Convert to JPEG with avatar-specific optimization
    await sharp(inputPath)
      .resize(400, 400, { 
        fit: 'cover', 
        position: 'center'
      })
      .jpeg({ 
        quality: 90, 
        progressive: true 
      })
      .toFile(outputPath);
      
    console.log(`Successfully converted avatar ${originalName} to optimized JPEG`);
    
    // Remove original file if conversion was successful and paths are different
    if (inputPath !== outputPath && fs.existsSync(outputPath)) {
      fs.unlinkSync(inputPath);
      console.log(`Removed original avatar file: ${inputPath}`);
    }
    
    return outputPath;
    
  } catch (error) {
    console.error(`Error converting avatar ${originalName}:`, error);
    
    // If conversion fails, try to keep the original file
    if (fs.existsSync(inputPath) && inputPath !== outputPath) {
      try {
        fs.renameSync(inputPath, outputPath);
        console.log(`Avatar conversion failed, kept original file as fallback`);
        return outputPath;
      } catch (renameError) {
        console.error(`Failed to rename original avatar file:`, renameError);
      }
    }
    
    throw error;
  }
};

module.exports = (pool) => {
  // Get all users
  router.get('/', async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT * FROM users');
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Check if email exists
  router.get('/check-email/:email', async (req, res) => {
    try {
      const { email } = req.params;
      console.log('Checking if email exists:', email);
      const { rows } = await pool.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
      const exists = rows.length > 0;
      console.log('Email exists result:', exists);
      res.json({ exists });
    } catch (err) {
      console.error('Error checking email existence:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get user by id
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { rows } = await pool.query(
        `SELECT u.*, univ.name as university_name 
         FROM users u 
         LEFT JOIN universities univ ON u.university_id = univ.id 
         WHERE u.id = $1`, 
        [id]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Not found' });
      }
      console.log('User data returned:', rows[0]); // Debug log
      res.json(rows[0]);
    } catch (err) {
      console.error('Error fetching user:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Create user
  router.post('/', async (req, res) => {
    try {
      const { id, university_id, name, email, major, graduation_year, education_level, about_me, stripe_account } = req.body;
      
      // Check if user already exists by ID
      const existingUser = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      if (existingUser.rows.length > 0) {
        return res.json(existingUser.rows[0]);
      }
      
      // Check if email already exists
      const existingEmail = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
      if (existingEmail.rows.length > 0) {
        return res.status(409).json({ error: 'An account with this email address already exists' });
      }
      
      const { rows } = await pool.query(
        'INSERT INTO users (id, university_id, name, email, major, graduation_year, education_level, about_me, stripe_account) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
        [id, university_id, name, email, major, graduation_year, education_level, about_me, stripe_account]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update user
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { university_id, name, email, major, graduation_year, education_level, about_me, stripe_account } = req.body;
      
      // Build dynamic update query based on provided fields
      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;
      
      if (university_id !== undefined) {
        updateFields.push(`university_id = $${paramCount}`);
        updateValues.push(university_id);
        paramCount++;
      }
      if (name !== undefined) {
        updateFields.push(`name = $${paramCount}`);
        updateValues.push(name);
        paramCount++;
      }
      if (email !== undefined) {
        updateFields.push(`email = $${paramCount}`);
        updateValues.push(email);
        paramCount++;
      }
      if (major !== undefined) {
        updateFields.push(`major = $${paramCount}`);
        updateValues.push(major);
        paramCount++;
      }
      if (graduation_year !== undefined) {
        updateFields.push(`graduation_year = $${paramCount}`);
        updateValues.push(graduation_year);
        paramCount++;
      }
      if (education_level !== undefined) {
        updateFields.push(`education_level = $${paramCount}`);
        updateValues.push(education_level);
        paramCount++;
      }
      if (about_me !== undefined) {
        updateFields.push(`about_me = $${paramCount}`);
        updateValues.push(about_me);
        paramCount++;
      }
      if (stripe_account !== undefined) {
        updateFields.push(`stripe_account = $${paramCount}`);
        updateValues.push(stripe_account);
        paramCount++;
      }
      
      if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }
      
      // Add the WHERE clause parameter
      updateValues.push(id);
      
      const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
      console.log('Update query:', query);
      console.log('Update values:', updateValues);
      
      const { rows } = await pool.query(query, updateValues);
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(rows[0]);
    } catch (err) {
      console.error('Error updating user:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Delete user
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { rowCount } = await pool.query('DELETE FROM users WHERE id = $1', [id]);
      if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Upload avatar
  router.post('/:id/avatar', upload.single('avatar'), handleMulterError, async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Log file upload information
      console.log('Avatar upload:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        filename: req.file.filename,
        userId: id
      });

      // Validate file type (accept all image files for conversion)
      if (!req.file.mimetype.startsWith('image/')) {
        console.error('Invalid avatar file type:', {
          mimetype: req.file.mimetype,
          originalname: req.file.originalname
        });
        return res.status(400).json({ 
          error: 'Only image files are allowed for avatar uploads'
        });
      }

      // Convert the avatar image to web-compatible format
      let finalFilename;
      try {
        // Get the original file path
        const originalPath = req.file.path;
        
        // Generate a new filename with .jpg extension for converted images
        const fileExtension = path.extname(req.file.filename).toLowerCase();
        const baseName = path.basename(req.file.filename, fileExtension);
        const convertedFilename = `${baseName}.jpg`;
        const convertedPath = path.join(path.dirname(originalPath), convertedFilename);
        
        // Convert the avatar (will optimize and convert HEIC/HEIF to JPEG)
        const finalPath = await convertAvatar(originalPath, convertedPath, req.file.originalname);
        finalFilename = path.basename(finalPath);
        
        console.log('Successfully processed avatar:', finalFilename);
        
      } catch (error) {
        console.error('Error processing avatar:', req.file.originalname, error);
        
        // Fallback: use original file if conversion fails
        finalFilename = req.file.filename;
        console.log('Using original avatar as fallback:', finalFilename);
      }

      // Create the avatar URL (this will be served from /uploads/ endpoint)
      const avatarUrl = `${process.env.API_BASE_URL || 'http://localhost:4000'}/uploads/${finalFilename}`;
      
      // Update the user's avatar_url in the database
      const { rows } = await pool.query(
        'UPDATE users SET avatar_url = $1 WHERE id = $2 RETURNING *',
        [avatarUrl, id]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      console.log('Avatar uploaded successfully for user:', id, 'URL:', avatarUrl);
      
      res.json({ 
        message: 'Avatar uploaded successfully',
        avatar_url: avatarUrl,
        user: rows[0]
      });
    } catch (err) {
      console.error('Avatar upload error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}; 