function commuteTimesRouter() {
  const express = require('express');
  const router = express.Router();
  // Using built-in fetch (available in Node.js 18+)
  const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

  router.post('/', async (req, res) => {
    const { origin, destination } = req.body;
    if (!origin || !destination) {
      return res.status(400).json({ error: 'Missing origin or destination' });
    }
    if (!GOOGLE_MAPS_API_KEY) {
      return res.status(500).json({ error: 'Google Maps API key not configured' });
    }

    const modes = [
      { mode: 'driving', key: 'car' },
      { mode: 'transit', key: 'transit' },
      { mode: 'bicycling', key: 'bike' },
      { mode: 'walking', key: 'walk' },
    ];

    const results = { car: null, transit: null, bike: null, walk: null };

    await Promise.all(
      modes.map(async ({ mode, key }) => {
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&mode=${mode}&key=${GOOGLE_MAPS_API_KEY}`;
        try {
          const response = await fetch(url);
          const data = await response.json();
          if (data.status === 'OK' && data.routes.length > 0) {
            const leg = data.routes[0].legs[0];
            results[key] = leg.duration.text;
          } else {
            results[key] = null;
          }
        } catch (e) {
          results[key] = null;
        }
      })
    );

    res.json(results);
  });

  return router;
}

module.exports = commuteTimesRouter; 