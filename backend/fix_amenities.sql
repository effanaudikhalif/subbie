-- Fix amenity codes to match frontend expectations
-- This script standardizes the amenity codes and removes duplicates

-- First, let's see what we have
SELECT 'Current amenities:' as info;
SELECT code, name, category FROM amenities ORDER BY category, name;

-- Update amenity codes to match frontend expectations
UPDATE amenities SET code = 'air_conditioning' WHERE code = 'aircon';
UPDATE amenities SET code = 'bbq_grill' WHERE code = 'bbq';
UPDATE amenities SET code = 'high_speed_internet' WHERE code = 'high_speed_wifi';
UPDATE amenities SET code = 'gym_access' WHERE code = 'gym';
UPDATE amenities SET code = 'printer_access' WHERE code = 'printer';
UPDATE amenities SET code = 'dedicated_workspace' WHERE code = 'workspace';

-- Now let's see what we have after updates
SELECT 'After updates:' as info;
SELECT code, name, category FROM amenities ORDER BY category, name;

-- Remove duplicates (keep the ones with proper categories)
DELETE FROM amenities WHERE code IN (
  SELECT code FROM (
    SELECT code, ROW_NUMBER() OVER (PARTITION BY name ORDER BY 
      CASE 
        WHEN category IS NOT NULL THEN 0 
        ELSE 1 
      END,
      code
    ) as rn
    FROM amenities
  ) t WHERE t.rn > 1
);

-- Final result
SELECT 'Final result:' as info;
SELECT code, name, category FROM amenities ORDER BY category, name; 