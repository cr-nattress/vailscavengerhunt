-- Verify Stop Order Mapping
-- Shows which stop_id corresponds to which step number
-- Execute this in the Supabase SQL Editor

SELECT
    hc.default_order as step_number,
    hs.stop_id,
    hs.title as current_title,
    CASE hc.default_order
        WHEN 1 THEN 'The Soft Start'
        WHEN 2 THEN 'The Hidden Confidence'
        WHEN 3 THEN 'The Step of Grace'
        WHEN 4 THEN 'The Star of the Show'
        WHEN 5 THEN 'The Finishing Touch'
    END as should_be_title,
    CASE hc.default_order
        WHEN 1 THEN 't-shirt'
        WHEN 2 THEN 'confident set'
        WHEN 3 THEN 'heels'
        WHEN 4 THEN 'cowboy hat'
        WHEN 5 THEN 'perfume'
    END as should_be_about
FROM hunt_configurations hc
JOIN hunt_stops hs ON hc.stop_id = hs.stop_id
WHERE hc.organization_id = 'mountain-adventures'
  AND hc.hunt_id = 'winter-2025'
ORDER BY hc.default_order;
