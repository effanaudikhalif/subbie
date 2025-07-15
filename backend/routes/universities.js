const express = require('express');
const router = express.Router();

module.exports = (pool) => {
  // Get all universities
  router.get('/', async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT * FROM universities');
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get university by id
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { rows } = await pool.query('SELECT * FROM universities WHERE id = $1', [id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create university
  router.post('/', async (req, res) => {
    try {
      const { name, domain } = req.body;
      const { rows } = await pool.query(
        'INSERT INTO universities (name, domain) VALUES ($1, $2) RETURNING *',
        [name, domain]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Bulk import universities from CSV data
  router.post('/bulk-import', async (req, res) => {
    try {
      const { universities } = req.body;
      
      if (!Array.isArray(universities)) {
        return res.status(400).json({ error: 'Universities must be an array' });
      }

      const results = {
        added: 0,
        skipped: 0,
        errors: []
      };

      for (const university of universities) {
        try {
          const { name, domain } = university;
          
          if (!name || !domain) {
            results.errors.push(`Missing name or domain for university: ${JSON.stringify(university)}`);
            continue;
          }

          const { rows } = await pool.query(
            'INSERT INTO universities (name, domain) VALUES ($1, $2) ON CONFLICT (domain) DO NOTHING RETURNING *',
            [name, domain]
          );
          
          if (rows.length > 0) {
            results.added++;
          } else {
            results.skipped++;
          }
        } catch (error) {
          results.errors.push(`Error processing ${university.name}: ${error.message}`);
        }
      }

      res.json({
        message: 'Import completed',
        results
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update university
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, domain } = req.body;
      const { rows } = await pool.query(
        'UPDATE universities SET name = $1, domain = $2 WHERE id = $3 RETURNING *',
        [name, domain, id]
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete university
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { rowCount } = await pool.query('DELETE FROM universities WHERE id = $1', [id]);
      if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}; 