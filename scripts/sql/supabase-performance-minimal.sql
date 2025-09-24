-- Supabase Performance Optimization (Minimal Safe Version)
-- Execute this AFTER schema and RLS setup
-- This version avoids all potential transaction issues

-- Basic performance indexes (execute these first)
CREATE INDEX IF NOT EXISTS idx_teams_org_hunt_name ON teams(organization_id, hunt_id, name);
CREATE INDEX IF NOT EXISTS idx_hunt_progress_team_done ON hunt_progress(team_id, done);
CREATE INDEX IF NOT EXISTS idx_sessions_team_active ON sessions(team_id, is_active);
CREATE INDEX IF NOT EXISTS idx_team_codes_org_active ON team_codes(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_settings_team_org ON settings(team_id, organization_id);

-- Team ranking function
CREATE OR REPLACE FUNCTION get_team_ranking(
  p_team_id UUID,
  p_organization_id TEXT,
  p_hunt_id TEXT
)
RETURNS TABLE (
  team_rank INTEGER,
  total_teams INTEGER,
  team_score INTEGER,
  team_completions BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH team_rankings AS (
    SELECT
      t.id,
      t.score,
      COUNT(CASE WHEN hp.done THEN 1 END) as completions,
      RANK() OVER (ORDER BY t.score DESC, COUNT(CASE WHEN hp.done THEN 1 END) DESC) as rank
    FROM teams t
    LEFT JOIN hunt_progress hp ON t.id = hp.team_id
    WHERE t.organization_id = p_organization_id AND t.hunt_id = p_hunt_id
    GROUP BY t.id, t.score
  )
  SELECT
    tr.rank::INTEGER,
    (SELECT COUNT(*)::INTEGER FROM team_rankings),
    tr.score::INTEGER,
    tr.completions
  FROM team_rankings tr
  WHERE tr.id = p_team_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Simple progress analytics view
DROP VIEW IF EXISTS progress_analytics;
CREATE VIEW progress_analytics AS
SELECT
  hp.location_id,
  COUNT(*) as total_attempts,
  COUNT(CASE WHEN hp.done THEN 1 END) as completions,
  ROUND((COUNT(CASE WHEN hp.done THEN 1 END)::DECIMAL / COUNT(*)) * 100, 2) as completion_rate,
  AVG(hp.revealed_hints) as avg_hints_used
FROM hunt_progress hp
GROUP BY hp.location_id
ORDER BY completion_rate DESC;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_team_ranking(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_ranking(UUID, TEXT, TEXT) TO anon;
GRANT SELECT ON progress_analytics TO authenticated;