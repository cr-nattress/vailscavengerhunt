-- Supabase Database Schema for Vail Scavenger Hunt
-- Execute this in the Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Organizations table
CREATE TABLE organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hunts table
CREATE TABLE hunts (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, id)
);

-- Teams table
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id TEXT NOT NULL,
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  hunt_id TEXT NOT NULL,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (organization_id, hunt_id) REFERENCES hunts(organization_id, id),
  UNIQUE(organization_id, team_id, hunt_id)
);

-- Team codes table
CREATE TABLE team_codes (
  code TEXT PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  organization_id TEXT REFERENCES organizations(id),
  hunt_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  usage_count INTEGER DEFAULT 0,
  max_uses INTEGER DEFAULT NULL
);

-- Hunt progress table
CREATE TABLE hunt_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL,
  done BOOLEAN DEFAULT false,
  notes TEXT,
  photo_url TEXT,
  revealed_hints INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  last_modified_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, location_id)
);

-- Sessions table (with automatic expiration)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_agent TEXT,
  device_hint TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  is_active BOOLEAN DEFAULT true
);

-- Settings table
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  organization_id TEXT REFERENCES organizations(id),
  hunt_id TEXT,
  location_name TEXT,
  event_name TEXT,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_teams_org_hunt ON teams(organization_id, hunt_id);
CREATE INDEX idx_progress_team ON hunt_progress(team_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at) WHERE is_active = true;
CREATE INDEX idx_team_codes_active ON team_codes(code) WHERE is_active = true;
CREATE INDEX idx_hunt_progress_location ON hunt_progress(location_id);
CREATE INDEX idx_teams_score ON teams(score DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hunts_updated_at BEFORE UPDATE ON hunts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hunt_progress_updated_at BEFORE UPDATE ON hunt_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean expired sessions (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  UPDATE sessions
  SET is_active = false
  WHERE expires_at < NOW() AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Create view for leaderboard
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
  MAX(hp.completed_at) as last_completion
FROM teams t
LEFT JOIN hunt_progress hp ON t.id = hp.team_id
GROUP BY t.id, t.team_id, t.name, t.display_name, t.score, t.organization_id, t.hunt_id
ORDER BY t.score DESC, completed_locations DESC;

-- Insert sample data for testing
INSERT INTO organizations (id, name) VALUES
  ('bhhs', 'Berkshire Hathaway HomeServices'),
  ('vail', 'Vail Valley');

INSERT INTO hunts (id, organization_id, name, is_active) VALUES
  ('fall-2025', 'bhhs', 'Fall 2025', true),
  ('valley-default', 'vail', 'Valley Default', true),
  ('village-default', 'vail', 'Village Default', true);

-- Comment: Teams and team codes will be populated during data migration
-- or through the application interface

-- Create a function to recalculate team scores
CREATE OR REPLACE FUNCTION recalculate_team_score(team_uuid UUID)
RETURNS void AS $$
DECLARE
  new_score INTEGER;
BEGIN
  -- Calculate score based on completed locations (10 points each)
  SELECT COUNT(*) * 10 INTO new_score
  FROM hunt_progress
  WHERE team_id = team_uuid AND done = true;

  -- Update team score
  UPDATE teams SET score = new_score WHERE id = team_uuid;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update team score when progress changes
CREATE OR REPLACE FUNCTION update_team_score_on_progress_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate score for the affected team
  PERFORM recalculate_team_score(NEW.team_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_team_score
  AFTER INSERT OR UPDATE ON hunt_progress
  FOR EACH ROW EXECUTE FUNCTION update_team_score_on_progress_change();

-- Add some constraints for data integrity
ALTER TABLE hunt_progress ADD CONSTRAINT check_revealed_hints
  CHECK (revealed_hints >= 0);

ALTER TABLE teams ADD CONSTRAINT check_score_non_negative
  CHECK (score >= 0);

ALTER TABLE team_codes ADD CONSTRAINT check_usage_count_non_negative
  CHECK (usage_count >= 0);

-- Create indexes for common query patterns
CREATE INDEX idx_hunt_progress_done ON hunt_progress(done);
CREATE INDEX idx_teams_display_name ON teams(display_name);
CREATE INDEX idx_sessions_team_active ON sessions(team_id, is_active);

-- Add comments for documentation
COMMENT ON TABLE organizations IS 'Master data for organizations (companies/groups)';
COMMENT ON TABLE hunts IS 'Hunt configurations per organization';
COMMENT ON TABLE teams IS 'Team data with organization/hunt relationships';
COMMENT ON TABLE team_codes IS 'Access codes for team verification';
COMMENT ON TABLE hunt_progress IS 'Progress tracking per team per location';
COMMENT ON TABLE sessions IS 'User sessions with automatic 24-hour expiration';
COMMENT ON TABLE settings IS 'Application settings per team';
COMMENT ON VIEW leaderboard IS 'Real-time leaderboard with scores and completion counts';