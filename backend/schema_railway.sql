-- Enable UUIDs once per database
create extension if not exists "pgcrypto";

----------------------------------------------------------
-- UNIVERSITIES TABLE
----------------------------------------------------------
create table public.universities (
    id        uuid primary key default gen_random_uuid(),
    name      text not null,
    domain    text not null unique,      -- "bu.edu", "mit.edu"
    created_at timestamptz default now()
);

-- Index for quick domain look-up
create index universities_domain_idx on public.universities (domain);

----------------------------------------------------------
-- USERS PROFILE TABLE (Railway version - no auth.users reference)
----------------------------------------------------------
create table public.users (
    id              uuid primary key default gen_random_uuid(),
    university_id   uuid not null references public.universities(id) on delete restrict,
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
-- Helpful indexes
----------------------------------------------------------
create index users_university_idx on public.users (university_id);
create index users_email_idx      on public.users (email);

----------------------------------------------------------
-- LISTINGS TABLE
----------------------------------------------------------
create table public.listings (
    id                uuid primary key default gen_random_uuid(),
    user_id           uuid not null references public.users(id) on delete cascade,
    title             text not null,
    description       text,
    price_per_night   decimal(10,2) not null,
    start_date        date not null,
    end_date          date not null,
    address           text not null,
    city              text not null,
    state             text not null,
    zip_code          text not null,
    latitude          decimal(10,8),
    longitude         decimal(11,8),
    property_type     text not null,
    guest_space       text not null,
    max_guests        integer not null,
    bedrooms          integer not null,
    bathrooms         integer not null,
    status            text default 'active',
    is_active         boolean default true,
    created_at        timestamptz default now(),
    updated_at        timestamptz default now()
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
-- Helpful indexes
----------------------------------------------------------
create index listings_user_idx    on public.listings (user_id);
create index listings_price_idx   on public.listings (price_per_night);
create index listings_dates_idx   on public.listings (start_date, end_date);

-- Full-text search index
create index listings_fts_idx on public.listings
using gin(to_tsvector('english', title || ' ' || description || ' ' || address || ' ' || city));

----------------------------------------------------------
-- LISTING IMAGES TABLE
----------------------------------------------------------
create table public.listing_images (
    id          uuid primary key default gen_random_uuid(),
    listing_id  uuid not null references public.listings(id) on delete cascade,
    image_url   text not null,
    order_index integer not null default 0,
    created_at  timestamptz default now()
);

create index img_listing_idx   on public.listing_images (listing_id, order_index);

----------------------------------------------------------
-- BOOKINGS TABLE
----------------------------------------------------------
create table public.bookings (
    id              uuid primary key default gen_random_uuid(),
    listing_id      uuid not null references public.listings(id) on delete cascade,
    guest_id        uuid not null references public.users(id) on delete cascade,
    host_id         uuid not null references public.users(id) on delete cascade,
    start_date      date not null,
    end_date        date not null,
    total_price     decimal(10,2) not null,
    status          text not null default 'pending',
    guest_message   text,
    host_message    text,
    created_at      timestamptz default now(),
    updated_at      timestamptz default now()
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
-- Helpful indexes
----------------------------------------------------------
create index booking_listing_idx on public.bookings (listing_id);
create index booking_guest_idx   on public.bookings (guest_id);
create index booking_host_idx    on public.bookings (host_id);
create index booking_dates_idx   on public.bookings (start_date, end_date);

----------------------------------------------------------
-- REVIEWS TABLE
----------------------------------------------------------
create table public.reviews (
    id              uuid primary key default gen_random_uuid(),
    booking_id      uuid not null references public.bookings(id) on delete cascade,
    reviewer_id     uuid not null references public.users(id) on delete cascade,
    reviewee_id     uuid not null references public.users(id) on delete cascade,
    rating          integer not null check (rating >= 1 and rating <= 5),
    comment         text,
    is_host_review  boolean not null,
    created_at      timestamptz default now(),
    updated_at      timestamptz default now()
);

----------------------------------------------------------
-- Trigger → auto-update updated_at on changes
----------------------------------------------------------
create or replace function public.set_review_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger trg_review_updated_at
before update on public.reviews
for each row execute procedure public.set_review_updated_at();

----------------------------------------------------------
-- Helpful indexes
----------------------------------------------------------
create index review_booking_idx on public.reviews (booking_id);
create index review_reviewer_idx on public.reviews (reviewer_id);
create index review_reviewee_idx on public.reviews (reviewee_id);
create index review_rating_idx on public.reviews (rating);

----------------------------------------------------------
-- AMENITIES TABLES
----------------------------------------------------------
create type property_type_enum as enum ('house', 'apartment');
create type guest_space_enum  as enum ('entire_place', 'room', 'shared_room');

create table public.amenities (
    id          uuid primary key default gen_random_uuid(),
    name        text not null unique,
    category    text not null,
    icon_url    text,
    created_at  timestamptz default now()
);

-- Insert default amenities
insert into public.amenities (name, category, icon_url) values
('WiFi', 'Internet', '/icons/wifi.png'),
('Kitchen', 'Kitchen', '/icons/kitchen.png'),
('Washer', 'Laundry', '/icons/washer.png'),
('Dryer', 'Laundry', '/icons/dryer.png'),
('Air Conditioning', 'Climate', '/icons/ac.png'),
('Heating', 'Climate', '/icons/heating.png'),
('TV', 'Entertainment', '/icons/tv.png'),
('Parking', 'Transportation', '/icons/parking.png'),
('Gym', 'Fitness', '/icons/gym.png'),
('Pool', 'Outdoor', '/icons/pool.png'),
('Workspace', 'Work', '/icons/workspace.png'),
('Dishwasher', 'Kitchen', '/icons/dishwasher.png'),
('Coffee Maker', 'Kitchen', '/icons/coffee.png'),
('Printer', 'Work', '/icons/printer.png'),
('Safe', 'Security', '/icons/safe.png'),
('Bike Storage', 'Transportation', '/icons/bike.png'),
('Outdoor Space', 'Outdoor', '/icons/outdoor.png'),
('Game Console', 'Entertainment', '/icons/games.png'),
('Whiteboard', 'Work', '/icons/whiteboard.png'),
('Storage', 'Storage', '/icons/storage.png'),
('Cleaning Supplies', 'Cleaning', '/icons/cleaning.png'),
('Monitor', 'Work', '/icons/monitor.png'),
('Speaker', 'Entertainment', '/icons/speaker.png'),
('Outlets', 'Electrical', '/icons/outlets.png');

create table public.listing_amenities (
    id          uuid primary key default gen_random_uuid(),
    listing_id  uuid not null references public.listings(id) on delete cascade,
    amenity_id  uuid not null references public.amenities(id) on delete cascade,
    created_at  timestamptz default now(),
    unique(listing_id, amenity_id)
);

create index listing_amenities_listing_idx on public.listing_amenities (listing_id);
create index listing_amenities_amenity_idx on public.listing_amenities (amenity_id);

----------------------------------------------------------
-- OCCUPANTS TABLE
----------------------------------------------------------
create type occupant_enum as enum ('me', 'family', 'other_guests', 'roommate');

create table public.listing_occupants (
    id          uuid primary key default gen_random_uuid(),
    listing_id  uuid not null references public.listings(id) on delete cascade,
    occupant_type occupant_enum not null,
    description text,
    created_at  timestamptz default now()
);

create index listing_occupants_listing_idx on public.listing_occupants (listing_id);

----------------------------------------------------------
-- CONVERSATIONS AND MESSAGES TABLES
----------------------------------------------------------
create table public.conversations (
    id          uuid primary key default gen_random_uuid(),
    listing_id  uuid not null references public.listings(id) on delete cascade,
    guest_id    uuid not null references public.users(id) on delete cascade,
    host_id     uuid not null references public.users(id) on delete cascade,
    created_at  timestamptz default now()
);

create table public.messages (
    id              uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references public.conversations(id) on delete cascade,
    sender_id       uuid not null references public.users(id) on delete cascade,
    content         text not null,
    sent_at         timestamptz default now()
);

create index msg_convo_idx on public.messages (conversation_id, sent_at);

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

create index wishlist_user_idx on public.wishlist (user_id);
create index wishlist_listing_idx on public.wishlist (listing_id); 

-- Update amenities table with new structure - CASCADE approach
-- Delete all existing amenities (this will cascade to listing_amenities)
DELETE FROM public.amenities CASCADE;

-- Insert new amenities
INSERT INTO public.amenities (code, name, category) VALUES
  -- Living Essentials
  ('wifi', 'Wi-Fi', 'living'),
  ('heating', 'Heating', 'living'),
  ('air_conditioning', 'Air conditioning', 'living'),
  ('kitchen', 'Kitchen', 'living'),
  ('cutlery', 'Cutlery', 'living'),
  ('washer', 'Washer', 'living'),
  ('dryer', 'Dryer', 'living'),
  ('cleaning_supplies', 'Cleaning supplies', 'living'),
  ('safe_locks', 'Safe locks', 'living'),
  
  -- College Essentials
  ('dedicated_workspace', 'Dedicated workspace', 'college'),
  ('printer', 'Printer', 'college'),
  ('outlets', 'Outlets', 'college'),
  ('storage', 'Storage', 'college'),
  ('whiteboard', 'Whiteboard', 'college'),
  ('bike_storage', 'Bike storage', 'college'),
  ('coffee_maker', 'Coffee maker', 'college'),
  ('monitor', 'Monitor', 'college'),
  
  -- Extra
  ('tv', 'TV', 'extra'),
  ('outdoor_space', 'Outdoor space', 'extra'),
  ('parking', 'Parking', 'extra'),
  ('gym', 'Gym', 'extra'),
  ('games', 'Games', 'extra'),
  ('dishwasher', 'Dishwasher', 'extra'),
  ('speaker', 'Speaker', 'extra'); 