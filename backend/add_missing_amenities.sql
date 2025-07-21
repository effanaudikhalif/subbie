-- Add missing amenities to the database
-- This script adds all amenities used in the frontend

INSERT INTO amenities (code, name, category, is_premium) VALUES
-- Living Essentials
('wifi', 'Wi-Fi', 'living', false),
('tv', 'TV', 'living', false),
('kitchen', 'Kitchen', 'living', false),
('washer', 'Washer', 'living', false),
('aircon', 'Air conditioning', 'living', false),
('free_parking', 'Free parking', 'living', false),
('paid_parking', 'Paid parking', 'living', false),

-- College Essentials
('workspace', 'Dedicated workspace', 'college', false),
('quiet_study', 'Quiet study area', 'college', false),
('high_speed_wifi', 'High-speed Wi-Fi', 'college', false),
('printer', 'Printer access', 'college', false),
('coffee_station', 'Coffee station', 'college', false),
('whiteboard', 'Whiteboard', 'college', false),
('group_study', 'Group study area', 'college', false),

-- Extra
('pool', 'Pool', 'extra', false),
('hot_tub', 'Hot tub', 'extra', false),
('patio', 'Patio', 'extra', false),
('bbq', 'BBQ grill', 'extra', false),
('outdoor_dining', 'Outdoor dining area', 'extra', false),
('fire_pit', 'Fire pit', 'extra', false),
('pool_table', 'Pool table', 'extra', false),
('indoor_fireplace', 'Indoor fireplace', 'extra', false),
('piano', 'Piano', 'extra', false),
('gym', 'Exercise equipment', 'extra', false),
('lake_access', 'Lake access', 'extra', false),
('beach_access', 'Beach access', 'extra', false),
('outdoor_shower', 'Outdoor shower', 'extra', false)

ON CONFLICT (code) DO NOTHING; 