const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { Pool } = require('pg');
const universitiesRouter = require('./routes/universities');
const usersRouter = require('./routes/users');
const listingsRouter = require('./routes/listings');
const listingImagesRouter = require('./routes/listing_images');
const bookingsRouter = require('./routes/bookings');
const conversationsRouter = require('./routes/conversations');
const messagesRouter = require('./routes/messages');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
});

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (req.body && Object.keys(req.body).length) {
    console.log('Body:', req.body);
  }
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ... API routes will be added here ...

const universitiesRouterInstance = universitiesRouter(pool);
app.use('/api/universities', universitiesRouterInstance);

const usersRouterInstance = usersRouter(pool);
app.use('/api/users', usersRouterInstance);

const listingsRouterInstance = listingsRouter(pool);
app.use('/api/listings', listingsRouterInstance);

const listingImagesRouterInstance = listingImagesRouter(pool);
app.use('/api/listing-images', listingImagesRouterInstance);

const bookingsRouterInstance = bookingsRouter(pool);
app.use('/api/bookings', bookingsRouterInstance);

const conversationsRouterInstance = conversationsRouter(pool);
app.use('/api/conversations', conversationsRouterInstance);

const messagesRouterInstance = messagesRouter(pool);
app.use('/api/messages', messagesRouterInstance);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend API listening on port ${PORT}`);
}); 