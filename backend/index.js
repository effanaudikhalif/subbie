require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
const universitiesRouter = require('./routes/universities');
const usersRouter = require('./routes/users');
const listingsRouter = require('./routes/listings');
const listingImagesRouter = require('./routes/listing_images');
const bookingsRouter = require('./routes/bookings');
const conversationsRouter = require('./routes/conversations');
const messagesRouter = require('./routes/messages');
const wishlistRouter = require('./routes/wishlist');
const hostReviewsRouter = require('./routes/host-reviews');
const renterReviewsRouter = require('./routes/renter-reviews');
const commuteTimesRouter = require('./routes/commute-times');
const openaiRouter = require('./routes/openai');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from uploads directory with CORS headers
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
}, express.static(path.join(__dirname, 'uploads')));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
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

const wishlistRouterInstance = wishlistRouter(pool);
app.use('/api/wishlist', wishlistRouterInstance);

const hostReviewsRouterInstance = hostReviewsRouter(pool);
app.use('/api/host-reviews', hostReviewsRouterInstance);

const renterReviewsRouterInstance = renterReviewsRouter(pool);
app.use('/api/renter-reviews', renterReviewsRouterInstance);

const commuteTimesRouterInstance = commuteTimesRouter();
app.use('/api/commute-times', commuteTimesRouterInstance);

app.use('/api/openai', openaiRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend API listening on port ${PORT}`);
}); 