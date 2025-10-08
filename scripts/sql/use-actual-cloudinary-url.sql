-- Use Actual Cloudinary Image URL
-- This is the CORRECT format for direct image URLs
-- Example: https://res.cloudinary.com/dfhxtcp4u/image/upload/v1758844338/scavenger/entries/d95bfb47-17f9-4356-a257-9fffcc950c0c/on-the-bus_1758844335786.jpg

-- ============================================================================
-- SOLUTION: Use This Single Image for All Stops (Testing)
-- ============================================================================

-- This will use the same image for all 10 stops to verify functionality works
UPDATE hunt_stops
SET pre_populated_image_url = 'https://res.cloudinary.com/dfhxtcp4u/image/upload/v1758844338/scavenger/entries/d95bfb47-17f9-4356-a257-9fffcc950c0c/on-the-bus_1758844335786.jpg',
    updated_at = NOW()
WHERE stop_id IN (
    'mountain-peak-viewpoint',
    'historic-mining-museum',
    'frozen-waterfall-trail',
    'alpine-village-square',
    'cross-country-ski-center',
    'snowshoe-adventure-park',
    'ice-skating-rink',
    'wildlife-observation-point',
    'hot-springs-retreat',
    'summit-express-gondola'
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT
  stop_id,
  title,
  SUBSTRING(pre_populated_image_url, 1, 80) || '...' as image_url_preview,
  CASE
    WHEN pre_populated_image_url LIKE 'https://res.cloudinary.com/dfhxtcp4u/image/upload/%' THEN '✅ Valid'
    ELSE '❌ Invalid'
  END as status
FROM hunt_stops
WHERE stop_id IN (
  SELECT stop_id FROM hunt_configurations
  WHERE organization_id = 'mountain-adventures' AND hunt_id = 'winter-2025'
)
ORDER BY stop_id;

-- Expected: All 10 rows show ✅ Valid

-- ============================================================================
-- TEST THE IMAGE URL IN BROWSER
-- ============================================================================

-- Copy and paste this URL in your browser to verify it loads:
-- https://res.cloudinary.com/dfhxtcp4u/image/upload/v1758844338/scavenger/entries/d95bfb47-17f9-4356-a257-9fffcc950c0c/on-the-bus_1758844335786.jpg

-- If the image loads in your browser, it will work in the app!

-- ============================================================================
-- NEXT STEPS: Use Different Images Per Stop
-- ============================================================================

/*
Once you confirm the single image works, you can add different images per stop:

1. Upload 10 images to Cloudinary folder: scavenger/mountain-adventures/winter-2025/

2. Get the URL for each image (format will be):
   https://res.cloudinary.com/dfhxtcp4u/image/upload/v{VERSION}/scavenger/mountain-adventures/winter-2025/{FILENAME}

3. Update each stop individually:

UPDATE hunt_stops SET pre_populated_image_url = 'https://res.cloudinary.com/dfhxtcp4u/image/upload/v1758844338/scavenger/mountain-adventures/winter-2025/mountain-peak.jpg' WHERE stop_id = 'mountain-peak-viewpoint';
UPDATE hunt_stops SET pre_populated_image_url = 'https://res.cloudinary.com/dfhxtcp4u/image/upload/v1758844338/scavenger/mountain-adventures/winter-2025/museum.jpg' WHERE stop_id = 'historic-mining-museum';
UPDATE hunt_stops SET pre_populated_image_url = 'https://res.cloudinary.com/dfhxtcp4u/image/upload/v1758844338/scavenger/mountain-adventures/winter-2025/waterfall.jpg' WHERE stop_id = 'frozen-waterfall-trail';
UPDATE hunt_stops SET pre_populated_image_url = 'https://res.cloudinary.com/dfhxtcp4u/image/upload/v1758844338/scavenger/mountain-adventures/winter-2025/village.jpg' WHERE stop_id = 'alpine-village-square';
UPDATE hunt_stops SET pre_populated_image_url = 'https://res.cloudinary.com/dfhxtcp4u/image/upload/v1758844338/scavenger/mountain-adventures/winter-2025/ski-center.jpg' WHERE stop_id = 'cross-country-ski-center';
UPDATE hunt_stops SET pre_populated_image_url = 'https://res.cloudinary.com/dfhxtcp4u/image/upload/v1758844338/scavenger/mountain-adventures/winter-2025/snowshoe.jpg' WHERE stop_id = 'snowshoe-adventure-park';
UPDATE hunt_stops SET pre_populated_image_url = 'https://res.cloudinary.com/dfhxtcp4u/image/upload/v1758844338/scavenger/mountain-adventures/winter-2025/ice-rink.jpg' WHERE stop_id = 'ice-skating-rink';
UPDATE hunt_stops SET pre_populated_image_url = 'https://res.cloudinary.com/dfhxtcp4u/image/upload/v1758844338/scavenger/mountain-adventures/winter-2025/wildlife.jpg' WHERE stop_id = 'wildlife-observation-point';
UPDATE hunt_stops SET pre_populated_image_url = 'https://res.cloudinary.com/dfhxtcp4u/image/upload/v1758844338/scavenger/mountain-adventures/winter-2025/hotspring.jpg' WHERE stop_id = 'hot-springs-retreat';
UPDATE hunt_stops SET pre_populated_image_url = 'https://res.cloudinary.com/dfhxtcp4u/image/upload/v1758844338/scavenger/mountain-adventures/winter-2025/gondola.jpg' WHERE stop_id = 'summit-express-gondola';
*/

-- ============================================================================
-- SUMMARY
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'PRE-POPULATED IMAGE URL UPDATE COMPLETE';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Cloud Name: dfhxtcp4u';
  RAISE NOTICE 'Image URL Format: https://res.cloudinary.com/dfhxtcp4u/image/upload/v{VERSION}/{PATH}/{FILENAME}';
  RAISE NOTICE '';
  RAISE NOTICE 'All 10 Mountain Adventures stops now use the same test image.';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Refresh your app';
  RAISE NOTICE '  2. Login with SUMMIT2025 or POWDER2025';
  RAISE NOTICE '  3. Verify images display (should show "on-the-bus" photo)';
  RAISE NOTICE '  4. Upload 10 unique images for each stop location';
  RAISE NOTICE '  5. Update database with individual image URLs';
  RAISE NOTICE '';
END $$;
