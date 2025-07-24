const fetch = require('node-fetch');

class EmailNotifications {
  constructor() {
    this.emailServiceUrl = process.env.EMAIL_SERVICE_URL || 'http://localhost:8001';
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

  async sendListingAddedNotification(recipientEmail, hostName, listingData) {
    const data = {
      recipient_email: recipientEmail,
      host_name: hostName,
      listing_title: listingData.title,
      listing_address: `${listingData.address}, ${listingData.city}, ${listingData.state} ${listingData.zip}`,
      listing_price: listingData.price_per_night,
      start_date: new Date(listingData.start_date).toLocaleDateString(),
      end_date: new Date(listingData.end_date).toLocaleDateString(),
      listing_url: `http://localhost:3000/listings/${listingData.id}`
    };

    return this.sendNotification('/send-listing-added-notification', data);
  }

  async sendListingEditedNotification(recipientEmail, hostName, listingData) {
    const data = {
      recipient_email: recipientEmail,
      host_name: hostName,
      listing_title: listingData.title,
      listing_address: `${listingData.address}, ${listingData.city}, ${listingData.state} ${listingData.zip}`,
      listing_price: listingData.price_per_night,
      start_date: new Date(listingData.start_date).toLocaleDateString(),
      end_date: new Date(listingData.end_date).toLocaleDateString(),
      listing_url: `http://localhost:3000/listings/${listingData.id}`
    };

    return this.sendNotification('/send-listing-edited-notification', data);
  }

  async sendListingDeletedNotification(recipientEmail, hostName, listingData) {
    const data = {
      recipient_email: recipientEmail,
      host_name: hostName,
      listing_title: listingData.title,
      listing_address: `${listingData.address}, ${listingData.city}, ${listingData.state} ${listingData.zip}`,
      listing_price: listingData.price_per_night,
      removal_date: new Date().toLocaleDateString(),
      dashboard_url: 'http://localhost:3000/my-listings'
    };

    return this.sendNotification('/send-listing-deleted-notification', data);
  }

  async sendListingExpiredNotification(recipientEmail, hostName, listingData) {
    const data = {
      recipient_email: recipientEmail,
      host_name: hostName,
      listing_title: listingData.title,
      listing_address: `${listingData.address}, ${listingData.city}, ${listingData.state} ${listingData.zip}`,
      listing_price: listingData.price_per_night,
      end_date: new Date(listingData.end_date).toLocaleDateString(),
      expiration_date: new Date().toLocaleDateString(),
      dashboard_url: 'http://localhost:3000/my-listings'
    };

    return this.sendNotification('/send-listing-expired-notification', data);
  }
}

module.exports = EmailNotifications; 