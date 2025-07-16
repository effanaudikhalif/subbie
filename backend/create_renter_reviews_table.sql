-- Create renter_reviews table
CREATE TABLE renter_reviews (
    id SERIAL PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES bookings(id),
    reviewer_id UUID NOT NULL REFERENCES users(id), -- host who is reviewing
    reviewed_id UUID NOT NULL REFERENCES users(id), -- renter being reviewed
    punctuality INTEGER CHECK (punctuality >= 1 AND punctuality <= 5),
    communication INTEGER CHECK (communication >= 1 AND communication <= 5),
    property_care INTEGER CHECK (property_care >= 1 AND property_care <= 5),
    compliance INTEGER CHECK (compliance >= 1 AND compliance <= 5),
    comment TEXT,
    rating DECIMAL(3,2) GENERATED ALWAYS AS (
        (punctuality + communication + property_care + compliance) / 4.0
    ) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(booking_id, reviewer_id)
);

-- Create index for better query performance
CREATE INDEX idx_renter_reviews_booking_id ON renter_reviews(booking_id);
CREATE INDEX idx_renter_reviews_reviewer_id ON renter_reviews(reviewer_id);
CREATE INDEX idx_renter_reviews_reviewed_id ON renter_reviews(reviewed_id); 