-- DEBUG QUERIES FOR LISTING VISIBILITY ISSUE
-- Run these in your Supabase SQL Editor to identify why listings aren't showing

-- 1. Check all your listings with their status and expiration
SELECT 
  l.id, 
  l.title, 
  l.status, 
  l.end_date,
  l.created_at,
  u.name as owner_name,
  (l.end_date >= CURRENT_TIMESTAMP) as not_expired,
  (l.status IS NULL OR l.status IN ('active', 'approved')) as valid_status,
  (SELECT COUNT(*) FROM listing_images WHERE listing_id = l.id) as image_count,
  -- This shows if the listing should be visible on main page
  CASE 
    WHEN (l.status IS NULL OR l.status IN ('active', 'approved')) AND l.end_date >= CURRENT_TIMESTAMP 
    THEN 'VISIBLE ON MAIN PAGE' 
    ELSE 'HIDDEN FROM MAIN PAGE' 
  END as visibility_status
FROM listings l 
LEFT JOIN users u ON l.user_id = u.id 
ORDER BY l.created_at DESC;

-- 2. Check exactly what the main listings page query returns
-- This is the EXACT same query your main listings page uses
SELECT l.*, u.name, u.avatar_url, univ.name as university_name
FROM listings l 
LEFT JOIN users u ON l.user_id = u.id
LEFT JOIN universities univ ON u.university_id = univ.id
WHERE (l.status IS NULL OR l.status IN ('active', 'approved'))
AND l.end_date >= CURRENT_TIMESTAMP
ORDER BY l.created_at DESC;

-- 3. Count listings by status
SELECT 
  COALESCE(status, 'NULL') as status,
  COUNT(*) as count
FROM listings 
GROUP BY status;

-- 4. Count expired vs active listings
SELECT 
  CASE 
    WHEN end_date >= CURRENT_TIMESTAMP THEN 'Not Expired'
    ELSE 'Expired'
  END as expiry_status,
  COUNT(*) as count
FROM listings 
GROUP BY (end_date >= CURRENT_TIMESTAMP);

-- 5. Find the specific issue with your listings
SELECT 
  'Total Listings' as issue_type,
  COUNT(*) as count
FROM listings
UNION ALL
SELECT 
  'Listings with Invalid Status',
  COUNT(*)
FROM listings 
WHERE status IS NOT NULL AND status NOT IN ('active', 'approved')
UNION ALL
SELECT 
  'Expired Listings',
  COUNT(*)
FROM listings 
WHERE end_date < CURRENT_TIMESTAMP
UNION ALL
SELECT 
  'Listings Missing Images',
  COUNT(*)
FROM listings l
WHERE NOT EXISTS (SELECT 1 FROM listing_images WHERE listing_id = l.id)
UNION ALL
SELECT 
  'Listings That SHOULD Be Visible',
  COUNT(*)
FROM listings 
WHERE (status IS NULL OR status IN ('active', 'approved'))
AND end_date >= CURRENT_TIMESTAMP;

-- 6. Quick fix queries (run these if needed based on results above)

-- Fix expired listings (extend them by 30 days)
-- UPDATE listings SET end_date = CURRENT_DATE + INTERVAL '30 days' WHERE end_date < CURRENT_TIMESTAMP;

-- Fix invalid status listings (set them to active)
-- UPDATE listings SET status = 'active' WHERE status IS NOT NULL AND status NOT IN ('active', 'approved');

-- Fix NULL status listings (set them to active) - uncomment if needed
-- UPDATE listings SET status = 'active' WHERE status IS NULL; 