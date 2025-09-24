-- Enhanced Hunt System Schema for Configurable Stops and Ordering
-- Execute this AFTER the main schema setup

-- Drop existing views that depend on hunt_progress
DROP VIEW IF EXISTS leaderboard;
DROP VIEW IF EXISTS progress_analytics;
DROP VIEW IF EXISTS active_teams_with_progress;

-- Create hunt_stops table (master data for all possible stops)
CREATE TABLE IF NOT EXISTS hunt_stops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stop_id TEXT NOT NULL, -- e.g., "covered-bridge", "international-bridge"
  title TEXT NOT NULL,
  description TEXT,
  clue TEXT NOT NULL,
  hints JSONB DEFAULT '[]', -- Array of hint strings
  position_lat DECIMAL,
  position_lng DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(stop_id)
);

-- Create hunt_configurations table (defines which stops are in each hunt)
CREATE TABLE IF NOT EXISTS hunt_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  hunt_id TEXT NOT NULL,
  stop_id TEXT REFERENCES hunt_stops(stop_id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  default_order INTEGER, -- Default order if not randomized
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (organization_id, hunt_id) REFERENCES hunts(organization_id, id),
  UNIQUE(organization_id, hunt_id, stop_id)
);

-- Create hunt_ordering_config table (defines ordering strategy per hunt)
CREATE TABLE IF NOT EXISTS hunt_ordering_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  hunt_id TEXT NOT NULL,
  ordering_strategy TEXT NOT NULL CHECK (ordering_strategy IN ('fixed', 'randomized')),
  seed_strategy TEXT NOT NULL DEFAULT 'team_based' CHECK (seed_strategy IN ('team_based', 'global')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (organization_id, hunt_id) REFERENCES hunts(organization_id, id),
  UNIQUE(organization_id, hunt_id)
);

-- Create team_stop_orders table (stores randomized order per team if needed)
CREATE TABLE IF NOT EXISTS team_stop_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  stop_id TEXT REFERENCES hunt_stops(stop_id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, stop_id),
  UNIQUE(team_id, step_order)
);

-- Update hunt_progress to reference hunt_stops
ALTER TABLE hunt_progress DROP CONSTRAINT IF EXISTS hunt_progress_location_id_key;
ALTER TABLE hunt_progress DROP CONSTRAINT IF EXISTS hunt_progress_team_id_location_id_key;
ALTER TABLE hunt_progress ADD CONSTRAINT hunt_progress_team_id_stop_id_key UNIQUE(team_id, location_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_hunt_configurations_org_hunt ON hunt_configurations(organization_id, hunt_id);
CREATE INDEX IF NOT EXISTS idx_hunt_configurations_stop ON hunt_configurations(stop_id);
CREATE INDEX IF NOT EXISTS idx_team_stop_orders_team ON team_stop_orders(team_id);
CREATE INDEX IF NOT EXISTS idx_team_stop_orders_order ON team_stop_orders(team_id, step_order);
CREATE INDEX IF NOT EXISTS idx_hunt_stops_stop_id ON hunt_stops(stop_id);

-- Function to get stops for a specific hunt in order
CREATE OR REPLACE FUNCTION get_hunt_stops(
  p_organization_id TEXT,
  p_hunt_id TEXT,
  p_team_id UUID DEFAULT NULL
)
RETURNS TABLE (
  stop_id TEXT,
  title TEXT,
  description TEXT,
  clue TEXT,
  hints JSONB,
  position_lat DECIMAL,
  position_lng DECIMAL,
  step_order INTEGER,
  is_completed BOOLEAN
) AS $$
DECLARE
  ordering_strategy TEXT;
BEGIN
  -- Get the ordering strategy for this hunt
  SELECT hoc.ordering_strategy INTO ordering_strategy
  FROM hunt_ordering_config hoc
  WHERE hoc.organization_id = p_organization_id AND hoc.hunt_id = p_hunt_id;

  -- If no ordering config found, default to fixed
  IF ordering_strategy IS NULL THEN
    ordering_strategy := 'fixed';
  END IF;

  -- Return stops based on ordering strategy
  IF ordering_strategy = 'fixed' THEN
    -- Use default order from hunt_configurations
    RETURN QUERY
    SELECT
      hs.stop_id,
      hs.title,
      hs.description,
      hs.clue,
      hs.hints,
      hs.position_lat,
      hs.position_lng,
      hc.default_order as step_order,
      COALESCE(hp.done, false) as is_completed
    FROM hunt_configurations hc
    JOIN hunt_stops hs ON hc.stop_id = hs.stop_id
    LEFT JOIN hunt_progress hp ON hp.team_id = p_team_id AND hp.location_id = hs.stop_id
    WHERE hc.organization_id = p_organization_id
      AND hc.hunt_id = p_hunt_id
      AND hc.is_active = true
    ORDER BY hc.default_order ASC;
  ELSE
    -- Use randomized order from team_stop_orders
    RETURN QUERY
    SELECT
      hs.stop_id,
      hs.title,
      hs.description,
      hs.clue,
      hs.hints,
      hs.position_lat,
      hs.position_lng,
      tso.step_order,
      COALESCE(hp.done, false) as is_completed
    FROM team_stop_orders tso
    JOIN hunt_stops hs ON tso.stop_id = hs.stop_id
    LEFT JOIN hunt_progress hp ON hp.team_id = p_team_id AND hp.location_id = hs.stop_id
    WHERE tso.team_id = p_team_id
    ORDER BY tso.step_order ASC;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to generate randomized stop order for a team
CREATE OR REPLACE FUNCTION generate_team_stop_order(
  p_team_id UUID,
  p_organization_id TEXT,
  p_hunt_id TEXT
)
RETURNS void AS $$
DECLARE
  stop_record RECORD;
  order_counter INTEGER := 1;
  random_seed DECIMAL;
BEGIN
  -- Delete existing order for this team
  DELETE FROM team_stop_orders WHERE team_id = p_team_id;

  -- Get team-based random seed (consistent per team)
  SELECT EXTRACT(EPOCH FROM t.created_at) INTO random_seed
  FROM teams t WHERE t.id = p_team_id;

  -- Set seed for consistent randomization per team
  PERFORM setseed(random_seed / 1000000000);

  -- Insert randomized order
  FOR stop_record IN
    SELECT hc.stop_id
    FROM hunt_configurations hc
    WHERE hc.organization_id = p_organization_id
      AND hc.hunt_id = p_hunt_id
      AND hc.is_active = true
    ORDER BY random()
  LOOP
    INSERT INTO team_stop_orders (team_id, stop_id, step_order)
    VALUES (p_team_id, stop_record.stop_id, order_counter);

    order_counter := order_counter + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to initialize team for a hunt (create progress entries and ordering)
CREATE OR REPLACE FUNCTION initialize_team_for_hunt(
  p_team_id UUID,
  p_organization_id TEXT,
  p_hunt_id TEXT
)
RETURNS void AS $$
DECLARE
  ordering_strategy TEXT;
BEGIN
  -- Get ordering strategy
  SELECT hoc.ordering_strategy INTO ordering_strategy
  FROM hunt_ordering_config hoc
  WHERE hoc.organization_id = p_organization_id AND hoc.hunt_id = p_hunt_id;

  -- Default to fixed if no config
  IF ordering_strategy IS NULL THEN
    ordering_strategy := 'fixed';
  END IF;

  -- Generate team stop order if randomized
  IF ordering_strategy = 'randomized' THEN
    PERFORM generate_team_stop_order(p_team_id, p_organization_id, p_hunt_id);
  END IF;

  -- Create initial progress entries for all stops
  INSERT INTO hunt_progress (team_id, location_id, done, revealed_hints)
  SELECT
    p_team_id,
    hc.stop_id,
    false,
    0
  FROM hunt_configurations hc
  WHERE hc.organization_id = p_organization_id
    AND hc.hunt_id = p_hunt_id
    AND hc.is_active = true
  ON CONFLICT (team_id, location_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Function to add a stop to a hunt
CREATE OR REPLACE FUNCTION add_stop_to_hunt(
  p_organization_id TEXT,
  p_hunt_id TEXT,
  p_stop_id TEXT,
  p_default_order INTEGER DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Auto-assign order if not provided
  IF p_default_order IS NULL THEN
    SELECT COALESCE(MAX(default_order), 0) + 1 INTO p_default_order
    FROM hunt_configurations
    WHERE organization_id = p_organization_id AND hunt_id = p_hunt_id;
  END IF;

  -- Insert hunt configuration
  INSERT INTO hunt_configurations (organization_id, hunt_id, stop_id, default_order)
  VALUES (p_organization_id, p_hunt_id, p_stop_id, p_default_order)
  ON CONFLICT (organization_id, hunt_id, stop_id)
  DO UPDATE SET default_order = p_default_order, is_active = true;

  -- Update existing teams if hunt uses randomized ordering
  PERFORM generate_team_stop_order(t.id, p_organization_id, p_hunt_id)
  FROM teams t
  JOIN hunt_ordering_config hoc ON hoc.organization_id = t.organization_id AND hoc.hunt_id = t.hunt_id
  WHERE t.organization_id = p_organization_id
    AND t.hunt_id = p_hunt_id
    AND hoc.ordering_strategy = 'randomized';
END;
$$ LANGUAGE plpgsql;

-- Recreate updated leaderboard view
CREATE VIEW leaderboard AS
SELECT
  t.id,
  t.team_id,
  t.name,
  t.display_name,
  t.score,
  t.organization_id,
  t.hunt_id,
  COUNT(CASE WHEN hp.done THEN 1 END) as completed_locations,
  MAX(hp.completed_at) as last_completion,
  COUNT(hc.*) as total_locations
FROM teams t
LEFT JOIN hunt_progress hp ON t.id = hp.team_id
LEFT JOIN hunt_configurations hc ON hc.organization_id = t.organization_id
  AND hc.hunt_id = t.hunt_id
  AND hc.stop_id = hp.location_id
  AND hc.is_active = true
GROUP BY t.id, t.team_id, t.name, t.display_name, t.score, t.organization_id, t.hunt_id
ORDER BY t.score DESC, completed_locations DESC;

-- Insert sample hunt stops
INSERT INTO hunt_stops (stop_id, title, description, clue, hints) VALUES
('covered-bridge', 'Covered Bridge', 'The iconic wooden bridge in Vail Village', 'The wooden crossing every skier knows', '["The most iconic photo spot in Vail.", "It''s the gateway into the village."]'),
('international-bridge', 'International Bridge', 'Stone bridge with flags crossing Gore Creek', 'Right next to the covered bridge, but this one is wide open to the sky', '["Right next to the covered bridge, but this one is wide open to the sky.", "It crosses Gore Creek where concerts and festivals often spill into the streets.", "Look for the stone bridge lined with flags — you can''t miss it."]'),
('yama-sushi', 'Yama Sushi', 'Japanese restaurant near Solaris', 'Across from The Remedy Bar, this spot trades hot toddies for sake', '["Across from The Remedy Bar, this spot trades hot toddies for sake.", "Small, modern, and often packed with locals after the slopes.", "The Japanese restaurant near Solaris known for creative rolls and late-night vibes."]'),
('lodge-at-vail', 'Lodge at Vail', 'Classic mountain lodge near Gondola One', 'Just steps from Gondola One, across from the pirate ship playground', '["Just steps from Gondola One, across from the pirate ship playground.", "One of Vail''s original hotels, full of wood beams and alpine charm.", "The classic mountain lodge where après ski feels timeless."]'),
('patagonia', 'Patagonia', 'Outdoor gear store in Vail Village', 'Near Mountain Standard and Sweet Basil, but it sells jackets instead of food', '["Near Mountain Standard and Sweet Basil, but it sells jackets instead of food.", "A favorite shop for climbers and skiers looking for gear with a purpose."]')
ON CONFLICT (stop_id) DO NOTHING;

-- Configure sample hunts
INSERT INTO hunt_configurations (organization_id, hunt_id, stop_id, default_order) VALUES
('bhhs', 'fall-2025', 'covered-bridge', 1),
('bhhs', 'fall-2025', 'international-bridge', 2),
('bhhs', 'fall-2025', 'lodge-at-vail', 3),
('vail', 'village-default', 'covered-bridge', 1),
('vail', 'village-default', 'international-bridge', 2),
('vail', 'village-default', 'yama-sushi', 3),
('vail', 'village-default', 'lodge-at-vail', 4),
('vail', 'village-default', 'patagonia', 5)
ON CONFLICT (organization_id, hunt_id, stop_id) DO NOTHING;

-- Configure ordering strategies
INSERT INTO hunt_ordering_config (organization_id, hunt_id, ordering_strategy) VALUES
('bhhs', 'fall-2025', 'fixed'),
('vail', 'village-default', 'randomized'),
('vail', 'valley-default', 'fixed')
ON CONFLICT (organization_id, hunt_id) DO NOTHING;

-- Add comments
COMMENT ON TABLE hunt_stops IS 'Master data for all possible hunt stops/locations';
COMMENT ON TABLE hunt_configurations IS 'Defines which stops are active in each hunt';
COMMENT ON TABLE hunt_ordering_config IS 'Defines ordering strategy (fixed/randomized) per hunt';
COMMENT ON TABLE team_stop_orders IS 'Stores randomized stop order per team';

COMMENT ON FUNCTION get_hunt_stops(TEXT, TEXT, UUID) IS 'Get ordered stops for a hunt, optionally with team progress';
COMMENT ON FUNCTION generate_team_stop_order(UUID, TEXT, TEXT) IS 'Generate randomized stop order for a team';
COMMENT ON FUNCTION initialize_team_for_hunt(UUID, TEXT, TEXT) IS 'Initialize team progress and ordering for a hunt';
COMMENT ON FUNCTION add_stop_to_hunt(TEXT, TEXT, TEXT, INTEGER) IS 'Add a stop to a hunt configuration';

-- Grant permissions
GRANT SELECT ON hunt_stops TO authenticated, anon;
GRANT SELECT ON hunt_configurations TO authenticated, anon;
GRANT SELECT ON hunt_ordering_config TO authenticated, anon;
GRANT SELECT ON team_stop_orders TO authenticated;

GRANT EXECUTE ON FUNCTION get_hunt_stops(TEXT, TEXT, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION initialize_team_for_hunt(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION add_stop_to_hunt(TEXT, TEXT, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION generate_team_stop_order(UUID, TEXT, TEXT) TO service_role;