# Booking System with Stripe Integration

## Overview

This booking system implements a secure, guest-friendly booking flow with Stripe payment processing. The system uses pre-authorization to hold payment methods without charging until the host accepts the booking.

## Flow

1. **Guest sends booking request** with dates and payment info
2. **Payment method is pre-authorized** (no charge yet)
3. **Host has 24 hours** to accept or decline
4. **If host accepts**: Payment is captured immediately, booking confirmed
5. **If host declines or doesn't respond**: Pre-authorization is released, no charge

## Database Schema Updates

The `bookings` table has been updated with new fields:

```sql
-- New fields added to bookings table
payment_intent_id text,                     -- Stripe PaymentIntent ID for pre-authorization
expires_at       timestamptz,               -- When the booking request expires (24 hours from creation)

-- Updated default values
payment_status   text default 'preauthorized', -- preauthorized | paid | refunded | released
```

## API Endpoints

### Create Booking (with pre-authorization)
```
POST /api/bookings
{
  "listing_id": "uuid",
  "guest_id": "uuid", 
  "host_id": "uuid",
  "start_date": "2024-01-15",
  "end_date": "2024-01-17",
  "price_per_night": 100,
  "total_price": 200,
  "payment_method_id": "pm_xxx"
}
```

### Host Accept Booking
```
PUT /api/bookings/:id/accept
```
- Captures the pre-authorized payment
- Updates status to 'confirmed' and payment_status to 'paid'

### Host Decline Booking
```
PUT /api/bookings/:id/decline
```
- Cancels the PaymentIntent (releases pre-authorization)
- Updates status to 'cancelled' and payment_status to 'released'

### Guest Cancel Booking
```
PUT /api/bookings/:id/cancel
```
- Cancels the PaymentIntent (releases pre-authorization)
- Updates status to 'cancelled' and payment_status to 'released'

### Cleanup Expired Bookings
```
POST /api/bookings/cleanup-expired
```
- Automatically processes expired booking requests
- Cancels PaymentIntents and updates status to 'expired'

## Frontend Components

### BookingForm
- Stripe Elements integration for secure payment input
- Date selection with price calculation
- Pre-authorization flow with clear messaging

### HostDashboard
- View pending booking requests with countdown timers
- Accept/decline buttons for each request
- Overview of all bookings (pending, confirmed, cancelled)

## Environment Variables

### Backend (.env)
```
STRIPE_SECRET_KEY=sk_test_xxx
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env.local)
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

## Security Features

1. **Pre-authorization**: No charges until host accepts
2. **24-hour expiration**: Automatic cleanup of unresponded requests
3. **Stripe integration**: PCI-compliant payment processing
4. **Row-level security**: Database-level access control
5. **Input validation**: Server-side validation of all booking data

## Cron Job Setup

To automatically clean up expired bookings, set up a cron job:

```bash
# Run every hour
0 * * * * cd /path/to/subly/backend && node cleanup-expired-bookings.js
```

## Testing

### Test Cards (Stripe Test Mode)
- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002
- **Insufficient funds**: 4000 0000 0000 9995

### Test Scenarios
1. Create booking with valid payment method
2. Host accepts → payment captured
3. Host declines → pre-authorization released
4. Guest cancels → pre-authorization released
5. 24-hour expiration → automatic cleanup

## Error Handling

- Invalid payment methods are rejected immediately
- Expired bookings are automatically cleaned up
- Failed payment captures are logged and handled gracefully
- Network errors are retried with exponential backoff

## Monitoring

Monitor these key metrics:
- Booking request success rate
- Host response time (accept/decline)
- Payment capture success rate
- Expired booking cleanup count
- Stripe API error rates 