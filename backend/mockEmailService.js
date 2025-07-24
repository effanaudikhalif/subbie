class MockEmailService {
  constructor() {
    this.notifications = [];
  }

  async sendNotification(type, data) {
    const notification = {
      type,
      data,
      timestamp: new Date().toISOString(),
      id: Math.random().toString(36).substr(2, 9)
    };
    
    this.notifications.push(notification);
    
    console.log(`📧 [MOCK EMAIL] ${type.toUpperCase()} notification sent:`, {
      to: data.recipient_email,
      subject: this.getSubject(type, data),
      timestamp: notification.timestamp
    });
    
    return true;
  }

  getSubject(type, data) {
    switch (type) {
      case 'listing_added':
        return `Your listing '${data.listing_title}' has been added to Subly`;
      case 'listing_edited':
        return `Your listing '${data.listing_title}' has been updated on Subly`;
      case 'listing_deleted':
        return `Your listing '${data.listing_title}' has been removed from Subly`;
      case 'listing_expired':
        return `Your listing '${data.listing_title}' has expired on Subly`;
      default:
        return 'Subly Notification';
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

    return this.sendNotification('listing_added', data);
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

    return this.sendNotification('listing_edited', data);
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

    return this.sendNotification('listing_deleted', data);
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

    return this.sendNotification('listing_expired', data);
  }

  getNotifications() {
    return this.notifications;
  }

  clearNotifications() {
    this.notifications = [];
  }
}

module.exports = MockEmailService; 