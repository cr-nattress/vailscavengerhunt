-- Inspect Mountain Adventures Hunt Stops
-- Shows complete configuration for all stops
-- Execute this in the Supabase SQL Editor

-- ============================================================================
-- DISPLAY ALL STOP DETAILS
-- ============================================================================

SELECT
    hc.default_order as step,
    hs.stop_id,
    hs.title,
    hs.clue,
    hs.hints,
    CASE hc.default_order
        WHEN 1 THEN 'on-the-bus'
        WHEN 2 THEN 'skier #1'
        WHEN 3 THEN 'skier #2'
        WHEN 4 THEN 'covered-bridge'
        WHEN 5 THEN 'slope-side-living'
    END as expected_image,
    SUBSTRING(hs.pre_populated_image_url, 50, 50) as image_filename_part,
    CASE
        WHEN hs.pre_populated_image_url LIKE '%on-the-bus%' THEN 'on-the-bus'
        WHEN hs.pre_populated_image_url LIKE '%skier%922dc05c%' THEN 'skier #1'
        WHEN hs.pre_populated_image_url LIKE '%skier%fc239f9d%' THEN 'skier #2'
        WHEN hs.pre_populated_image_url LIKE '%covered-bridge%' THEN 'covered-bridge'
        WHEN hs.pre_populated_image_url LIKE '%slope-side-living%' THEN 'slope-side-living'
        ELSE 'unknown'
    END as actual_image
FROM hunt_configurations hc
JOIN hunt_stops hs ON hc.stop_id = hs.stop_id
WHERE hc.organization_id = 'mountain-adventures'
  AND hc.hunt_id = 'winter-2025'
ORDER BY hc.default_order;

-- ============================================================================
-- SHOW FULL DETAILS FOR EACH STOP
-- ============================================================================

SELECT
    hc.default_order as step,
    '================================' as separator,
    hs.stop_id,
    hs.title,
    hs.description,
    hs.clue,
    hs.hints,
    hs.pre_populated_image_url
FROM hunt_configurations hc
JOIN hunt_stops hs ON hc.stop_id = hs.stop_id
WHERE hc.organization_id = 'mountain-adventures'
  AND hc.hunt_id = 'winter-2025'
ORDER BY hc.default_order;
