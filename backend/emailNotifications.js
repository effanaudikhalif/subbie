// Using built-in fetch (available in Node.js 18+)

class EmailNotificationService {
  constructor() {
    this.emailServiceUrl = process.env.EMAIL_SERVICE_URL || 'http://localhost:8001';
    this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  }

  async sendNotification(endpoint, data) {
    try {
      const response = await fetch(`${this.emailServiceUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Email notification failed (${endpoint}):`, errorText);
        return false;
      }

      const result = await response.json();
      console.log(`Email notification sent successfully (${endpoint}):`, result.message);
      return true;
    } catch (error) {
      console.error(`Email notification error (${endpoint}):`, error.message);
      return false;
    }
  }

  async sendListingAddedNotification(hostEmail, hostName, listingData) {
    try {
      const emailData = {
        recipient_email: hostEmail,
        template: 'listing_added',
        data: {
          host_name: hostName,
          listing_title: listingData.title,
          listing_id: listingData.id,
          listing_url: `${this.frontendUrl}/listings/${listingData.id}`
        }
      };

      return this.sendNotification('/send-listing-added-notification', emailData);
    } catch (error) {
      console.error('Error sending listing added notification:', error);
      throw error;
    }
  }

  async sendListingEditedNotification(hostEmail, hostName, listingData) {
    try {
      const emailData = {
        recipient_email: hostEmail,
        template: 'listing_edited',
        data: {
          host_name: hostName,
          listing_title: listingData.title,
          listing_id: listingData.id,
          listing_url: `${this.frontendUrl}/listings/${listingData.id}`
        }
      };

      return this.sendNotification('/send-listing-edited-notification', emailData);
    } catch (error) {
      console.error('Error sending listing edited notification:', error);
      throw error;
    }
  }

  async sendListingDeletedNotification(hostEmail, hostName, listingData) {
    try {
      const emailData = {
        recipient_email: hostEmail,
        template: 'listing_deleted',
        data: {
          host_name: hostName,
          listing_title: listingData.title,
          dashboard_url: `${this.frontendUrl}/my-listings`
        }
      };

      return this.sendNotification('/send-listing-deleted-notification', emailData);
    } catch (error) {
      console.error('Error sending listing deleted notification:', error);
      throw error;
    }
  }

  async sendListingExpiredNotification(hostEmail, hostName, listingData) {
    try {
      const emailData = {
        recipient_email: hostEmail,
        template: 'listing_expired',
        data: {
          host_name: hostName,
          listing_title: listingData.title,
          dashboard_url: `${this.frontendUrl}/my-listings`
        }
      };

      return this.sendNotification('/send-listing-expired-notification', emailData);
    } catch (error) {
      console.error('Error sending listing expired notification:', error);
      throw error;
    }
  }
}

module.exports = EmailNotificationService; 