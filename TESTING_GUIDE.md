# Testing Guide for HEIC and Listing Visibility Fix

## What Was Fixed

1. ✅ **HEIC Conversion Enabled**: Files from iPhone will now be converted to JPEG automatically
2. ✅ **RLS Policy Updated**: Users can now see their own listing images regardless of status
3. ✅ **Backend Query Verified**: Confirmed correct status filtering for main listings page

## How to Test

### 1. Apply Database Fix
1. Go to your Supabase dashboard → SQL Editor
2. Run the SQL script in `fix_listing_images_policy.sql`
3. Verify no errors in the output

### 2. Test HEIC Image Upload
1. **From your iPhone**: Take a new photo (should be HEIC format)
2. Create a new listing using this photo
3. **Expected Result**: Photo should upload successfully and display on both:
   - My Listings page ✅
   - Main Listings page ✅

### 3. Test Existing Listings
1. Check your existing listings on the main listings page
2. **If still not visible**, it could be due to:
   - Listing status is not 'active' or 'approved'
   - Listing end_date has passed
   - HEIC images that were uploaded before the fix

### 4. Verify Image Display
1. Open browser developer tools (F12)
2. Check for any image loading errors in Console tab
3. Look for 404 errors or CORS issues

## Troubleshooting

### If listings still don't show on main page:

**Check Listing Status:**
```sql
-- Run this in Supabase SQL editor to check your listings
SELECT 
  title, 
  status, 
  end_date,
  created_at,
  (end_date >= CURRENT_DATE) as not_expired
FROM listings 
WHERE user_id = auth.uid()
ORDER BY created_at DESC;
```

**Fix listing status if needed:**
```sql
-- If your listings have wrong status, fix them:
UPDATE listings 
SET status = 'active' 
WHERE user_id = auth.uid() 
  AND (status IS NULL OR status NOT IN ('active', 'approved'));
```

### If HEIC images still don't display:

**Option A: Re-upload the images**
- Edit your listing and replace the HEIC images with new ones
- The conversion should now work properly

**Option B: Convert existing HEIC URLs**
- Check if any listing_images have .heic extensions
- These may need to be re-uploaded through the frontend

## Expected Results After Fix

✅ **New HEIC uploads**: Converted to JPEG automatically  
✅ **My listings page**: Shows all your listings with images  
✅ **Main listings page**: Shows your active/approved listings with images  
✅ **Cross-platform compatibility**: Images work on all devices  

## Still Having Issues?

If problems persist after following this guide:

1. **Check browser console** for error messages
2. **Verify Supabase connection** is working
3. **Test with a brand new listing** using HEIC images
4. **Check your listing end_dates** haven't expired

The most common remaining issue would be existing HEIC files that need to be re-uploaded. 