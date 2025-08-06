-- Fix listing_images RLS policy to allow users to see their own images
-- Run this in your Supabase SQL editor

-- Drop the existing policy
DROP POLICY IF EXISTS "read images of active listings" ON public.listing_images;

-- Create the updated policy that allows viewing both active listings and your own listings
CREATE POLICY "read images of active listings"
  ON public.listing_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.listings
      WHERE id = listing_id
        AND (status = 'active' OR status = 'approved' OR user_id = auth.uid())
    )
  );

-- Verify the policy was created
SELECT * FROM pg_policies WHERE tablename = 'listing_images'; 