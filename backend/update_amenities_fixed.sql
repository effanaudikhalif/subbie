-- Update amenities table with new structure - Fixed version
-- First, update existing listing_amenities to use new codes where applicable
UPDATE public.listing_amenities 
SET amenity = 'air_conditioning' 
WHERE amenity = 'aircon';

UPDATE public.listing_amenities 
SET amenity = 'dedicated_workspace' 
WHERE amenity = 'workspace';

-- Remove any amenities that don't exist in the new structure
DELETE FROM public.listing_amenities 
WHERE amenity IN (
  'free_parking', 'paid_parking', 'pool', 'hot_tub', 'patio', 'bbq', 
  'outdoor_dining', 'fire_pit', 'pool_table', 'indoor_fireplace', 'piano', 
  'lake_access', 'beach_access', 'outdoor_shower', 'quiet_study', 
  'high_speed_internet', 'printer_access', 'coffee_station', 'group_study'
);

-- Now clear existing amenities (this should work since we've cleaned up the references)
DELETE FROM public.amenities;

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