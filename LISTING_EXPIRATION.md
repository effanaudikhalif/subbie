# Listing Expiration System

## Overview

The listing expiration system automatically marks listings as inactive when they go beyond their specified end date. This ensures that expired listings are not visible to users browsing available accommodations.

## How It Works

### Automatic Expiration
- **Scheduled Job**: A cron job runs every hour to check for expired listings
- **Database Update**: Listings with `end_date < CURRENT_TIMESTAMP` are automatically set to `status = 'inactive'`
- **Real-time Filtering**: All listing queries filter out expired listings from public results

### Expiration Service
- **Location**: `backend/expirationService.js`
- **Schedule**: Runs every hour at minute 0 (e.g., 1:00, 2:00, 3:00, etc.)
- **Manual Trigger**: Available at `POST /api/expire-listings` for testing

### Database Changes
- Uses `CURRENT_TIMESTAMP` instead of `CURRENT_DATE` for precise time-based expiration
- Filters out expired listings from all public listing queries
- Maintains expired listings in the database for host reference

## API Behavior

### Public Listing Endpoints
- `GET /api/listings` - Only returns active, non-expired listings
- `GET /api/listings/average-ratings` - Only includes active, non-expired listings

### Host-Specific Endpoints
- `GET /api/listings?user_id=<id>` - Returns all user's listings (including inactive/expired)
- Hosts can see their expired listings in the "Inactive" tab of their dashboard

## Frontend Changes

### ListingCard Component
- Added `end_date` prop to check for expiration
- Visual indicators for expired listings:
  - Red "EXPIRED" overlay on listing images
  - "Expired" text indicator in the price section
  - Reduced opacity for expired listing images

### My Listings Page
- Expired listings automatically appear in the "Inactive" tab
- No additional changes needed - existing filtering logic handles this

## Testing

### Manual Expiration Check
```bash
curl -X POST http://localhost:4000/api/expire-listings
```

### Check Expired Listings
```bash
# Check public listings (should exclude expired)
curl http://localhost:4000/api/listings

# Check specific user's listings (includes expired)
curl "http://localhost:4000/api/listings?user_id=<user_id>"
```

## Configuration

### Expiration Schedule
To change the expiration check frequency, modify the cron schedule in `expirationService.js`:

```javascript
// Current: Every hour
cron.schedule('0 * * * *', () => {
  this.expireListings();
});

// Example: Every 30 minutes
cron.schedule('*/30 * * * *', () => {
  this.expireListings();
});
```

### Time Zone
The system uses the database server's timezone for expiration checks. Ensure your database server is configured with the correct timezone.

## Dependencies

- `node-cron`: For scheduled expiration checks
- Added to `backend/package.json`

## Notes

- Expired listings are not deleted, only marked as inactive
- Hosts can still view and manage their expired listings
- The system uses precise timestamp comparison for accurate expiration
- Expiration checks run automatically on server startup and every hour thereafter 