-- Verify that tea cup team has 1 uploaded photo
-- This query checks the team_progress table for the tea cup team

-- Method 1: Direct query on team_progress table
SELECT
    tp.team_id,
    tm.team_name,
    tm.team_code,
    tp.progress,
    -- Count photos in the progress JSON
    (
        SELECT COUNT(*)::int
        FROM jsonb_each(tp.progress) AS stop(key, value)
        WHERE stop.value->>'photoUrl' IS NOT NULL
    ) as photo_count,
    -- Extract photo URLs
    (
        SELECT jsonb_agg(
            jsonb_build_object(
                'stop_name', stop.key,
                'photo_url', stop.value->>'photoUrl',
                'thumbnail_url', stop.value->>'thumbnailUrl',
                'completed_at', stop.value->>'completedAt'
            ) ORDER BY stop.key
        )
        FROM jsonb_each(tp.progress) AS stop(key, value)
        WHERE stop.value->>'photoUrl' IS NOT NULL
    ) as uploaded_photos
FROM team_progress tp
LEFT JOIN team_mappings tm ON tp.team_id = tm.team_id
WHERE LOWER(tm.team_name) LIKE '%tea%cup%'
   OR LOWER(tm.team_code) LIKE '%tea%cup%'
   OR tp.team_id LIKE '%tea%cup%';

-- Method 2: Using the view we created (if it exists)
-- SELECT
--     team_id,
--     team_name,
--     team_code,
--     total_images,
--     stop_images
-- FROM team_progress_overview
-- WHERE LOWER(team_name) LIKE '%tea%cup%'
--    OR LOWER(team_code) LIKE '%tea%cup%';