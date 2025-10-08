-- Update Image URLs for Steps 4 and 5
-- Sets unique images for Alpine Village Square and Cross-Country Ski Center
-- Execute this in the Supabase SQL Editor

-- ============================================================================
-- UPDATE STEPS 4 AND 5 WITH UNIQUE IMAGES
-- ============================================================================

-- Step 4: Alpine Village Square (covered-bridge image)
UPDATE hunt_stops
SET pre_populated_image_url = 'https://res.cloudinary.com/dfhxtcp4u/image/upload/v1757264448/scavenger/entries/1ae2ee28-d7a3-47e1-b391-43d476658296/covered-bridge_1757264447939.jpg',
    updated_at = NOW()
WHERE stop_id = 'alpine-village-square';

-- Step 5: Cross-Country Ski Center (slope-side-living image)
UPDATE hunt_stops
SET pre_populated_image_url = 'https://res.cloudinary.com/dfhxtcp4u/image/upload/v1757264240/scavenger/entries/1ae2ee28-d7a3-47e1-b391-43d476658296/slope-side-living_1757264238821.jpg',
    updated_at = NOW()
WHERE stop_id = 'cross-country-ski-center';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Display all 5 stops with their final image URLs
SELECT
    hc.default_order as step,
    hs.stop_id,
    hs.title,
    CASE hc.default_order
        WHEN 1 THEN 'on-the-bus'
        WHEN 2 THEN 'skier #1'
        WHEN 3 THEN 'skier #2'
        WHEN 4 THEN 'covered-bridge'
        WHEN 5 THEN 'slope-side-living'
    END as image_name,
    SUBSTRING(hs.pre_populated_image_url, 1, 90) || '...' as image_url_preview,
    CASE
        WHEN hs.pre_populated_image_url LIKE 'https://res.cloudinary.com/dfhxtcp4u/image/upload/%' THEN '✅ Valid'
        WHEN hs.pre_populated_image_url IS NULL THEN '⚠️ No Image'
        ELSE '❌ Invalid'
    END as status
FROM hunt_configurations hc
JOIN hunt_stops hs ON hc.stop_id = hs.stop_id
WHERE hc.organization_id = 'mountain-adventures'
  AND hc.hunt_id = 'winter-2025'
ORDER BY hc.default_order;

-- Expected: 5 stops, all showing ✅ Valid, each with unique image name

-- ============================================================================
-- COMPLETE!
-- ============================================================================
--
-- Final image assignments (all unique):
--
-- Step 1 (Mountain Peak Viewpoint):     on-the-bus
-- Step 2 (Historic Mining Museum):      skier #1
-- Step 3 (Frozen Waterfall Trail):      skier #2
-- Step 4 (Alpine Village Square):       covered-bridge
-- Step 5 (Cross-Country Ski Center):    slope-side-living
--
-- All 5 stops now have unique images!
--
-- ============================================================================
