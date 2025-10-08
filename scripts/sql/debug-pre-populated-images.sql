-- Debug Script: Troubleshoot Pre-Populated Images Not Showing
-- Run this in Supabase SQL Editor to diagnose the issue

-- ============================================================================
-- STEP 1: Verify pre_populated_image_url column exists
-- ============================================================================

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'hunt_stops'
  AND column_name = 'pre_populated_image_url';

-- Expected: 1 row showing the column exists
-- If no rows: Run complete-multi-org-setup.sql first

-- ============================================================================
-- STEP 2: Check if Mountain Adventures stops have image URLs
-- ============================================================================

SELECT
  hs.stop_id,
  hs.title,
  hs.pre_populated_image_url,
  LENGTH(hs.pre_populated_image_url) as url_length,
  CASE
    WHEN hs.pre_populated_image_url IS NULL THEN '❌ NULL'
    WHEN hs.pre_populated_image_url = '' THEN '❌ EMPTY'
    ELSE '✅ HAS URL'
  END as status
FROM hunt_stops hs
WHERE hs.stop_id IN (
  SELECT stop_id
  FROM hunt_configurations
  WHERE organization_id = 'mountain-adventures'
    AND hunt_id = 'winter-2025'
)
ORDER BY hs.stop_id;

-- Expected: 10 rows, all with '✅ HAS URL'
-- If NULL or EMPTY: Run enable-pre-populated-images.sql

-- ============================================================================
-- STEP 3: Test the get_hunt_stops() function
-- ============================================================================

SELECT
  stop_id,
  title,
  pre_populated_image_url,
  step_order
FROM get_hunt_stops('mountain-adventures', 'winter-2025', NULL)
ORDER BY step_order;

-- Expected: 10 rows with pre_populated_image_url populated
-- If error: Function doesn't exist or has wrong signature
-- If NULL pre_populated_image_url: Function not returning the field

-- ============================================================================
-- STEP 4: Check hunt photo_mode setting
-- ============================================================================

SELECT
  organization_id,
  id as hunt_id,
  name,
  photo_mode,
  CASE
    WHEN photo_mode = 'pre_populated' THEN '✅ Pre-populated mode enabled'
    WHEN photo_mode = 'upload' THEN '⚠️ Upload mode (images won\'t show)'
    ELSE '❌ NULL or invalid'
  END as status
FROM hunts
WHERE organization_id = 'mountain-adventures'
  AND id = 'winter-2025';

-- Expected: photo_mode = 'pre_populated'
-- If 'upload': Run enable-pre-populated-images.sql

-- ============================================================================
-- STEP 5: Verify hunt_configurations link stops to hunt
-- ============================================================================

SELECT
  hc.organization_id,
  hc.hunt_id,
  hc.stop_id,
  hc.default_order,
  hc.is_active,
  hs.title,
  hs.pre_populated_image_url IS NOT NULL as has_image_url
FROM hunt_configurations hc
JOIN hunt_stops hs ON hc.stop_id = hs.stop_id
WHERE hc.organization_id = 'mountain-adventures'
  AND hc.hunt_id = 'winter-2025'
  AND hc.is_active = true
ORDER BY hc.default_order;

-- Expected: 10 rows, all with has_image_url = true

-- ============================================================================
-- STEP 6: Check sample image URL
-- ============================================================================

SELECT
  stop_id,
  title,
  pre_populated_image_url,
  CASE
    WHEN pre_populated_image_url LIKE 'https://%' THEN '✅ Valid HTTPS URL'
    WHEN pre_populated_image_url LIKE 'http://%' THEN '⚠️ HTTP URL (might be blocked)'
    ELSE '❌ Invalid URL format'
  END as url_validation
FROM hunt_stops
WHERE stop_id = 'mountain-peak-viewpoint';

-- Expected: Valid HTTPS URL
-- Copy the URL and test in browser

-- ============================================================================
-- DIAGNOSTICS SUMMARY
-- ============================================================================

DO $$
DECLARE
  column_exists BOOLEAN;
  stops_with_urls INTEGER;
  hunt_mode TEXT;
BEGIN
  -- Check if column exists
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'hunt_stops'
      AND column_name = 'pre_populated_image_url'
  ) INTO column_exists;

  -- Count stops with URLs
  SELECT COUNT(*)
  INTO stops_with_urls
  FROM hunt_stops hs
  WHERE hs.stop_id IN (
    SELECT stop_id
    FROM hunt_configurations
    WHERE organization_id = 'mountain-adventures'
      AND hunt_id = 'winter-2025'
  )
  AND hs.pre_populated_image_url IS NOT NULL
  AND hs.pre_populated_image_url != '';

  -- Get hunt mode
  SELECT photo_mode
  INTO hunt_mode
  FROM hunts
  WHERE organization_id = 'mountain-adventures'
    AND id = 'winter-2025';

  RAISE NOTICE '============================================================';
  RAISE NOTICE 'PRE-POPULATED IMAGES DIAGNOSTIC REPORT';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Column Exists: %', CASE WHEN column_exists THEN '✅ YES' ELSE '❌ NO - Run complete-multi-org-setup.sql' END;
  RAISE NOTICE 'Stops with URLs: % / 10', stops_with_urls;
  RAISE NOTICE 'Hunt Photo Mode: %', COALESCE(hunt_mode, 'NULL');
  RAISE NOTICE '';
  RAISE NOTICE 'Status:';

  IF NOT column_exists THEN
    RAISE NOTICE '  ❌ PROBLEM: pre_populated_image_url column missing';
    RAISE NOTICE '  → Run: scripts/sql/complete-multi-org-setup.sql';
  ELSIF stops_with_urls < 10 THEN
    RAISE NOTICE '  ❌ PROBLEM: Only % stops have image URLs', stops_with_urls;
    RAISE NOTICE '  → Run: scripts/sql/enable-pre-populated-images.sql';
  ELSIF hunt_mode IS NULL OR hunt_mode != 'pre_populated' THEN
    RAISE NOTICE '  ❌ PROBLEM: Hunt mode is ''%'', should be ''pre_populated''', COALESCE(hunt_mode, 'NULL');
    RAISE NOTICE '  → Run: scripts/sql/enable-pre-populated-images.sql';
  ELSE
    RAISE NOTICE '  ✅ Database configuration looks correct';
    RAISE NOTICE '  → Check API response and frontend code';
  END IF;

  RAISE NOTICE '';
END $$;

-- ============================================================================
-- QUICK FIX COMMANDS (if needed)
-- ============================================================================

-- If column doesn't exist, run this:
/*
ALTER TABLE hunt_stops
ADD COLUMN pre_populated_image_url TEXT;
*/

-- If URLs are missing, run this:
/*
UPDATE hunt_stops
SET pre_populated_image_url = 'https://photos.app.goo.gl/nBDjjNVW9ooZL2Mo6'
WHERE stop_id IN (
  SELECT stop_id FROM hunt_configurations
  WHERE organization_id = 'mountain-adventures' AND hunt_id = 'winter-2025'
);
*/

-- If photo_mode is wrong, run this:
/*
UPDATE hunts
SET photo_mode = 'pre_populated'
WHERE organization_id = 'mountain-adventures' AND id = 'winter-2025';
*/

-- ============================================================================
-- NEXT STEPS FOR TROUBLESHOOTING
-- ============================================================================

/*
If database is correct but images still not showing:

1. CHECK API RESPONSE
   curl "https://your-app.netlify.app/api/consolidated/active/mountain-adventures/summit-seekers/winter-2025"

   Look for:
   - "locations": { "locations": [ ... ] }
   - Each location should have "pre_populated_image_url" field

2. CHECK BROWSER CONSOLE
   - Open DevTools (F12)
   - Console tab
   - Look for errors loading images
   - Network tab → Check if image URL is being requested

3. CHECK IMAGE URL DIRECTLY
   - Copy pre_populated_image_url from database
   - Paste in browser
   - If it doesn't load, URL is invalid or blocked

4. COMMON ISSUES:
   - Google Photos URLs may require authentication
   - CORS issues with image hosting
   - URL expired or changed
   - Network blocking external images

5. SOLUTION:
   - Upload images to Cloudinary
   - Update URLs in database:
     UPDATE hunt_stops
     SET pre_populated_image_url = 'https://res.cloudinary.com/...'
     WHERE stop_id = 'mountain-peak-viewpoint';
*/
