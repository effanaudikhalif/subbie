-- Enable UUIDs once per database
create extension if not exists "pgcrypto";

----------------------------------------------------------
-- UNIVERSITIES TABLE
----------------------------------------------------------
create table public.universities (
    id        uuid primary key default gen_random_uuid(),
    name      text not null
);

----------------------------------------------------------
-- USERS TABLE (Railway version - no auth.users reference)
----------------------------------------------------------
create table public.users (
    id              uuid primary key default gen_random_uuid(),
    name            text,
    email           text not null unique,
    phone           text,
    stripe_account  text,
    created_at      timestamptz default now(),
    updated_at      timestamptz default now()
);

----------------------------------------------------------
-- Trigger → auto-update updated_at on changes
----------------------------------------------------------
create or replace function public.set_user_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger trg_user_updated_at
before update on public.users
for each row execute procedure public.set_user_updated_at();

----------------------------------------------------------
-- AMENITIES TABLE
----------------------------------------------------------
create table public.amenities (
    id          uuid primary key default gen_random_uuid(),
    code        text not null,
    name        text not null,
    category    text,
    is_premium  boolean default false,
    created_at  timestamptz default now()
);

-- Insert default amenities
insert into public.amenities (code, name, category, is_premium) values
('wifi', 'WiFi', 'Internet', false),
('kitchen', 'Kitchen', 'Kitchen', false),
('washer', 'Washer', 'Laundry', false),
('dryer', 'Dryer', 'Laundry', false),
('ac', 'Air Conditioning', 'Climate', false),
('heating', 'Heating', 'Climate', false),
('tv', 'TV', 'Entertainment', false),
('parking', 'Parking', 'Transportation', false),
('gym', 'Gym', 'Fitness', false),
('pool', 'Pool', 'Outdoor', false),
('workspace', 'Workspace', 'Work', false),
('dishwasher', 'Dishwasher', 'Kitchen', false),
('coffee', 'Coffee Maker', 'Kitchen', false),
('printer', 'Printer', 'Work', false),
('safe', 'Safe', 'Security', false),
('bike', 'Bike Storage', 'Transportation', false),
('outdoor', 'Outdoor Space', 'Outdoor', false),
('games', 'Game Console', 'Entertainment', false),
('whiteboard', 'Whiteboard', 'Work', false),
('storage', 'Storage', 'Storage', false),
('cleaning', 'Cleaning Supplies', 'Cleaning', false),
('monitor', 'Monitor', 'Work', false),
('speaker', 'Speaker', 'Entertainment', false),
('outlets', 'Outlets', 'Electrical', false);

----------------------------------------------------------
-- ENUMS
----------------------------------------------------------
create type property_type_enum as enum ('house', 'apartment');
create type guest_space_enum as enum ('entire_place', 'room', 'shared_room');
create type occupant_enum as enum ('me', 'family', 'other_guests', 'roommate');
create type cancelled_by_enum as enum ('guest', 'host', 'system');

----------------------------------------------------------
-- LISTINGS TABLE
----------------------------------------------------------
create table public.listings (
    id                uuid primary key default gen_random_uuid(),
    user_id           uuid not null references public.users(id) on delete cascade,
    title             text not null,
    description       text,
    address           text,
    city              text,
    state             text,
    zip               text,
    country           text default 'USA',
    price_per_night   numeric not null,
    start_date        date not null,
    end_date          date not null,
    max_occupancy     smallint default 1,
    status            text default 'active',
    created_at        timestamptz default now(),
    updated_at        timestamptz default now(),
    property_type     property_type_enum not null default 'apartment',
    guest_space       guest_space_enum not null default 'entire_place',
    bedrooms          smallint not null default 1,
    bathrooms         smallint not null default 1,
    latitude          numeric,
    longitude         numeric,
    neighborhood      text,
    unit              text
);

----------------------------------------------------------
-- Trigger → auto-update updated_at on changes
----------------------------------------------------------
create or replace function public.set_listing_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger trg_listing_updated_at
before update on public.listings
for each row execute procedure public.set_listing_updated_at();

----------------------------------------------------------
-- LISTING IMAGES TABLE
----------------------------------------------------------
create table public.listing_images (
    id          uuid primary key default gen_random_uuid(),
    listing_id  uuid not null references public.listings(id) on delete cascade,
    url         text not null,
    order_index smallint default 0,
    created_at  timestamptz default now()
);

----------------------------------------------------------
-- LISTING AMENITIES TABLE
----------------------------------------------------------
create table public.listing_amenities (
    listing_id  uuid not null references public.listings(id) on delete cascade,
    amenity     text not null,
    primary key (listing_id, amenity)
);

----------------------------------------------------------
-- LISTING OCCUPANTS TABLE
----------------------------------------------------------
create table public.listing_occupants (
    listing_id  uuid not null references public.listings(id) on delete cascade,
    occupant    occupant_enum not null,
    primary key (listing_id, occupant)
);

----------------------------------------------------------
-- BOOKINGS TABLE
----------------------------------------------------------
create table public.bookings (
    id                    uuid primary key default gen_random_uuid(),
    listing_id            uuid not null references public.listings(id) on delete cascade,
    guest_id              uuid not null references public.users(id) on delete cascade,
    host_id               uuid not null references public.users(id) on delete cascade,
    start_date            date not null,
    end_date              date not null,
    price_per_night       numeric not null,
    total_price           numeric not null,
    status                text default 'pending',
    payment_status        text default 'preauthorized',
    created_at            timestamptz default now(),
    updated_at            timestamptz default now(),
    payment_intent_id     text,
    expires_at            timestamptz,
    stripe_fee_amount     numeric default 0,
    subly_fee_amount      numeric default 0,
    host_payout_amount    numeric default 0,
    stripe_transfer_id    text,
    fee_calculated_at     timestamptz,
    host_subly_fee_amount numeric default 0,
    guest_subly_fee_amount numeric default 0,
    cancellation_reason   varchar,
    cancellation_details  text,
    cancelled_by          cancelled_by_enum,
    cancelled_at          timestamp default current_timestamp
);

----------------------------------------------------------
-- Trigger → auto-update updated_at on changes
----------------------------------------------------------
create or replace function public.set_booking_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger trg_booking_updated_at
before update on public.bookings
for each row execute procedure public.set_booking_updated_at();

----------------------------------------------------------
-- CONVERSATIONS TABLE
----------------------------------------------------------
create table public.conversations (
    id          uuid primary key default gen_random_uuid(),
    listing_id  uuid references public.listings(id) on delete cascade,
    guest_id    uuid references public.users(id) on delete cascade,
    host_id     uuid references public.users(id) on delete cascade,
    created_at  timestamptz default now()
);

----------------------------------------------------------
-- MESSAGES TABLE
----------------------------------------------------------
create table public.messages (
    id              uuid primary key default gen_random_uuid(),
    conversation_id uuid references public.conversations(id) on delete cascade,
    sender_id       uuid references public.users(id) on delete cascade,
    body            text not null,
    sent_at         timestamptz default now(),
    read_at         timestamptz
);

----------------------------------------------------------
-- HOST REVIEWS TABLE
----------------------------------------------------------
create table public.host_reviews (
    id                uuid primary key default gen_random_uuid(),
    reviewer_id       uuid not null references public.users(id) on delete cascade,
    reviewee_id       uuid not null references public.users(id) on delete cascade,
    comment           text,
    created_at        timestamptz default now(),
    updated_at        timestamptz default now(),
    cleanliness_rating integer,
    accuracy_rating   integer,
    communication_rating integer,
    location_rating   integer,
    value_rating      integer,
    average_rating    numeric,
    listing_id        uuid not null references public.listings(id) on delete cascade
);

----------------------------------------------------------
-- Trigger → auto-update updated_at on changes
----------------------------------------------------------
create or replace function public.set_host_review_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger trg_host_review_updated_at
before update on public.host_reviews
for each row execute procedure public.set_host_review_updated_at();

----------------------------------------------------------
-- RENTER REVIEWS TABLE
----------------------------------------------------------
create table public.renter_reviews (
    id              integer primary key generated always as identity,
    reviewer_id     uuid not null references public.users(id) on delete cascade,
    reviewed_id     uuid not null references public.users(id) on delete cascade,
    punctuality     integer,
    communication   integer,
    property_care   integer,
    compliance      integer,
    comment         text,
    rating          numeric,
    created_at      timestamp default current_timestamp,
    updated_at      timestamp default current_timestamp,
    listing_id      uuid not null references public.listings(id) on delete cascade
);

----------------------------------------------------------
-- Trigger → auto-update updated_at on changes
----------------------------------------------------------
create or replace function public.set_renter_review_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := current_timestamp;
  return new;
end $$;

create trigger trg_renter_review_updated_at
before update on public.renter_reviews
for each row execute procedure public.set_renter_review_updated_at();

----------------------------------------------------------
-- WISHLIST TABLE
----------------------------------------------------------
create table public.wishlist (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references public.users(id) on delete cascade,
    listing_id  uuid not null references public.listings(id) on delete cascade,
    created_at  timestamptz default now(),
    unique(user_id, listing_id)
);

----------------------------------------------------------
-- INDEXES
----------------------------------------------------------
create index users_email_idx on public.users (email);
create index listings_user_idx on public.listings (user_id);
create index listings_status_idx on public.listings (status);
create index listings_dates_idx on public.listings (start_date, end_date);
create index listing_images_listing_idx on public.listing_images (listing_id);
create index booking_listing_idx on public.bookings (listing_id);
create index booking_guest_idx on public.bookings (guest_id);
create index booking_host_idx on public.bookings (host_id);
create index booking_status_idx on public.bookings (status);
create index conversation_listing_idx on public.conversations (listing_id);
create index messages_conversation_idx on public.messages (conversation_id);
create index host_reviews_reviewee_idx on public.host_reviews (reviewee_id);
create index renter_reviews_reviewed_idx on public.renter_reviews (reviewed_id);
create index wishlist_user_idx on public.wishlist (user_id);
create index wishlist_listing_idx on public.wishlist (listing_id); 