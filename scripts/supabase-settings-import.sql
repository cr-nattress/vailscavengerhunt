-- Supabase Settings Table Import
-- This script only populates the settings table with default entries for existing teams
-- Run this in the Supabase SQL Editor

-- Insert default settings entries for each team
DO $$
DECLARE
    team_record RECORD;
    sample_session_id UUID;
BEGIN
    -- Generate a sample session ID for settings
    sample_session_id := uuid_generate_v4();

    -- Insert default settings for each team in the database
    FOR team_record IN
        SELECT id, team_id, organization_id, hunt_id, display_name
        FROM teams
        ORDER BY organization_id, hunt_id, team_id
    LOOP
        INSERT INTO settings (team_id, organization_id, hunt_id, location_name, event_name, config)
        VALUES (
            team_record.id,
            team_record.organization_id,
            team_record.hunt_id,
            CASE
                WHEN team_record.organization_id = 'bhhs' THEN 'BHHS'
                WHEN team_record.organization_id = 'vail' THEN 'Vail Village'
                ELSE 'Default Location'
            END,
            CASE
                WHEN team_record.hunt_id = 'fall-2025' THEN 'Fall 2025'
                WHEN team_record.hunt_id = 'valley-default' THEN 'Valley Hunt'
                WHEN team_record.hunt_id = 'village-default' THEN 'Village Hunt'
                ELSE team_record.hunt_id
            END,
            jsonb_build_object(
                'sessionId', sample_session_id::text,
                'teamName', team_record.team_id,
                'locationName', CASE
                    WHEN team_record.organization_id = 'bhhs' THEN 'BHHS'
                    WHEN team_record.organization_id = 'vail' THEN 'Vail Village'
                    ELSE 'Default Location'
                END,
                'eventName', CASE
                    WHEN team_record.hunt_id = 'fall-2025' THEN 'Fall 2025'
                    WHEN team_record.hunt_id = 'valley-default' THEN 'Valley Hunt'
                    WHEN team_record.hunt_id = 'village-default' THEN 'Village Hunt'
                    ELSE team_record.hunt_id
                END,
                'organizationId', team_record.organization_id,
                'huntId', team_record.hunt_id,
                'displayName', team_record.display_name
            )
        )
        ON CONFLICT DO NOTHING; -- Avoid duplicates if run multiple times

        -- Log each insertion
        RAISE NOTICE 'Inserted settings for team: % (% - %)', team_record.display_name, team_record.organization_id, team_record.hunt_id;
    END LOOP;

    RAISE NOTICE 'Settings import completed successfully!';
END $$;

-- Display summary of settings data
SELECT
    'Settings Records Created' as summary,
    COUNT(*)::TEXT as count
FROM settings;

-- Display the settings that were created
SELECT
    s.location_name,
    s.event_name,
    t.display_name as team_name,
    t.organization_id,
    t.hunt_id,
    s.created_at
FROM settings s
JOIN teams t ON s.team_id = t.id
ORDER BY t.organization_id, t.hunt_id, t.display_name;