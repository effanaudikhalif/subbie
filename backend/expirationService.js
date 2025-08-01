const cron = require('node-cron');
const EmailNotificationService = require('./emailNotifications');

class ExpirationService {
  constructor(pool) {
    this.pool = pool;
    this.emailNotifications = new EmailNotificationService();
  }

  // Function to automatically expire listings that are past their end date
  async expireListings() {
    try {
      // Get listings that are about to expire (for email notifications)
      const expiringListings = await this.pool.query(`
        SELECT l.*, u.name, u.email 
        FROM listings l 
        JOIN users u ON l.user_id = u.id
        WHERE (l.status IS NULL OR l.status IN ('active', 'approved'))
        AND l.end_date < CURRENT_TIMESTAMP
      `);
      
      // Update the listings to inactive
      const result = await this.pool.query(`
        UPDATE listings 
        SET status = 'inactive' 
        WHERE (status IS NULL OR status IN ('active', 'approved'))
        AND end_date < CURRENT_TIMESTAMP
      `);
      
      if (result.rowCount > 0) {
        console.log(`[${new Date().toISOString()}] Expired ${result.rowCount} listings`);
        
        // Send email notifications for expired listings
        for (const listing of expiringListings.rows) {
          try {
            await this.emailNotifications.sendListingExpiredNotification(
              listing.email,
              listing.name,
              listing
            );
          } catch (emailError) {
            console.error(`Failed to send expiration email for listing ${listing.id}:`, emailError);
          }
        }
      }
    } catch (err) {
      console.error('Error expiring listings:', err);
    }
  }

  // Start the scheduled job to check for expired listings every hour
  startScheduledExpiration() {
    // Run every hour at minute 0
    cron.schedule('0 * * * *', () => {
      this.expireListings();
    });
    
    console.log('Expiration service started - checking for expired listings every hour');
    
    // Also run immediately on startup
    this.expireListings();
  }

  // Manual trigger for testing
  async manualExpire() {
    await this.expireListings();
  }
}

module.exports = ExpirationService; 