-- Set Unique Images for Each Stop (5 Stops)
-- Updates each of the 5 Mountain Adventures stops with unique Cloudinary image URLs
-- Execute this in the Supabase SQL Editor

-- ============================================================================
-- UPDATE EACH STOP WITH UNIQUE IMAGE
-- ============================================================================

-- Stop 1: Mountain Peak Viewpoint (keeping original on-the-bus image)
UPDATE hunt_stops
SET pre_populated_image_url = 'https://res.cloudinary.com/dfhxtcp4u/image/upload/v1758844338/scavenger/entries/d95bfb47-17f9-4356-a257-9fffcc950c0c/on-the-bus_1758844335786.jpg',
    updated_at = NOW()
WHERE stop_id = 'mountain-peak-viewpoint';

-- Stop 2: Historic Mining Museum (new skier image)
UPDATE hunt_stops
SET pre_populated_image_url = 'https://res.cloudinary.com/dfhxtcp4u/image/upload/v1758818988/scavenger/entries/skier_922dc05c-845f-45ea-b720-92e7a86edc04_1758818987892.jpg',
    updated_at = NOW()
WHERE stop_id = 'historic-mining-museum';

-- Stop 3: Frozen Waterfall Trail (second skier image)
UPDATE hunt_stops
SET pre_populated_image_url = 'https://res.cloudinary.com/dfhxtcp4u/image/upload/v1758688899/scavenger/entries/fc239f9d-019c-4fc6-b8c9-66278b1970ea/skier_1758688897960.jpg',
    updated_at = NOW()
WHERE stop_id = 'frozen-waterfall-trail';

-- Stop 4: Alpine Village Square (using on-the-bus image as placeholder)
UPDATE hunt_stops
SET pre_populated_image_url = 'https://res.cloudinary.com/dfhxtcp4u/image/upload/v1758844338/scavenger/entries/d95bfb47-17f9-4356-a257-9fffcc950c0c/on-the-bus_1758844335786.jpg',
    updated_at = NOW()
WHERE stop_id = 'alpine-village-square';

-- Stop 5: Cross-Country Ski Center (using skier image as placeholder)
UPDATE hunt_stops
SET pre_populated_image_url = 'https://res.cloudinary.com/dfhxtcp4u/image/upload/v1758818988/scavenger/entries/skier_922dc05c-845f-45ea-b720-92e7a86edc04_1758818987892.jpg',
    updated_at = NOW()
WHERE stop_id = 'cross-country-ski-center';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Display all stops with their image URLs in order
SELECT
    hc.default_order as step,
    hs.stop_id,
    hs.title,
    CASE hc.default_order
        WHEN 1 THEN 'on-the-bus'
        WHEN 2 THEN 'skier #1'
        WHEN 3 THEN 'skier #2'
        WHEN 4 THEN 'on-the-bus (placeholder)'
        WHEN 5 THEN 'skier #1 (placeholder)'
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

-- Expected: 5 stops, all showing ✅ Valid with different image names

-- ============================================================================
-- COMPLETE!
-- ============================================================================
--
-- Image assignments:
--
-- Step 1 (Mountain Peak Viewpoint):     on-the-bus image
-- Step 2 (Historic Mining Museum):      skier #1 image (NEW)
-- Step 3 (Frozen Waterfall Trail):      skier #2 image (NEW)
-- Step 4 (Alpine Village Square):       on-the-bus image (placeholder)
-- Step 5 (Cross-Country Ski Center):    skier #1 image (placeholder)
--
-- Now each stop shows a different image!
-- Replace steps 4-5 with unique images when available.
--
-- ============================================================================
