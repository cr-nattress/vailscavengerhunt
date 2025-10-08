-- Update Mountain Adventures Hunt to 5 Stops
-- This script reduces the winter-2025 hunt from 10 stops to 5 stops
-- Execute this in the Supabase SQL Editor

-- ============================================================================
-- 1. REMOVE UNUSED STOPS FROM HUNT CONFIGURATION
-- ============================================================================

-- Deactivate and remove stops 6-10 from the winter-2025 hunt
DELETE FROM hunt_configurations
WHERE organization_id = 'mountain-adventures'
  AND hunt_id = 'winter-2025'
  AND stop_id IN (
    'snowshoe-adventure-park',
    'ice-skating-rink',
    'wildlife-observation-point',
    'hot-springs-retreat',
    'summit-express-gondola'
  );

-- ============================================================================
-- 2. REMOVE UNUSED STOP DATA
-- ============================================================================

-- Delete the stop data for stops 6-10 (no longer needed)
DELETE FROM hunt_stops
WHERE stop_id IN (
  'snowshoe-adventure-park',
  'ice-skating-rink',
  'wildlife-observation-point',
  'hot-springs-retreat',
  'summit-express-gondola'
);

-- ============================================================================
-- 3. KEEP ONLY 5 STOPS
-- ============================================================================

-- The remaining 5 stops are:
-- 1. Mountain Peak Viewpoint (mountain-peak-viewpoint)
-- 2. Historic Mining Museum (historic-mining-museum)
-- 3. Frozen Waterfall Trail (frozen-waterfall-trail)
-- 4. Alpine Village Square (alpine-village-square)
-- 5. Cross-Country Ski Center (cross-country-ski-center)

-- No changes needed - these are already configured

-- ============================================================================
-- 4. VERIFICATION QUERIES
-- ============================================================================

-- Display remaining stops for this hunt
SELECT
    hc.default_order,
    hs.stop_id,
    hs.title,
    hs.clue,
    hc.is_active
FROM hunt_configurations hc
JOIN hunt_stops hs ON hc.stop_id = hs.stop_id
WHERE hc.organization_id = 'mountain-adventures' AND hc.hunt_id = 'winter-2025'
ORDER BY hc.default_order;

-- Display count
SELECT COUNT(*) as total_stops
FROM hunt_configurations
WHERE organization_id = 'mountain-adventures' AND hunt_id = 'winter-2025';

-- ============================================================================
-- COMPLETE!
-- ============================================================================
--
-- Summary:
--
-- Organization: Mountain Adventures Co. (mountain-adventures)
-- Hunt: Winter Adventure Hunt 2025 (winter-2025)
--
-- Teams (2):
--   1. Summit Seekers (SUMMIT2025)
--   2. Powder Pioneers (POWDER2025)
--
-- Stops (5):
--   1. Mountain Peak Viewpoint
--   2. Historic Mining Museum
--   3. Frozen Waterfall Trail
--   4. Alpine Village Square
--   5. Cross-Country Ski Center
--
-- Removed Stops (5):
--   6. Snowshoe Adventure Park
--   7. Ice Skating Rink
--   8. Wildlife Observation Point
--   9. Hot Springs Retreat
--   10. Summit Express Gondola
--
-- ============================================================================
