-- Update Mountain Adventures Hunt to Use Numbered Images
-- Updates all 5 stops with numbered image URLs (num-1 through num-5)
-- Execute this in the Supabase SQL Editor

-- ============================================================================
-- UPDATE ALL STOPS WITH NUMBERED IMAGES
-- ============================================================================

-- Step 1: Mountain Peak Viewpoint (num-1)
UPDATE hunt_stops
SET pre_populated_image_url = 'https://res.cloudinary.com/dfhxtcp4u/image/upload/v1759892803/num-1_erztjr.jpg',
    updated_at = NOW()
WHERE stop_id = 'mountain-peak-viewpoint';

-- Step 2: Historic Mining Museum (num-2)
UPDATE hunt_stops
SET pre_populated_image_url = 'https://res.cloudinary.com/dfhxtcp4u/image/upload/v1759892801/num-2_bpicvq.jpg',
    updated_at = NOW()
WHERE stop_id = 'historic-mining-museum';

-- Step 3: Frozen Waterfall Trail (num-3)
UPDATE hunt_stops
SET pre_populated_image_url = 'https://res.cloudinary.com/dfhxtcp4u/image/upload/v1759892803/num-3_cbopzi.jpg',
    updated_at = NOW()
WHERE stop_id = 'frozen-waterfall-trail';

-- Step 4: Alpine Village Square (num-4)
UPDATE hunt_stops
SET pre_populated_image_url = 'https://res.cloudinary.com/dfhxtcp4u/image/upload/v1759892797/num-4_k4r43b.jpg',
    updated_at = NOW()
WHERE stop_id = 'alpine-village-square';

-- Step 5: Cross-Country Ski Center (num-5)
UPDATE hunt_stops
SET pre_populated_image_url = 'https://res.cloudinary.com/dfhxtcp4u/image/upload/v1759892797/num-5_yndsbr.jpg',
    updated_at = NOW()
WHERE stop_id = 'cross-country-ski-center';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Display all stops with their numbered images
SELECT
    hc.default_order as step,
    hs.stop_id,
    hs.title,
    CASE hc.default_order
        WHEN 1 THEN 'num-1'
        WHEN 2 THEN 'num-2'
        WHEN 3 THEN 'num-3'
        WHEN 4 THEN 'num-4'
        WHEN 5 THEN 'num-5'
    END as expected_image,
    CASE
        WHEN hs.pre_populated_image_url LIKE '%num-1%' THEN 'num-1'
        WHEN hs.pre_populated_image_url LIKE '%num-2%' THEN 'num-2'
        WHEN hs.pre_populated_image_url LIKE '%num-3%' THEN 'num-3'
        WHEN hs.pre_populated_image_url LIKE '%num-4%' THEN 'num-4'
        WHEN hs.pre_populated_image_url LIKE '%num-5%' THEN 'num-5'
        ELSE 'unknown'
    END as actual_image,
    hs.pre_populated_image_url,
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

-- Expected: 5 stops, all showing ✅ Valid, with matching expected_image and actual_image

-- ============================================================================
-- COMPLETE!
-- ============================================================================
--
-- Updated image assignments:
--
-- Step 1 (Mountain Peak Viewpoint):     num-1_erztjr.jpg
-- Step 2 (Historic Mining Museum):      num-2_bpicvq.jpg
-- Step 3 (Frozen Waterfall Trail):      num-3_cbopzi.jpg
-- Step 4 (Alpine Village Square):       num-4_k4r43b.jpg
-- Step 5 (Cross-Country Ski Center):    num-5_yndsbr.jpg
--
-- All steps now use numbered images that match their step order!
--
-- ============================================================================
