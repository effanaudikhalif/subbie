const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

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
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

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
      
      // Check if user already exists
      const existingUser = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      if (existingUser.rows.length > 0) {
        return res.json(existingUser.rows[0]);
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
      const { rows } = await pool.query(
        'UPDATE users SET university_id = $1, name = $2, email = $3, major = $4, graduation_year = $5, education_level = $6, about_me = $7, stripe_account = $8 WHERE id = $9 RETURNING *',
        [university_id, name, email, major, graduation_year, education_level, about_me, stripe_account, id]
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(rows[0]);
    } catch (err) {
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
  router.post('/:id/avatar', upload.single('avatar'), async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Create the avatar URL (this will be served from /uploads/ endpoint)
      const avatarUrl = `http://localhost:4000/uploads/${req.file.filename}`;
      
      // Update the user's avatar_url in the database
      const { rows } = await pool.query(
        'UPDATE users SET avatar_url = $1 WHERE id = $2 RETURNING *',
        [avatarUrl, id]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
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