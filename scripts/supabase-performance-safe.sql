-- Supabase Performance Optimization for Vail Scavenger Hunt (Safe Version)
-- Execute this AFTER the main schema and RLS setup
-- Note: CONCURRENTLY removed for SQL Editor compatibility

-- Additional performance indexes for common query patterns
-- Team lookup optimizations
CREATE INDEX IF NOT EXISTS idx_teams_org_hunt_name
  ON teams(organization_id, hunt_id, name);

CREATE INDEX IF NOT EXISTS idx_teams_display_name_gin
  ON teams USING gin(to_tsvector('english', display_name));

-- Progress tracking optimizations
CREATE INDEX IF NOT EXISTS idx_hunt_progress_team_done_location
  ON hunt_progress(team_id, done, location_id);

CREATE INDEX IF NOT EXISTS idx_hunt_progress_completed_at
  ON hunt_progress(completed_at DESC) WHERE done = true;

CREATE INDEX IF NOT EXISTS idx_hunt_progress_team_completed
  ON hunt_progress(team_id, completed_at DESC) WHERE done = true;

-- Session management optimizations
CREATE INDEX IF NOT EXISTS idx_sessions_team_created
  ON sessions(team_id, created_at DESC) WHERE is_active = true;

-- Team code lookup optimizations
CREATE INDEX IF NOT EXISTS idx_team_codes_org_hunt_active
  ON team_codes(organization_id, hunt_id, is_active) WHERE is_active = true;

-- Settings lookup optimizations
CREATE INDEX IF NOT EXISTS idx_settings_team_org_hunt
  ON settings(team_id, organization_id, hunt_id);

-- Leaderboard optimization indexes
CREATE INDEX IF NOT EXISTS idx_teams_score_completion
  ON teams(organization_id, hunt_id, score DESC, updated_at DESC);

-- Create materialized view for leaderboard performance
DROP MATERIALIZED VIEW IF EXISTS leaderboard_cache;
CREATE MATERIALIZED VIEW leaderboard_cache AS
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
  RANK() OVER (
    PARTITION BY t.organization_id, t.hunt_id
    ORDER BY t.score DESC, COUNT(CASE WHEN hp.done THEN 1 END) DESC, MAX(hp.completed_at) ASC
  ) as rank,
  t.updated_at
FROM teams t
LEFT JOIN hunt_progress hp ON t.id = hp.team_id
GROUP BY t.id, t.team_id, t.name, t.display_name, t.score, t.organization_id, t.hunt_id, t.updated_at
ORDER BY t.organization_id, t.hunt_id, rank;

-- Index the materialized view
CREATE INDEX IF NOT EXISTS idx_leaderboard_cache_org_hunt_rank
  ON leaderboard_cache(organization_id, hunt_id, rank);

CREATE INDEX IF NOT EXISTS idx_leaderboard_cache_updated
  ON leaderboard_cache(updated_at DESC);

-- Function to refresh leaderboard cache
CREATE OR REPLACE FUNCTION refresh_leaderboard_cache()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW leaderboard_cache;
END;
$$ LANGUAGE plpgsql;

-- Create optimized views for common queries

-- Active teams with latest progress
DROP VIEW IF EXISTS active_teams_with_progress;
CREATE VIEW active_teams_with_progress AS
SELECT
  t.*,
  COALESCE(progress_stats.completed_count, 0) as completed_locations,
  COALESCE(progress_stats.total_locations, 0) as total_locations,
  COALESCE(progress_stats.completion_percentage, 0) as completion_percentage,
  progress_stats.last_activity
FROM teams t
LEFT JOIN (
  SELECT
    team_id,
    COUNT(*) as total_locations,
    COUNT(CASE WHEN done THEN 1 END) as completed_count,
    ROUND(
      (COUNT(CASE WHEN done THEN 1 END)::DECIMAL / COUNT(*)) * 100, 2
    ) as completion_percentage,
    MAX(updated_at) as last_activity
  FROM hunt_progress
  GROUP BY team_id
) progress_stats ON t.id = progress_stats.team_id;

-- Team session summary for analytics
DROP VIEW IF EXISTS team_session_summary;
CREATE VIEW team_session_summary AS
SELECT
  t.id as team_id,
  t.name as team_name,
  t.organization_id,
  t.hunt_id,
  COUNT(s.id) as total_sessions,
  COUNT(CASE WHEN s.is_active THEN 1 END) as active_sessions,
  MIN(s.created_at) as first_session,
  MAX(s.created_at) as latest_session,
  EXTRACT(EPOCH FROM (MAX(s.created_at) - MIN(s.created_at))) / 3600 as hours_active
FROM teams t
LEFT JOIN sessions s ON t.id = s.team_id
GROUP BY t.id, t.name, t.organization_id, t.hunt_id;

-- Progress analytics view
DROP VIEW IF EXISTS progress_analytics;
CREATE VIEW progress_analytics AS
SELECT
  hp.location_id,
  COUNT(*) as total_attempts,
  COUNT(CASE WHEN hp.done THEN 1 END) as completions,
  ROUND(
    (COUNT(CASE WHEN hp.done THEN 1 END)::DECIMAL / COUNT(*)) * 100, 2
  ) as completion_rate,
  AVG(hp.revealed_hints) as avg_hints_used,
  MIN(hp.created_at) as first_attempt,
  MAX(CASE WHEN hp.done THEN hp.completed_at END) as latest_completion
FROM hunt_progress hp
GROUP BY hp.location_id
ORDER BY completion_rate DESC;

-- Create function for efficient team ranking within hunt
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
      RANK() OVER (
        ORDER BY t.score DESC,
        COUNT(CASE WHEN hp.done THEN 1 END) DESC,
        MIN(hp.completed_at) ASC
      ) as rank
    FROM teams t
    LEFT JOIN hunt_progress hp ON t.id = hp.team_id
    WHERE t.organization_id = p_organization_id
      AND t.hunt_id = p_hunt_id
    GROUP BY t.id, t.score
  ),
  team_stats AS (
    SELECT
      MAX(rank) as total_teams
    FROM team_rankings
  )
  SELECT
    tr.rank::INTEGER,
    ts.total_teams::INTEGER,
    tr.score::INTEGER,
    tr.completions
  FROM team_rankings tr
  CROSS JOIN team_stats ts
  WHERE tr.id = p_team_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function for location difficulty analysis
CREATE OR REPLACE FUNCTION get_location_difficulty_stats()
RETURNS TABLE (
  location_id TEXT,
  difficulty_score DECIMAL,
  avg_hints_needed DECIMAL,
  completion_rate DECIMAL,
  avg_completion_time_hours DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    hp.location_id,
    -- Difficulty score: inverse of completion rate + hint usage factor
    ROUND(
      (100 - (COUNT(CASE WHEN hp.done THEN 1 END)::DECIMAL / COUNT(*)) * 100) +
      (AVG(hp.revealed_hints) * 10), 2
    ) as difficulty_score,
    ROUND(AVG(hp.revealed_hints), 2) as avg_hints_needed,
    ROUND(
      (COUNT(CASE WHEN hp.done THEN 1 END)::DECIMAL / COUNT(*)) * 100, 2
    ) as completion_rate,
    ROUND(
      AVG(
        CASE WHEN hp.done AND hp.completed_at IS NOT NULL THEN
          EXTRACT(EPOCH FROM (hp.completed_at - hp.created_at)) / 3600
        END
      ), 2
    ) as avg_completion_time_hours
  FROM hunt_progress hp
  GROUP BY hp.location_id
  ORDER BY difficulty_score DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function for database statistics
CREATE OR REPLACE FUNCTION get_database_stats()
RETURNS TABLE (
  table_name TEXT,
  row_count BIGINT,
  table_size TEXT,
  index_size TEXT,
  total_size TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    schemaname||'.'||tablename as table_name,
    n_tup_ins - n_tup_del as row_count,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size,
    pg_size_pretty(
      pg_total_relation_size(schemaname||'.'||tablename) +
      pg_indexes_size(schemaname||'.'||tablename)
    ) as total_size
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$$ LANGUAGE plpgsql;

-- Performance monitoring functions
CREATE OR REPLACE FUNCTION get_slow_queries()
RETURNS TABLE (
  query TEXT,
  calls BIGINT,
  total_time DOUBLE PRECISION,
  mean_time DOUBLE PRECISION,
  max_time DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.query,
    s.calls,
    s.total_exec_time as total_time,
    s.mean_exec_time as mean_time,
    s.max_exec_time as max_time
  FROM pg_stat_statements s
  WHERE s.query NOT LIKE '%pg_stat_statements%'
  ORDER BY s.mean_exec_time DESC
  LIMIT 10;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'pg_stat_statements extension not available';
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Create partial indexes for better performance on filtered queries
CREATE INDEX IF NOT EXISTS idx_hunt_progress_incomplete
  ON hunt_progress(team_id, location_id, created_at) WHERE done = false;

CREATE INDEX IF NOT EXISTS idx_teams_active_hunts
  ON teams(organization_id, hunt_id, score DESC);

-- Add table statistics and comments for performance monitoring
COMMENT ON MATERIALIZED VIEW leaderboard_cache IS
  'Cached leaderboard for performance - refresh with refresh_leaderboard_cache()';

COMMENT ON FUNCTION refresh_leaderboard_cache() IS
  'Refresh the materialized leaderboard cache - call after bulk data changes';

COMMENT ON FUNCTION get_team_ranking(UUID, TEXT, TEXT) IS
  'Get current ranking for a specific team within their hunt';

COMMENT ON FUNCTION get_location_difficulty_stats() IS
  'Analyze location difficulty based on completion rates and hint usage';

COMMENT ON VIEW active_teams_with_progress IS
  'Teams with aggregated progress statistics for dashboard views';

COMMENT ON VIEW team_session_summary IS
  'Team session analytics for activity monitoring';

COMMENT ON VIEW progress_analytics IS
  'Location-based analytics for hunt difficulty balancing';

-- Grant necessary permissions
GRANT SELECT ON leaderboard_cache TO authenticated;
GRANT SELECT ON leaderboard_cache TO anon;
GRANT SELECT ON active_teams_with_progress TO authenticated;
GRANT SELECT ON active_teams_with_progress TO anon;
GRANT SELECT ON team_session_summary TO authenticated;
GRANT SELECT ON progress_analytics TO authenticated;

-- Service role can refresh cache and run analytics
GRANT EXECUTE ON FUNCTION refresh_leaderboard_cache() TO service_role;
GRANT EXECUTE ON FUNCTION get_team_ranking(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_ranking(UUID, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_location_difficulty_stats() TO service_role;
GRANT EXECUTE ON FUNCTION get_database_stats() TO service_role;
GRANT EXECUTE ON FUNCTION get_slow_queries() TO service_role;