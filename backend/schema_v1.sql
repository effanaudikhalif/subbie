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
-- Row-Level Security (RLS)
----------------------------------------------------------
alter table public.universities enable row level security;

/* Read-only to everyone; admins can manage rows.
   You can tighten this later if you need per-school admins. */
create policy "public read universities"
  on public.universities for select
  using (true);

-- Enable UUID generation (safe to run more than once)
create extension if not exists "pgcrypto";

----------------------------------------------------------
-- USERS PROFILE TABLE  (no avatar_url, no is_verified)
----------------------------------------------------------
create table public.users (
    -- Same UUID as auth.users.id  (1-to-1 mapping)
    id              uuid primary key
                    references auth.users(id) on delete cascade,

    -- Link to the student's school
    university_id   uuid not null
                    references public.universities(id) on delete restrict,

    name            text,
    email           text not null,      -- copy from auth.users.email
    phone           text,              -- optional

    stripe_account  text,              -- keep null for now

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
-- Row-Level Security (RLS)
----------------------------------------------------------
alter table public.users enable row level security;

-- Students can read their own profile row
create policy "self read profile"
  on public.users for select
  using (auth.uid() = id);

-- Students can update only their own row
create policy "self update profile"
  on public.users for update
  using (auth.uid() = id);

-- Enable UUID generation (run once per database; harmless if already created)
create extension if not exists "pgcrypto";

----------------------------------------------------------
-- LISTINGS TABLE
----------------------------------------------------------
create table public.listings (
    id                uuid primary key default gen_random_uuid(),

    -- Host (student) who owns the listing
    user_id           uuid not null
                      references public.users(id) on delete cascade,

    -- Core listing details
    title             text not null check (char_length(title) <= 120),
    description       text,
    address           text,          -- e.g. "123 Comm Ave Apt 3B"
    city              text,
    state             text,
    zip               text,
    country           text default 'USA',

    -- Pricing & availability
    price_per_night   numeric(10,2) not null check (price_per_night >= 0),
    start_date        date not null,
    end_date          date not null check (end_date > start_date),

    max_occupancy     smallint default 1 check (max_occupancy >= 1),

    status            text default 'active',    -- active | delisted

    -- Metadata
    created_at        timestamptz default now(),
    updated_at        timestamptz default now()
);

----------------------------------------------------------
-- Trigger → auto-update updated_at on every change
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

-- Full-text search (title + description)
create index listings_fts_idx on public.listings
  using gin (to_tsvector('english',
        coalesce(title,'') || ' ' || coalesce(description,'')));

----------------------------------------------------------
-- Row-Level Security (RLS)
----------------------------------------------------------
alter table public.listings enable row level security;

-- 1. Any logged-in student can read only *active* listings
create policy "read active listings"
  on public.listings for select
  using (status = 'active');

-- 2. Owner can insert/update/delete their own listings
create policy "owner manages listings"
  on public.listings for all
  using (auth.uid() = user_id);

-- Enable UUIDs (no-op if already installed)
create extension if not exists "pgcrypto";

----------------------------------------------------------
-- LISTING_IMAGES  (zero-to-many per listing)
----------------------------------------------------------
create table public.listing_images (
    id            uuid primary key default gen_random_uuid(),

    -- Parent listing
    listing_id    uuid not null
                  references public.listings(id) on delete cascade,

    url           text not null,          -- signed or public URL in Storage
    order_index   smallint default 0,     -- for carousel ordering (0,1,2,…)
    created_at    timestamptz default now()
);

----------------------------------------------------------
-- Helpful indexes
----------------------------------------------------------
-- Fetch all images of a listing quickly and in order
create index img_listing_idx   on public.listing_images (listing_id, order_index);

----------------------------------------------------------
-- Row-Level Security (RLS)
----------------------------------------------------------
alter table public.listing_images enable row level security;

-- 1. Anyone logged in can read images of *active* listings
create policy "read images of active listings"
  on public.listing_images for select
  using (
    exists (
      select 1 from public.listings
      where id = listing_id
        and status = 'active'
    )
  );

-- 2. Listing owner can insert/update/delete their own images
create policy "owner manages images"
  on public.listing_images for all
  using (
    auth.uid() = (
      select user_id from public.listings
      where id = listing_id
    )
  );

-- Enable UUIDs (no-op if already installed)
create extension if not exists "pgcrypto";

----------------------------------------------------------
-- BOOKINGS  (guest ↔ host, nightly pricing)
----------------------------------------------------------
create table public.bookings (
    id               uuid primary key default gen_random_uuid(),

    -- FK to the listing being booked
    listing_id       uuid not null
                     references public.listings(id) on delete cascade,

    -- Who is staying
    guest_id         uuid not null
                     references public.users(id) on delete restrict,

    -- Cache the host for quick joins (owner of the listing)
    host_id          uuid not null
                     references public.users(id) on delete restrict,

    -- Date range and cost snapshot
    start_date       date not null,
    end_date         date not null check (end_date > start_date),
    price_per_night  numeric(10,2) not null,     -- copied from listing at booking time
    total_price      numeric(10,2) not null,     -- nights × price_per_night

    -- Booking state
    status           text default 'pending',     -- pending | confirmed | cancelled
    payment_status   text default 'unpaid',      -- unpaid | paid | refunded
    -- payment_intent_id text,                  -- (nullable) for Stripe later

    created_at       timestamptz default now(),
    updated_at       timestamptz default now()
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
-- Row-Level Security (RLS)
----------------------------------------------------------
alter table public.bookings enable row level security;

-- 1. Guest or host can read their own bookings
create policy "guest or host can read"
  on public.bookings for select
  using (auth.uid() = guest_id OR auth.uid() = host_id);

-- 2. Guest can create (insert) a booking
create policy "guest can create booking"
  on public.bookings for insert
  with check (auth.uid() = guest_id);

-- 3. Host can confirm / cancel; guest can cancel their own
create policy "guest or host can update status"
  on public.bookings for update
  using (auth.uid() = guest_id OR auth.uid() = host_id);

-- 4. Only host may delete (rare—e.g., if listing removed)
create policy "host can delete"
  on public.bookings for delete
  using (auth.uid() = host_id);

--V2

/********************************************************************
*  1. ── ENUM-LIKE reference tables (property type, space type)    *
********************************************************************/
create type property_type_enum as enum ('house', 'apartment');
create type guest_space_enum  as enum ('entire_place', 'room', 'shared_room');

/********************************************************************
*  2. ── LISTINGS: new columns                                      *
********************************************************************/
alter table public.listings
    add column property_type   property_type_enum not null default 'apartment',
    add column guest_space     guest_space_enum  not null default 'entire_place',
    add column bedrooms        smallint not null default 1 check (bedrooms >= 0),
    add column bathrooms       smallint not null default 1 check (bathrooms >= 0);

/********************************************************************
*  3. ── AMENITIES catalog                                          *
********************************************************************/
create table public.amenities (
    code        text primary key,         -- e.g. 'wifi'
    name        text not null,            -- e.g. 'Wi-Fi'
    category    text,                     -- e.g. 'indoor', 'outdoor'
    is_premium  boolean default false
);

insert into public.amenities (code, name, category) values
  -- Core
  ('wifi',                'Wi-Fi',                       'core'),
  ('tv',                  'TV',                          'core'),
  ('kitchen',             'Kitchen',                     'core'),
  ('washer',              'Washer',                      'core'),
  ('free_parking',        'Free parking on premises',    'core'),
  ('paid_parking',        'Paid parking on premises',    'core'),
  ('aircon',              'Air conditioning',            'core'),
  ('workspace',           'Dedicated workspace',         'core'),
  -- Extras
  ('pool',                'Pool',                        'extra'),
  ('hot_tub',             'Hot tub',                     'extra'),
  ('patio',               'Patio',                       'extra'),
  ('bbq',                 'BBQ grill',                   'extra'),
  ('outdoor_dining',      'Outdoor dining area',         'extra'),
  ('fire_pit',            'Fire pit',                    'extra'),
  ('pool_table',          'Pool table',                  'extra'),
  ('indoor_fireplace',    'Indoor fireplace',            'extra'),
  ('piano',               'Piano',                       'extra'),
  ('gym',                 'Exercise equipment',          'extra'),
  ('lake_access',         'Lake access',                 'extra'),
  ('beach_access',        'Beach access',                'extra'),
  ('outdoor_shower',      'Outdoor shower',              'extra');

/********************************************************************
*  4. ── Junction table: listing ⇆ amenities                        *
********************************************************************/
create table public.listing_amenities (
    listing_id  uuid not null
                references public.listings(id) on delete cascade,
    amenity     text not null
                references public.amenities(code) on delete restrict,
    primary key (listing_id, amenity)
);

-- RLS mirrors listing_images: everyone can read active listings' amenities
alter table public.listing_amenities enable row level security;

create policy "read amenities of active listings"
  on public.listing_amenities for select
  using (
    exists (select 1
            from public.listings
            where id = listing_id
              and status = 'active')
  );

create policy "owner manages amenities"
  on public.listing_amenities for all           -- insert, update, delete
  using (
    auth.uid() = (
      select user_id from public.listings
      where id = listing_id
    )
  );

/********************************************************************
*  5. ── Optional: who else lives there (co-habitants)              *
********************************************************************/
create type occupant_enum as enum ('me', 'family', 'other_guests', 'roommate');

create table public.listing_occupants (
    listing_id  uuid not null
                references public.listings(id) on delete cascade,
    occupant    occupant_enum not null,
    primary key (listing_id, occupant)
);

alter table public.listing_occupants enable row level security;

create policy "read occupants of active listings"
  on public.listing_occupants for select
  using (
    exists (select 1 from public.listings
            where id = listing_id
              and status = 'active')
  );

create policy "owner manages occupants"
  on public.listing_occupants for all
  using (
    auth.uid() = (select user_id from public.listings where id = listing_id)
  );

-- 1️⃣ conversations  (one thread per guest↔host pair, per listing)
create table public.conversations (
    id            uuid primary key default gen_random_uuid(),
    listing_id    uuid references public.listings(id) on delete cascade,
    guest_id      uuid references public.users(id)    on delete restrict,
    host_id       uuid references public.users(id)    on delete restrict,
    created_at    timestamptz default now()
);

-- 2️⃣ messages  (many per conversation)
create table public.messages (
    id               uuid primary key default gen_random_uuid(),
    conversation_id  uuid references public.conversations(id) on delete cascade,
    sender_id        uuid references public.users(id) on delete restrict,
    body             text not null,
    sent_at          timestamptz default now(),
    read_at          timestamptz
);

-- indexes for speed
create index msg_convo_idx on public.messages (conversation_id, sent_at);

alter table public.conversations enable row level security;
alter table public.messages       enable row level security;

-- either participant may read the convo
create policy "convo read"
  on public.conversations for select
  using (auth.uid() = guest_id OR auth.uid() = host_id);

-- only participants may insert / select messages
create policy "msg read"
  on public.messages for select
  using (
    auth.uid() = sender_id OR
    auth.uid() IN (select guest_id from public.conversations where id = conversation_id) OR
    auth.uid() IN (select host_id  from public.conversations where id = conversation_id)
  );

create policy "msg write"
  on public.messages for insert
  with check (auth.uid() = sender_id
           AND auth.uid() IN (
                select guest_id from public.conversations where id = conversation_id
                UNION
                select host_id  from public.conversations where id = conversation_id));
