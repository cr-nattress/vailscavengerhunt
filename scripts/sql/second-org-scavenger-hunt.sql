-- Second Organization Scavenger Hunt Setup
-- This script creates a second organization with a separate scavenger hunt,
-- 10 stops, 2 teams, and 2 team codes.
-- Execute this in the Supabase SQL Editor

-- ============================================================================
-- 1. CREATE ORGANIZATION
-- ============================================================================

INSERT INTO organizations (id, name) VALUES
  ('mountain-adventures', 'Mountain Adventures Co.')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = NOW();

-- ============================================================================
-- 2. CREATE HUNT
-- ============================================================================

INSERT INTO hunts (id, organization_id, name, start_date, end_date, is_active) VALUES
  ('winter-2025', 'mountain-adventures', 'Winter Adventure Hunt 2025', '2025-11-01', '2026-02-28', true)
ON CONFLICT (organization_id, id) DO UPDATE SET
  name = EXCLUDED.name,
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- ============================================================================
-- 3. CREATE HUNT STOPS (Master data for all possible stops)
-- ============================================================================

-- Insert 10 unique stops for this scavenger hunt
INSERT INTO hunt_stops (stop_id, title, description, clue, hints, position_lat, position_lng) VALUES
  -- Stop 1: Mountain Peak Viewpoint
  ('mountain-peak-viewpoint',
   'Mountain Peak Viewpoint',
   'Enjoy breathtaking panoramic views from the highest accessible point.',
   'Where eagles soar and clouds dance below, find the marker at the mountain''s crown where winter winds blow.',
   '["Look for the observation deck near the summit", "The marker is near the flagpole", "Take the gondola to reach this location"]',
   39.6403, -106.3742),

  -- Stop 2: Historic Mining Museum
  ('historic-mining-museum',
   'Historic Mining Museum',
   'Discover the rich mining heritage of the Rocky Mountains.',
   'Where picks and shovels tell tales of old, search near artifacts of silver and gold.',
   '["Located on Main Street downtown", "Look for the old mining cart outside", "The marker is next to the museum entrance"]',
   39.6395, -106.3750),

  -- Stop 3: Frozen Waterfall Trail
  ('frozen-waterfall-trail',
   'Frozen Waterfall Trail',
   'Witness nature''s winter artistry in cascading ice formations.',
   'Follow the path where water turns to ice, cascading crystals in a frozen paradise.',
   '["Take the East Vail trail system", "Look for ice climbers in winter", "The marker is at the base of the falls"]',
   39.6325, -106.3195),

  -- Stop 4: Alpine Village Square
  ('alpine-village-square',
   'Alpine Village Square',
   'The heart of the village with shops, dining, and entertainment.',
   'In the center where villagers meet, find the fountain on the cobblestone street.',
   '["Look for the central plaza", "The marker is near the clock tower", "Multiple shops surround this area"]',
   39.6405, -106.3745),

  -- Stop 5: Cross-Country Ski Center
  ('cross-country-ski-center',
   'Cross-Country Ski Center',
   'Nordic skiing paradise with groomed trails through pristine forests.',
   'Where tracks are groomed and Nordic skiers glide, find the lodge where warm drinks reside.',
   '["Located in the Nordic Valley", "Look for the rental shop", "The marker is by the trail map board"]',
   39.6280, -106.3580),

  -- Stop 6: Snowshoe Adventure Park
  ('snowshoe-adventure-park',
   'Snowshoe Adventure Park',
   'Explore winter wonderland trails perfect for snowshoeing.',
   'Strap on your shoes and trek through snow, find the marker where pine trees grow.',
   '["Start at the Adventure Ridge area", "Look for the snowshoe rental kiosk", "The marker is at the trailhead"]',
   39.6425, -106.3698),

  -- Stop 7: Ice Skating Rink
  ('ice-skating-rink',
   'Ice Skating Rink',
   'Glide across pristine ice surrounded by mountain majesty.',
   'Where blades meet ice and children spin, find the marker where winter fun begins.',
   '["Located in Lionshead Village", "The rink is open-air", "The marker is near the rental booth"]',
   39.6385, -106.3765),

  -- Stop 8: Wildlife Observation Point
  ('wildlife-observation-point',
   'Wildlife Observation Point',
   'Prime location for spotting elk, deer, and mountain wildlife.',
   'Through binoculars watch creatures roam free, find the marker beneath the tallest tree.',
   '["Follow the Gore Valley Trail", "Look for wildlife warning signs", "Best viewing at dawn or dusk"]',
   39.6450, -106.3520),

  -- Stop 9: Hot Springs Retreat
  ('hot-springs-retreat',
   'Hot Springs Retreat',
   'Relax in naturally heated mineral waters with mountain views.',
   'Where thermal waters bubble and steam, find serenity beside the mountain stream.',
   '["Located south of the main village", "Look for the spa entrance", "The marker is near the outdoor pools"]',
   39.6350, -106.3800),

  -- Stop 10: Summit Express Gondola
  ('summit-express-gondola',
   'Summit Express Gondola',
   'Ride to the top and experience spectacular alpine vistas.',
   'Ascend in comfort to heights sublime, find the marker where adventure meets sky-time.',
   '["The main gondola terminal", "Look for the ticket office", "The marker is at the base station"]',
   39.6400, -106.3735)
ON CONFLICT (stop_id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  clue = EXCLUDED.clue,
  hints = EXCLUDED.hints,
  position_lat = EXCLUDED.position_lat,
  position_lng = EXCLUDED.position_lng,
  updated_at = NOW();

-- ============================================================================
-- 4. CONFIGURE HUNT STOPS (Link stops to this specific hunt)
-- ============================================================================

-- Add all 10 stops to the winter-2025 hunt with fixed ordering
INSERT INTO hunt_configurations (organization_id, hunt_id, stop_id, is_active, default_order) VALUES
  ('mountain-adventures', 'winter-2025', 'mountain-peak-viewpoint', true, 1),
  ('mountain-adventures', 'winter-2025', 'historic-mining-museum', true, 2),
  ('mountain-adventures', 'winter-2025', 'frozen-waterfall-trail', true, 3),
  ('mountain-adventures', 'winter-2025', 'alpine-village-square', true, 4),
  ('mountain-adventures', 'winter-2025', 'cross-country-ski-center', true, 5),
  ('mountain-adventures', 'winter-2025', 'snowshoe-adventure-park', true, 6),
  ('mountain-adventures', 'winter-2025', 'ice-skating-rink', true, 7),
  ('mountain-adventures', 'winter-2025', 'wildlife-observation-point', true, 8),
  ('mountain-adventures', 'winter-2025', 'hot-springs-retreat', true, 9),
  ('mountain-adventures', 'winter-2025', 'summit-express-gondola', true, 10)
ON CONFLICT (organization_id, hunt_id, stop_id) DO UPDATE SET
  is_active = EXCLUDED.is_active,
  default_order = EXCLUDED.default_order,
  updated_at = NOW();

-- ============================================================================
-- 5. SET HUNT ORDERING STRATEGY
-- ============================================================================

-- Configure this hunt to use fixed ordering (not randomized)
INSERT INTO hunt_ordering_config (organization_id, hunt_id, ordering_strategy, seed_strategy) VALUES
  ('mountain-adventures', 'winter-2025', 'fixed', 'team_based')
ON CONFLICT (organization_id, hunt_id) DO UPDATE SET
  ordering_strategy = EXCLUDED.ordering_strategy,
  seed_strategy = EXCLUDED.seed_strategy,
  updated_at = NOW();

-- ============================================================================
-- 6. CREATE TEAMS
-- ============================================================================

-- Create 2 teams for this hunt
INSERT INTO teams (team_id, organization_id, hunt_id, name, display_name, score) VALUES
  ('summit-seekers', 'mountain-adventures', 'winter-2025', 'summit-seekers', 'Summit Seekers', 0),
  ('powder-pioneers', 'mountain-adventures', 'winter-2025', 'powder-pioneers', 'Powder Pioneers', 0)
ON CONFLICT (organization_id, team_id, hunt_id) DO UPDATE SET
  name = EXCLUDED.name,
  display_name = EXCLUDED.display_name,
  updated_at = NOW();

-- ============================================================================
-- 7. CREATE TEAM CODES
-- ============================================================================

-- Create team codes for each team
DO $$
DECLARE
    summit_team_id UUID;
    powder_team_id UUID;
BEGIN
    -- Get team UUIDs
    SELECT id INTO summit_team_id FROM teams
    WHERE organization_id = 'mountain-adventures'
      AND team_id = 'summit-seekers'
      AND hunt_id = 'winter-2025';

    SELECT id INTO powder_team_id FROM teams
    WHERE organization_id = 'mountain-adventures'
      AND team_id = 'powder-pioneers'
      AND hunt_id = 'winter-2025';

    -- Insert team codes
    INSERT INTO team_codes (code, team_id, organization_id, hunt_id, is_active, max_uses)
    VALUES
      ('SUMMIT2025', summit_team_id, 'mountain-adventures', 'winter-2025', true, NULL),
      ('POWDER2025', powder_team_id, 'mountain-adventures', 'winter-2025', true, NULL)
    ON CONFLICT (code) DO UPDATE SET
      team_id = EXCLUDED.team_id,
      is_active = EXCLUDED.is_active;
END $$;

-- ============================================================================
-- 8. INITIALIZE TEAM SETTINGS (Optional)
-- ============================================================================

-- Create default settings for each team
DO $$
DECLARE
    team_record RECORD;
    sample_session_id UUID;
BEGIN
    sample_session_id := uuid_generate_v4();

    FOR team_record IN
        SELECT id, team_id, organization_id, hunt_id
        FROM teams
        WHERE organization_id = 'mountain-adventures' AND hunt_id = 'winter-2025'
    LOOP
        INSERT INTO settings (team_id, organization_id, hunt_id, location_name, event_name, config)
        VALUES (
            team_record.id,
            team_record.organization_id,
            team_record.hunt_id,
            'Mountain Adventures',
            'Winter Hunt 2025',
            jsonb_build_object(
                'sessionId', sample_session_id::text,
                'teamName', team_record.team_id,
                'locationName', 'Mountain Adventures',
                'eventName', 'Winter Hunt 2025',
                'organizationId', team_record.organization_id,
                'huntId', team_record.hunt_id
            )
        )
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;

-- ============================================================================
-- 9. VERIFICATION QUERIES
-- ============================================================================

-- Display summary of created data
SELECT
    'Organizations' as table_name,
    COUNT(*)::TEXT as record_count
FROM organizations
WHERE id = 'mountain-adventures'

UNION ALL

SELECT
    'Hunts' as table_name,
    COUNT(*)::TEXT as record_count
FROM hunts
WHERE organization_id = 'mountain-adventures'

UNION ALL

SELECT
    'Hunt Stops' as table_name,
    COUNT(*)::TEXT as record_count
FROM hunt_stops
WHERE stop_id IN (
    SELECT stop_id FROM hunt_configurations
    WHERE organization_id = 'mountain-adventures' AND hunt_id = 'winter-2025'
)

UNION ALL

SELECT
    'Hunt Configurations' as table_name,
    COUNT(*)::TEXT as record_count
FROM hunt_configurations
WHERE organization_id = 'mountain-adventures' AND hunt_id = 'winter-2025'

UNION ALL

SELECT
    'Teams' as table_name,
    COUNT(*)::TEXT as record_count
FROM teams
WHERE organization_id = 'mountain-adventures' AND hunt_id = 'winter-2025'

UNION ALL

SELECT
    'Team Codes' as table_name,
    COUNT(*)::TEXT as record_count
FROM team_codes
WHERE organization_id = 'mountain-adventures' AND hunt_id = 'winter-2025'

UNION ALL

SELECT
    'Settings' as table_name,
    COUNT(*)::TEXT as record_count
FROM settings
WHERE organization_id = 'mountain-adventures' AND hunt_id = 'winter-2025'

ORDER BY table_name;

-- Display team codes for reference
SELECT
    tc.code as team_code,
    t.display_name as team_name,
    t.organization_id,
    t.hunt_id,
    tc.is_active
FROM team_codes tc
JOIN teams t ON tc.team_id = t.id
WHERE t.organization_id = 'mountain-adventures' AND t.hunt_id = 'winter-2025'
ORDER BY tc.code;

-- Display all stops for this hunt
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

-- ============================================================================
-- COMPLETE!
-- ============================================================================
--
-- Summary of what was created:
--
-- Organization: Mountain Adventures Co. (mountain-adventures)
-- Hunt: Winter Adventure Hunt 2025 (winter-2025)
--   - Start Date: November 1, 2025
--   - End Date: February 28, 2026
--   - Ordering Strategy: Fixed (sequential order)
--
-- Teams (2):
--   1. Summit Seekers (SUMMIT2025)
--   2. Powder Pioneers (POWDER2025)
--
-- Stops (10):
--   1. Mountain Peak Viewpoint
--   2. Historic Mining Museum
--   3. Frozen Waterfall Trail
--   4. Alpine Village Square
--   5. Cross-Country Ski Center
--   6. Snowshoe Adventure Park
--   7. Ice Skating Rink
--   8. Wildlife Observation Point
--   9. Hot Springs Retreat
--   10. Summit Express Gondola
--
-- All teams have default settings initialized and are ready to participate!
--
-- ============================================================================
