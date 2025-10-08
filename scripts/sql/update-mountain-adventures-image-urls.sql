-- Update Pre-Populated Image URLs for Mountain Adventures Hunt
-- Updates specific stops with new Cloudinary image URLs
-- Execute this in the Supabase SQL Editor

-- ============================================================================
-- UPDATE IMAGE URLS
-- ============================================================================

-- Update Stop 2: Historic Mining Museum
UPDATE hunt_stops
SET pre_populated_image_url = 'https://res.cloudinary.com/dfhxtcp4u/image/upload/v1758818988/scavenger/entries/skier_922dc05c-845f-45ea-b720-92e7a86edc04_1758818987892.jpg',
    updated_at = NOW()
WHERE stop_id = 'historic-mining-museum';

-- Update Stop 3: Frozen Waterfall Trail
UPDATE hunt_stops
SET pre_populated_image_url = 'https://res.cloudinary.com/dfhxtcp4u/image/upload/v1758688899/scavenger/entries/fc239f9d-019c-4fc6-b8c9-66278b1970ea/skier_1758688897960.jpg',
    updated_at = NOW()
WHERE stop_id = 'frozen-waterfall-trail';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Display updated image URLs for Mountain Adventures stops
SELECT
    hc.default_order,
    hs.stop_id,
    hs.title,
    SUBSTRING(hs.pre_populated_image_url, 1, 80) || '...' as image_url_preview,
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

-- ============================================================================
-- COMPLETE!
-- ============================================================================
--
-- Updated Image URLs:
--
-- Stop 2 (Historic Mining Museum):
--   https://res.cloudinary.com/dfhxtcp4u/image/upload/v1758818988/scavenger/entries/skier_922dc05c-845f-45ea-b720-92e7a86edc04_1758818987892.jpg
--
-- Stop 3 (Frozen Waterfall Trail):
--   https://res.cloudinary.com/dfhxtcp4u/image/upload/v1758688899/scavenger/entries/fc239f9d-019c-4fc6-b8c9-66278b1970ea/skier_1758688897960.jpg
--
-- ============================================================================
