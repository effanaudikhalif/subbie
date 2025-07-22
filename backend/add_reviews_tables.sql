-- Add host_reviews table
CREATE TABLE IF NOT EXISTS public.host_reviews (
    id                uuid primary key default gen_random_uuid(),
    listing_id        uuid not null references public.listings(id) on delete cascade,
    reviewer_id       uuid not null references public.users(id) on delete cascade,
    reviewee_id       uuid not null references public.users(id) on delete cascade,
    cleanliness_rating integer not null check (cleanliness_rating >= 1 and cleanliness_rating <= 5),
    accuracy_rating   integer not null check (accuracy_rating >= 1 and accuracy_rating <= 5),
    communication_rating integer not null check (communication_rating >= 1 and communication_rating <= 5),
    location_rating   integer not null check (location_rating >= 1 and location_rating <= 5),
    value_rating      integer not null check (value_rating >= 1 and value_rating <= 5),
    comment           text,
    created_at        timestamptz default now(),
    updated_at        timestamptz default now()
);

-- Add renter_reviews table
CREATE TABLE IF NOT EXISTS public.renter_reviews (
    id                uuid primary key default gen_random_uuid(),
    listing_id        uuid not null references public.listings(id) on delete cascade,
    reviewer_id       uuid not null references public.users(id) on delete cascade,
    reviewed_id       uuid not null references public.users(id) on delete cascade,
    punctuality       integer not null check (punctuality >= 1 and punctuality <= 5),
    communication     integer not null check (communication >= 1 and communication <= 5),
    property_care     integer not null check (property_care >= 1 and property_care <= 5),
    compliance        integer not null check (compliance >= 1 and compliance <= 5),
    comment           text,
    created_at        timestamptz default now(),
    updated_at        timestamptz default now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS host_reviews_listing_idx ON public.host_reviews (listing_id);
CREATE INDEX IF NOT EXISTS host_reviews_reviewer_idx ON public.host_reviews (reviewer_id);
CREATE INDEX IF NOT EXISTS host_reviews_reviewee_idx ON public.host_reviews (reviewee_id);

CREATE INDEX IF NOT EXISTS renter_reviews_listing_idx ON public.renter_reviews (listing_id);
CREATE INDEX IF NOT EXISTS renter_reviews_reviewer_idx ON public.renter_reviews (reviewer_id);
CREATE INDEX IF NOT EXISTS renter_reviews_reviewed_idx ON public.renter_reviews (reviewed_id);

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION public.set_review_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  new.updated_at := now();
  RETURN new;
END $$;

CREATE TRIGGER trg_host_review_updated_at
  BEFORE UPDATE ON public.host_reviews
  FOR EACH ROW EXECUTE PROCEDURE public.set_review_updated_at();

CREATE TRIGGER trg_renter_review_updated_at
  BEFORE UPDATE ON public.renter_reviews
  FOR EACH ROW EXECUTE PROCEDURE public.set_review_updated_at(); 