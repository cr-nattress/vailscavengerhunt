-- Complete Multi-Org Hunt System Setup
-- Run this script to ensure all tables, functions, and data are properly configured
-- This script is idempotent - safe to run multiple times

-- ============================================================================
-- PART 1: ENSURE CORE SCHEMA EXISTS
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hunts table
CREATE TABLE IF NOT EXISTS hunts (
  id TEXT NOT NULL,
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (organization_id, id)
);

-- Hunt stops table (master data for all possible stops)
CREATE TABLE IF NOT EXISTS hunt_stops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stop_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  clue TEXT NOT NULL,
  hints JSONB DEFAULT '[]',
  position_lat DECIMAL,
  position_lng DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hunt configurations table (defines which stops are in each hunt)
CREATE TABLE IF NOT EXISTS hunt_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id TEXT NOT NULL,
  hunt_id TEXT NOT NULL,
  stop_id TEXT REFERENCES hunt_stops(stop_id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  default_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (organization_id, hunt_id) REFERENCES hunts(organization_id, id),
  UNIQUE(organization_id, hunt_id, stop_id)
);

-- Hunt ordering config table
CREATE TABLE IF NOT EXISTS hunt_ordering_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id TEXT NOT NULL,
  hunt_id TEXT NOT NULL,
  ordering_strategy TEXT NOT NULL CHECK (ordering_strategy IN ('fixed', 'randomized')),
  seed_strategy TEXT NOT NULL DEFAULT 'team_based' CHECK (seed_strategy IN ('team_based', 'global')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (organization_id, hunt_id) REFERENCES hunts(organization_id, id),
  UNIQUE(organization_id, hunt_id)
);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  hunt_id TEXT NOT NULL,
  name TEXT NOT NULL,
  display_name TEXT,
  score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (organization_id, hunt_id) REFERENCES hunts(organization_id, id),
  UNIQUE(organization_id, team_id, hunt_id)
);

-- Team codes table
CREATE TABLE IF NOT EXISTS team_codes (
  code TEXT PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL,
  hunt_id TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  max_uses INTEGER,
  uses INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hunt progress table
CREATE TABLE IF NOT EXISTS hunt_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL,
  done BOOLEAN DEFAULT false,
  notes TEXT,
  photo_url TEXT,
  revealed_hints INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  last_modified_by UUID,
  last_modified_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, location_id)
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL,
  hunt_id TEXT NOT NULL,
  location_name TEXT,
  event_name TEXT,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id)
);

-- Team stop orders table (for randomized hunts)
CREATE TABLE IF NOT EXISTS team_stop_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  stop_id TEXT REFERENCES hunt_stops(stop_id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, stop_id),
  UNIQUE(team_id, step_order)
);

-- ============================================================================
-- PART 2: ADD PRE-POPULATED IMAGE SUPPORT (IF NOT EXISTS)
-- ============================================================================

DO $$
BEGIN
    -- Add photo_mode to hunts table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'hunts' AND column_name = 'photo_mode'
    ) THEN
        ALTER TABLE hunts
        ADD COLUMN photo_mode TEXT DEFAULT 'upload'
        CHECK (photo_mode IN ('upload', 'pre_populated'));

        COMMENT ON COLUMN hunts.photo_mode IS
          'Determines photo behavior: upload (user photos) or pre_populated (fixed images)';
    END IF;

    -- Add pre_populated_image_url to hunt_stops table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'hunt_stops' AND column_name = 'pre_populated_image_url'
    ) THEN
        ALTER TABLE hunt_stops
        ADD COLUMN pre_populated_image_url TEXT;

        COMMENT ON COLUMN hunt_stops.pre_populated_image_url IS
          'URL to display when photo_mode is pre_populated. Ignored for upload mode.';
    END IF;
END $$;

-- ============================================================================
-- PART 3: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_hunt_configurations_org_hunt ON hunt_configurations(organization_id, hunt_id);
CREATE INDEX IF NOT EXISTS idx_hunt_configurations_stop ON hunt_configurations(stop_id);
CREATE INDEX IF NOT EXISTS idx_team_stop_orders_team ON team_stop_orders(team_id);
CREATE INDEX IF NOT EXISTS idx_team_stop_orders_order ON team_stop_orders(team_id, step_order);
CREATE INDEX IF NOT EXISTS idx_hunt_stops_stop_id ON hunt_stops(stop_id);
CREATE INDEX IF NOT EXISTS idx_teams_org_hunt ON teams(organization_id, hunt_id);
CREATE INDEX IF NOT EXISTS idx_team_codes_org_hunt ON team_codes(organization_id, hunt_id);
CREATE INDEX IF NOT EXISTS idx_hunt_progress_team ON hunt_progress(team_id);

-- ============================================================================
-- PART 4: CREATE DATABASE FUNCTIONS
-- ============================================================================

-- Drop existing function if it exists (handles signature changes)
DROP FUNCTION IF EXISTS get_hunt_stops(text, text, uuid);

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
  is_completed BOOLEAN,
  pre_populated_image_url TEXT
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
      COALESCE(hp.done, false) as is_completed,
      hs.pre_populated_image_url
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
      COALESCE(hp.done, false) as is_completed,
      hs.pre_populated_image_url
    FROM team_stop_orders tso
    JOIN hunt_stops hs ON tso.stop_id = hs.stop_id
    LEFT JOIN hunt_progress hp ON hp.team_id = p_team_id AND hp.location_id = hs.stop_id
    WHERE tso.team_id = p_team_id
    ORDER BY tso.step_order ASC;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- PART 5: VERIFICATION QUERY
-- ============================================================================

-- Show what's in the database
DO $$
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'MULTI-ORG HUNT SYSTEM SETUP COMPLETE';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables created/verified:';
  RAISE NOTICE '  ✓ organizations';
  RAISE NOTICE '  ✓ hunts (with photo_mode support)';
  RAISE NOTICE '  ✓ hunt_stops (with pre_populated_image_url)';
  RAISE NOTICE '  ✓ hunt_configurations';
  RAISE NOTICE '  ✓ hunt_ordering_config';
  RAISE NOTICE '  ✓ teams';
  RAISE NOTICE '  ✓ team_codes';
  RAISE NOTICE '  ✓ hunt_progress';
  RAISE NOTICE '  ✓ settings';
  RAISE NOTICE '  ✓ team_stop_orders';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions created/verified:';
  RAISE NOTICE '  ✓ get_hunt_stops()';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Run second-org-scavenger-hunt.sql to create Mountain Adventures org';
  RAISE NOTICE '  2. Run enable-pre-populated-images.sql to enable pre-populated image mode';
  RAISE NOTICE '  3. Test with team codes SUMMIT2025 or POWDER2025';
  RAISE NOTICE '';
END $$;

-- Summary query
SELECT
  'Organizations' as entity,
  COUNT(*)::TEXT as count
FROM organizations
UNION ALL
SELECT 'Hunts', COUNT(*)::TEXT FROM hunts
UNION ALL
SELECT 'Hunt Stops', COUNT(*)::TEXT FROM hunt_stops
UNION ALL
SELECT 'Hunt Configurations', COUNT(*)::TEXT FROM hunt_configurations
UNION ALL
SELECT 'Teams', COUNT(*)::TEXT FROM teams
UNION ALL
SELECT 'Team Codes', COUNT(*)::TEXT FROM team_codes
ORDER BY entity;
