-- Replace hunt stops for a specific organization and hunt
-- Usage: Run in Supabase SQL Editor after reviewing org/hunt variables below
-- This script:
--  - Deletes existing hunt_configurations for the target hunt
--  - Upserts the provided stops into hunt_stops
--  - Inserts new hunt_configurations with default_order
--  - Ensures ordering is 'fixed'
--  - Re-initializes team progress for all teams in the target hunt

BEGIN;

-- Variables: set your target org and hunt here
DO $$
DECLARE
  v_org TEXT := 'bhhs';        -- change if needed
  v_hunt TEXT := 'fall-2025';  -- change if needed
BEGIN
  -- Safety: ensure org and hunt exist (create hunt if missing)
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = v_org) THEN
    RAISE EXCEPTION 'Organization % not found', v_org;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM hunts WHERE organization_id = v_org AND id = v_hunt
  ) THEN
    INSERT INTO hunts(id, organization_id, name, is_active)
    VALUES (v_hunt, v_org, initcap(replace(v_hunt, '-', ' ')), true)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- 1) Delete existing configurations for the target hunt
DELETE FROM hunt_configurations WHERE organization_id = 'bhhs' AND hunt_id = 'fall-2025';

-- 2) Upsert stops into hunt_stops
-- Helper: function to slugify provided location names inside SQL is verbose; we provide explicit stop_id values below
-- Provided list mapped to stop_id (kebab-case)
-- 1 Covered Bridge               -> covered-bridge
-- 2 Chair Lift                   -> chair-lift
-- 3 Gore Range                   -> gore-range
-- 4 Public Art / Sculpture       -> public-art-sculpture
-- 5 Water’s Edge                 -> waters-edge
-- 6 Skier                        -> skier
-- 7 Clock Tower                  -> clock-tower
-- 8 Berkshire Hathaway Office    -> bhhs-office
-- 9 On the Bus                   -> on-the-bus
-- 10 Four-Legged Friends         -> four-legged-friends

-- Upsert each stop with title, clue, hints (JSON array)
INSERT INTO hunt_stops (stop_id, title, description, clue, hints)
VALUES
  ('covered-bridge', 'Covered Bridge', NULL, 'The wooden crossing every skier knows.', '["Framed by alpine charm, it connects more than just paths.", "Everyone lines up here for the classic Vail photo — wood beams above, creek rushing below."]'),
  ('chair-lift', 'Chair Lift', NULL, 'Where empty chairs hang high, waiting for riders.', '["Suspended seats rising skyward, even when the snow is gone.", "Look toward the base where the ride into the mountains begins, cables stretching overhead."]'),
  ('gore-range', 'Gore Range', NULL, 'Find the Gore Range.', '["Look east where jagged peaks break the skyline.", "From the heart of the village, lift your gaze — the rugged horizon fills your view behind the shops."]'),
  ('public-art-sculpture', 'Public Art / Sculpture', NULL, 'Discover a piece of art.', '["Bronze and stone tell the stories of mountain life.", "A figure frozen in time stands in the plaza, admired by passersby and posed for photos."]'),
  ('waters-edge', 'Water’s Edge', NULL, 'In the heart of the village, discover where water brings life and movement.', '["Flowing quietly, yet everyone gathers nearby.", "Steps away from shops and patios, cool spray and rippling sound remind you that the mountains always flow through here."]'),
  ('skier', 'Skier', NULL, 'Find a skier carrying their skis or mid-run.', '["Frozen in motion, this skier never reaches the bottom.", "A permanent tribute to the sport — skis slung over shoulder, standing proudly in the village streets."]'),
  ('clock-tower', 'Clock Tower', NULL, 'A tower rises above the shops, keeping time at the center of it all.', '["Its face is always watching, even when you forget the hour.", "Look up where cobblestone paths meet — a peaked roof, tall windows, and hands circling round the face."]'),
  ('bhhs-office', 'Berkshire Hathaway Office', NULL, 'Where mountain life meets real estate — but only in the village center.', '["A trusted name in property, nestled among boutiques.", "Just steps from ski shops, a windowed office displays mountain homes and prices that make you stop and stare."]'),
  ('on-the-bus', 'On the Bus', NULL, 'Climb aboard Vail’s free ride.', '["Painted in blue and white, it loops through the village nonstop.", "Wait beneath the small shelters where crowds gather — soon doors will swing open and the ride is free."]'),
  ('four-legged-friends', 'Four-Legged Friends', NULL, 'Vail is full of four-legged friends — find one and learn its name.', '["Wagging tails and wet noses are everywhere on the cobblestones.", "Look near patios and benches — tails thump happily as owners sip coffee or chat."]')
ON CONFLICT (stop_id) DO UPDATE SET
  title = EXCLUDED.title,
  clue = EXCLUDED.clue,
  hints = EXCLUDED.hints,
  updated_at = NOW();

-- 3) Insert new configurations for BHHS hunt with fixed order
INSERT INTO hunt_configurations (organization_id, hunt_id, stop_id, is_active, default_order)
VALUES
  ('bhhs', 'fall-2025', 'covered-bridge', true, 1),
  ('bhhs', 'fall-2025', 'chair-lift', true, 2),
  ('bhhs', 'fall-2025', 'gore-range', true, 3),
  ('bhhs', 'fall-2025', 'public-art-sculpture', true, 4),
  ('bhhs', 'fall-2025', 'waters-edge', true, 5),
  ('bhhs', 'fall-2025', 'skier', true, 6),
  ('bhhs', 'fall-2025', 'clock-tower', true, 7),
  ('bhhs', 'fall-2025', 'bhhs-office', true, 8),
  ('bhhs', 'fall-2025', 'on-the-bus', true, 9),
  ('bhhs', 'fall-2025', 'four-legged-friends', true, 10)
ON CONFLICT (organization_id, hunt_id, stop_id) DO UPDATE SET
  is_active = EXCLUDED.is_active,
  default_order = EXCLUDED.default_order,
  updated_at = NOW();

-- 4) Ensure ordering strategy is fixed for this hunt
INSERT INTO hunt_ordering_config (organization_id, hunt_id, ordering_strategy)
VALUES ('bhhs', 'fall-2025', 'fixed')
ON CONFLICT (organization_id, hunt_id) DO UPDATE SET
  ordering_strategy = 'fixed',
  updated_at = NOW();

-- 5) Reinitialize team progress for all BHHS teams in this hunt
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN (
    SELECT id AS team_uuid
    FROM teams
    WHERE organization_id = 'bhhs' AND hunt_id = 'fall-2025'
  ) LOOP
    -- Remove existing progress entries for this team in this hunt
    DELETE FROM hunt_progress
    USING hunt_configurations hc
    WHERE hunt_progress.team_id = rec.team_uuid
      AND hc.organization_id = 'bhhs'
      AND hc.hunt_id = 'fall-2025'
      AND hunt_progress.location_id = hc.stop_id;

    -- Recreate initial progress rows for all active stops
    PERFORM initialize_team_for_hunt(rec.team_uuid, 'bhhs', 'fall-2025');
  END LOOP;
END $$;

-- 6) Summary of configured stops
RAISE NOTICE 'Configured % stops for %/%',
  (SELECT COUNT(*) FROM hunt_configurations WHERE organization_id = 'bhhs' AND hunt_id = 'fall-2025'),
  'bhhs', 'fall-2025';

COMMIT;
