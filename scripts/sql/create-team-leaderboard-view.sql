-- Drop the materialized view if it exists
DROP MATERIALIZED VIEW IF EXISTS team_leaderboard CASCADE;

-- Create a materialized view for faster leaderboard queries
CREATE MATERIALIZED VIEW team_leaderboard AS
SELECT
    -- Team identification
    t.team_id,
    t.name as team_name,
    tm.row_key as team_code,

    -- Organization and hunt
    t.org_id,
    t.hunt_id,

    -- Progress summary
    t.score,

    -- Extract completed stops count
    (
        SELECT COUNT(*)::int
        FROM jsonb_each(t.hunt_progress) AS stop(key, value)
        WHERE (stop.value->>'done')::boolean = true
    ) as completed_stops,

    -- Extract total stops count
    (
        SELECT COUNT(*)::int
        FROM jsonb_each(t.hunt_progress)
    ) as total_stops,

    -- Extract uploaded photos count
    (
        SELECT COUNT(*)::int
        FROM jsonb_each(t.hunt_progress) AS stop(key, value)
        WHERE stop.value->>'photoUrl' IS NOT NULL
    ) as photos_uploaded,

    -- Calculate completion percentage
    CASE
        WHEN COUNT(*) FILTER (WHERE t.hunt_progress IS NOT NULL) > 0
        THEN ROUND(
            (COUNT(*) FILTER (WHERE (j.value->>'done')::boolean = true)::numeric /
             NULLIF(COUNT(*) FILTER (WHERE t.hunt_progress IS NOT NULL), 0)::numeric * 100),
            2
        )
        ELSE 0
    END as completion_percentage,

    -- Latest activity timestamp
    COALESCE(
        (
            SELECT MAX((stop.value->>'completedAt')::timestamp)
            FROM jsonb_each(t.hunt_progress) AS stop(key, value)
            WHERE stop.value->>'completedAt' IS NOT NULL
        ),
        t.updated_at
    ) as last_activity,

    -- List of completed stop names
    ARRAY_AGG(
        j.key ORDER BY j.key
    ) FILTER (WHERE (j.value->>'done')::boolean = true) as completed_stop_names,

    -- List of photo URLs
    ARRAY_AGG(
        j.value->>'photoUrl' ORDER BY j.key
    ) FILTER (WHERE j.value->>'photoUrl' IS NOT NULL) as photo_urls,

    -- Team settings
    ts.settings->>'locationName' as location_name,
    ts.settings->>'eventName' as event_name,

    -- Timestamps
    t.created_at,
    t.updated_at

FROM teams t
LEFT JOIN team_mappings tm ON t.team_id = tm.team_id
LEFT JOIN team_settings ts ON t.team_id = ts.team_id
    AND t.org_id = ts.org_id
    AND t.hunt_id = ts.hunt_id
LEFT JOIN LATERAL jsonb_each(t.hunt_progress) AS j(key, value) ON true
GROUP BY
    t.team_id,
    t.name,
    tm.row_key,
    t.org_id,
    t.hunt_id,
    t.score,
    t.hunt_progress,
    ts.settings,
    t.created_at,
    t.updated_at
ORDER BY
    completion_percentage DESC,
    completed_stops DESC,
    last_activity DESC NULLS LAST;

-- Create indexes for the materialized view
CREATE INDEX IF NOT EXISTS idx_team_leaderboard_org_hunt
    ON team_leaderboard(org_id, hunt_id);
CREATE INDEX IF NOT EXISTS idx_team_leaderboard_completion
    ON team_leaderboard(completion_percentage DESC);
CREATE INDEX IF NOT EXISTS idx_team_leaderboard_team_code
    ON team_leaderboard(team_code);
CREATE INDEX IF NOT EXISTS idx_team_leaderboard_last_activity
    ON team_leaderboard(last_activity DESC);

-- Grant permissions
GRANT SELECT ON team_leaderboard TO authenticated;
GRANT SELECT ON team_leaderboard TO anon;

-- Create a function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_team_leaderboard()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY team_leaderboard;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on the refresh function
GRANT EXECUTE ON FUNCTION refresh_team_leaderboard() TO authenticated;

-- Example queries:
--
-- 1. Get top 10 teams by completion:
-- SELECT team_name, team_code, completion_percentage, completed_stops, photos_uploaded
-- FROM team_leaderboard
-- WHERE org_id = 'bhhs' AND hunt_id = 'fall-2025'
-- ORDER BY completion_percentage DESC, completed_stops DESC
-- LIMIT 10;
--
-- 2. Get teams with photos:
-- SELECT team_name, team_code, photos_uploaded, photo_urls
-- FROM team_leaderboard
-- WHERE photos_uploaded > 0
-- ORDER BY photos_uploaded DESC;
--
-- 3. Get recent activity:
-- SELECT team_name, team_code, last_activity, completed_stops
-- FROM team_leaderboard
-- WHERE last_activity > NOW() - INTERVAL '1 hour'
-- ORDER BY last_activity DESC;
--
-- 4. Get specific team details:
-- SELECT *
-- FROM team_leaderboard
-- WHERE team_code = 'gamma03';
--
-- 5. Refresh the materialized view (run periodically):
-- SELECT refresh_team_leaderboard();