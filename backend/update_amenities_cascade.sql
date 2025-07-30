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