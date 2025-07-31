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
const ExpirationService = require('./expirationService');

const app = express();

// Configure CORS to allow your Vercel domain
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://subby-six.vercel.app',
    'https://subby-six.vercel.app/',
    'https://subby-effan-audi-khalifs-projects.vercel.app',
    'https://subby-effan-audi-khalifs-projects.vercel.app/',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
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
  ssl: { rejectUnauthorized: false }
});

// Initialize and start the expiration service
const expirationService = new ExpirationService(pool);

// Test database connection on startup
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err.message);
    console.log('Make sure your DATABASE_URL is correct and the database is accessible');
  } else {
    console.log('Database connected successfully');
    expirationService.startScheduledExpiration();
  }
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

// Manual trigger for testing expiration (remove in production)
app.post('/api/expire-listings', async (req, res) => {
  try {
    await expirationService.manualExpire();
    res.json({ message: 'Expiration check completed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// View mock email notifications (for testing)
app.get('/api/mock-email-notifications', (req, res) => {
  try {
    const notifications = expirationService.emailNotifications.getNotifications();
    res.json({ notifications });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clear mock email notifications (for testing)
app.delete('/api/mock-email-notifications', (req, res) => {
  try {
    expirationService.emailNotifications.clearNotifications();
    res.json({ message: 'Notifications cleared' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test email notification (for testing)
app.post('/api/test-email-notification', async (req, res) => {
  try {
    const { type, recipientEmail, hostName, listingData } = req.body;
    
    let success = false;
    switch (type) {
      case 'listing_added':
        success = await expirationService.emailNotifications.sendListingAddedNotification(
          recipientEmail, hostName, listingData
        );
        break;
      case 'listing_edited':
        success = await expirationService.emailNotifications.sendListingEditedNotification(
          recipientEmail, hostName, listingData
        );
        break;
      case 'listing_deleted':
        success = await expirationService.emailNotifications.sendListingDeletedNotification(
          recipientEmail, hostName, listingData
        );
        break;
      case 'listing_expired':
        success = await expirationService.emailNotifications.sendListingExpiredNotification(
          recipientEmail, hostName, listingData
        );
        break;
      default:
        return res.status(400).json({ error: 'Invalid notification type' });
    }
    
    res.json({ success, message: `Test ${type} notification sent` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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

const commuteTimesRouterInstance = commuteTimesRouter(pool);
app.use('/api/commute-times', commuteTimesRouterInstance);

app.use('/api/openai', openaiRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend API listening on port ${PORT}`);
}); 