-- Drop the view if it exists
DROP VIEW IF EXISTS team_progress_overview CASCADE;

-- Create a comprehensive view showing teams with their codes, progress, and images
CREATE OR REPLACE VIEW team_progress_overview AS
WITH team_codes AS (
    -- Get team codes from team_mappings table
    SELECT
        tm.team_id,
        tm.team_name,
        tm.row_key as team_code,
        tm.is_active,
        tm.created_at as code_created_at
    FROM team_mappings tm
),
team_progress AS (
    -- Get team progress from teams table
    SELECT
        t.team_id,
        t.name as team_display_name,
        t.score,
        t.hunt_progress,
        t.org_id,
        t.hunt_id,
        t.updated_at as progress_updated_at,
        -- Calculate completed stops
        COALESCE(
            (SELECT COUNT(*)::int
             FROM jsonb_each(t.hunt_progress) AS stop(key, value)
             WHERE (stop.value->>'done')::boolean = true
            ), 0
        ) as completed_stops,
        -- Calculate total stops
        COALESCE(
            jsonb_array_length(jsonb_object_keys(t.hunt_progress)),
            0
        ) as total_stops
    FROM teams t
),
team_images AS (
    -- Extract image URLs from hunt_progress JSON
    SELECT
        t.team_id,
        jsonb_agg(
            jsonb_build_object(
                'stop_name', stop.key,
                'completed', COALESCE((stop.value->>'done')::boolean, false),
                'completed_at', stop.value->>'completedAt',
                'photo_url', stop.value->>'photoUrl',
                'thumbnail_url', stop.value->>'thumbnailUrl',
                'public_id', stop.value->>'publicId'
            ) ORDER BY stop.key
        ) FILTER (WHERE stop.value->>'photoUrl' IS NOT NULL) as images,
        COUNT(*) FILTER (WHERE stop.value->>'photoUrl' IS NOT NULL)::int as total_images
    FROM teams t,
         LATERAL jsonb_each(t.hunt_progress) AS stop(key, value)
    GROUP BY t.team_id
),
team_settings AS (
    -- Get team settings if they exist
    SELECT
        ts.team_id,
        ts.settings->>'locationName' as location_name,
        ts.settings->>'eventName' as event_name,
        ts.settings->>'sessionId' as session_id,
        ts.last_modified_at as settings_updated_at,
        ts.total_updates as settings_update_count
    FROM team_settings ts
)
-- Combine all data
SELECT
    -- Team identification
    COALESCE(tc.team_id, tp.team_id) as team_id,
    tc.team_code,
    COALESCE(tc.team_name, tp.team_display_name) as team_name,
    tp.team_display_name,
    tc.is_active as code_is_active,

    -- Organization and hunt
    tp.org_id,
    tp.hunt_id,

    -- Progress metrics
    tp.score,
    tp.completed_stops,
    tp.total_stops,
    CASE
        WHEN tp.total_stops > 0
        THEN ROUND((tp.completed_stops::numeric / tp.total_stops::numeric * 100), 2)
        ELSE 0
    END as completion_percentage,

    -- Settings
    ts.location_name,
    ts.event_name,
    ts.session_id,

    -- Images
    ti.total_images,
    ti.images as stop_images,

    -- Raw hunt progress (for detailed analysis)
    tp.hunt_progress,

    -- Timestamps
    tc.code_created_at,
    tp.progress_updated_at,
    ts.settings_updated_at,
    GREATEST(
        tc.code_created_at,
        tp.progress_updated_at,
        ts.settings_updated_at
    ) as last_activity
FROM team_codes tc
FULL OUTER JOIN team_progress tp ON tc.team_id = tp.team_id
LEFT JOIN team_images ti ON COALESCE(tc.team_id, tp.team_id) = ti.team_id
LEFT JOIN team_settings ts ON COALESCE(tc.team_id, tp.team_id) = ts.team_id
ORDER BY
    completion_percentage DESC,
    completed_stops DESC,
    last_activity DESC NULLS LAST;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_teams_hunt_progress ON teams USING gin(hunt_progress);
CREATE INDEX IF NOT EXISTS idx_team_mappings_team_id ON team_mappings(team_id);
CREATE INDEX IF NOT EXISTS idx_teams_org_hunt ON teams(org_id, hunt_id);

-- Grant permissions for the view
GRANT SELECT ON team_progress_overview TO authenticated;
GRANT SELECT ON team_progress_overview TO anon;

-- Example queries:
--
-- 1. Get all teams with their progress:
-- SELECT * FROM team_progress_overview;
--
-- 2. Get teams for a specific hunt:
-- SELECT * FROM team_progress_overview
-- WHERE org_id = 'bhhs' AND hunt_id = 'fall-2025';
--
-- 3. Get teams that have uploaded photos:
-- SELECT team_id, team_name, team_code, total_images, stop_images
-- FROM team_progress_overview
-- WHERE total_images > 0;
--
-- 4. Get teams by completion percentage:
-- SELECT team_id, team_name, completion_percentage, completed_stops, total_stops
-- FROM team_progress_overview
-- WHERE completion_percentage >= 50
-- ORDER BY completion_percentage DESC;
--
-- 5. Get specific team details with images:
-- SELECT * FROM team_progress_overview
-- WHERE team_code = 'gamma03';
--
-- 6. Get teams with recent activity:
-- SELECT team_id, team_name, last_activity
-- FROM team_progress_overview
-- WHERE last_activity > NOW() - INTERVAL '1 day'
-- ORDER BY last_activity DESC;