-- Supabase Data Import Script for Vail Scavenger Hunt
-- This script populates the database with organizations, hunts, teams, and sample data
-- Run this in the Supabase SQL Editor after running the schema script

-- Insert Organizations
INSERT INTO organizations (id, name) VALUES
  ('bhhs', 'Berkshire Hathaway HomeServices'),
  ('vail', 'Vail Valley')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = NOW();

-- Insert Hunts
INSERT INTO hunts (id, organization_id, name, start_date, end_date, is_active) VALUES
  ('fall-2025', 'bhhs', 'Fall 2025 Hunt', '2025-09-01', '2025-11-30', true),
  ('valley-default', 'vail', 'Valley Default Hunt', '2025-01-01', '2025-12-31', true),
  ('village-default', 'vail', 'Village Default Hunt', '2025-01-01', '2025-12-31', true)
ON CONFLICT (organization_id, id) DO UPDATE SET
  name = EXCLUDED.name,
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Insert Teams for BHHS Fall 2025 Hunt
INSERT INTO teams (team_id, organization_id, hunt_id, name, display_name, score) VALUES
  ('berrypicker', 'bhhs', 'fall-2025', 'berrypicker', 'Berrypicker', 0),
  ('poppyfieldswest', 'bhhs', 'fall-2025', 'poppyfieldswest', 'Poppyfields West', 0),
  ('teacup', 'bhhs', 'fall-2025', 'teacup', 'Tea Cup', 0),
  ('simba', 'bhhs', 'fall-2025', 'simba', 'Simba', 0),
  ('whippersnapper', 'bhhs', 'fall-2025', 'whippersnapper', 'Whippersnapper', 0),
  ('minniesmile', 'bhhs', 'fall-2025', 'minniesmile', 'Minnie''s Mile', 0),
  ('bornfree', 'bhhs', 'fall-2025', 'bornfree', 'Born Free', 0),
  ('lookma', 'bhhs', 'fall-2025', 'lookma', 'Look Ma', 0),
  ('loversleap', 'bhhs', 'fall-2025', 'loversleap', 'Lover''s Leap', 0),
  ('forever', 'bhhs', 'fall-2025', 'forever', 'Forever', 0)
ON CONFLICT (organization_id, team_id, hunt_id) DO UPDATE SET
  name = EXCLUDED.name,
  display_name = EXCLUDED.display_name,
  updated_at = NOW();

-- Get team UUIDs for team codes (we need to reference the actual team records)
DO $$
DECLARE
    team_uuid UUID;
    team_record RECORD;
BEGIN
    -- Insert team codes for BHHS teams
    FOR team_record IN
        SELECT id, team_id, organization_id, hunt_id
        FROM teams
        WHERE organization_id = 'bhhs' AND hunt_id = 'fall-2025'
    LOOP
        -- Generate team code based on team_id (first letters + numbers)
        CASE team_record.team_id
            WHEN 'berrypicker' THEN
                INSERT INTO team_codes (code, team_id, organization_id, hunt_id, is_active, max_uses)
                VALUES ('BERRY01', team_record.id, team_record.organization_id, team_record.hunt_id, true, NULL)
                ON CONFLICT (code) DO UPDATE SET
                    team_id = EXCLUDED.team_id,
                    is_active = EXCLUDED.is_active;

            WHEN 'poppyfieldswest' THEN
                INSERT INTO team_codes (code, team_id, organization_id, hunt_id, is_active, max_uses)
                VALUES ('POPPY01', team_record.id, team_record.organization_id, team_record.hunt_id, true, NULL)
                ON CONFLICT (code) DO UPDATE SET
                    team_id = EXCLUDED.team_id,
                    is_active = EXCLUDED.is_active;

            WHEN 'teacup' THEN
                INSERT INTO team_codes (code, team_id, organization_id, hunt_id, is_active, max_uses)
                VALUES ('TEACUP01', team_record.id, team_record.organization_id, team_record.hunt_id, true, NULL)
                ON CONFLICT (code) DO UPDATE SET
                    team_id = EXCLUDED.team_id,
                    is_active = EXCLUDED.is_active;

            WHEN 'simba' THEN
                INSERT INTO team_codes (code, team_id, organization_id, hunt_id, is_active, max_uses)
                VALUES ('SIMBA01', team_record.id, team_record.organization_id, team_record.hunt_id, true, NULL)
                ON CONFLICT (code) DO UPDATE SET
                    team_id = EXCLUDED.team_id,
                    is_active = EXCLUDED.is_active;

            WHEN 'whippersnapper' THEN
                INSERT INTO team_codes (code, team_id, organization_id, hunt_id, is_active, max_uses)
                VALUES ('WHIP01', team_record.id, team_record.organization_id, team_record.hunt_id, true, NULL)
                ON CONFLICT (code) DO UPDATE SET
                    team_id = EXCLUDED.team_id,
                    is_active = EXCLUDED.is_active;

            WHEN 'minniesmile' THEN
                INSERT INTO team_codes (code, team_id, organization_id, hunt_id, is_active, max_uses)
                VALUES ('MINNIE01', team_record.id, team_record.organization_id, team_record.hunt_id, true, NULL)
                ON CONFLICT (code) DO UPDATE SET
                    team_id = EXCLUDED.team_id,
                    is_active = EXCLUDED.is_active;

            WHEN 'bornfree' THEN
                INSERT INTO team_codes (code, team_id, organization_id, hunt_id, is_active, max_uses)
                VALUES ('BORN01', team_record.id, team_record.organization_id, team_record.hunt_id, true, NULL)
                ON CONFLICT (code) DO UPDATE SET
                    team_id = EXCLUDED.team_id,
                    is_active = EXCLUDED.is_active;

            WHEN 'lookma' THEN
                INSERT INTO team_codes (code, team_id, organization_id, hunt_id, is_active, max_uses)
                VALUES ('LOOKMA01', team_record.id, team_record.organization_id, team_record.hunt_id, true, NULL)
                ON CONFLICT (code) DO UPDATE SET
                    team_id = EXCLUDED.team_id,
                    is_active = EXCLUDED.is_active;

            WHEN 'loversleap' THEN
                INSERT INTO team_codes (code, team_id, organization_id, hunt_id, is_active, max_uses)
                VALUES ('LOVERS01', team_record.id, team_record.organization_id, team_record.hunt_id, true, NULL)
                ON CONFLICT (code) DO UPDATE SET
                    team_id = EXCLUDED.team_id,
                    is_active = EXCLUDED.is_active;

            WHEN 'forever' THEN
                INSERT INTO team_codes (code, team_id, organization_id, hunt_id, is_active, max_uses)
                VALUES ('FOREVER01', team_record.id, team_record.organization_id, team_record.hunt_id, true, NULL)
                ON CONFLICT (code) DO UPDATE SET
                    team_id = EXCLUDED.team_id,
                    is_active = EXCLUDED.is_active;
        END CASE;
    END LOOP;
END $$;

-- Add a generic test team code that was referenced in the app
INSERT INTO teams (team_id, organization_id, hunt_id, name, display_name, score) VALUES
  ('team-alpha', 'bhhs', 'fall-2025', 'team-alpha', 'Team Alpha', 0)
ON CONFLICT (organization_id, team_id, hunt_id) DO UPDATE SET
  name = EXCLUDED.name,
  display_name = EXCLUDED.display_name,
  updated_at = NOW();

-- Add the ALPHA01 code that's referenced in the app
DO $$
DECLARE
    alpha_team_id UUID;
BEGIN
    SELECT id INTO alpha_team_id FROM teams
    WHERE organization_id = 'bhhs' AND team_id = 'team-alpha' AND hunt_id = 'fall-2025';

    INSERT INTO team_codes (code, team_id, organization_id, hunt_id, is_active, max_uses)
    VALUES ('ALPHA01', alpha_team_id, 'bhhs', 'fall-2025', true, NULL)
    ON CONFLICT (code) DO UPDATE SET
        team_id = EXCLUDED.team_id,
        is_active = EXCLUDED.is_active;
END $$;

-- Insert sample settings entries for each team
DO $$
DECLARE
    team_record RECORD;
    sample_session_id UUID;
BEGIN
    -- Generate a sample session ID for settings
    sample_session_id := uuid_generate_v4();

    -- Insert default settings for each BHHS team
    FOR team_record IN
        SELECT id, team_id, organization_id, hunt_id
        FROM teams
        WHERE organization_id = 'bhhs' AND hunt_id = 'fall-2025'
    LOOP
        INSERT INTO settings (team_id, organization_id, hunt_id, location_name, event_name, config)
        VALUES (
            team_record.id,
            team_record.organization_id,
            team_record.hunt_id,
            'BHHS', -- Default location name
            'Fall 2025', -- Default event name
            jsonb_build_object(
                'sessionId', sample_session_id::text,
                'teamName', team_record.team_id,
                'locationName', 'BHHS',
                'eventName', 'Fall 2025',
                'organizationId', team_record.organization_id,
                'huntId', team_record.hunt_id
            )
        )
        ON CONFLICT DO NOTHING; -- Avoid duplicates if run multiple times
    END LOOP;
END $$;

-- Create some sample hunt progress entries to test the system
DO $$
DECLARE
    team_record RECORD;
    locations TEXT[] := ARRAY['covered-bridge', 'chair-lift', 'gore-range', 'public-art', 'waters-edge', 'mountain-view', 'hidden-gem', 'local-flavor', 'adventure-spot', 'photo-perfect'];
    location_name TEXT;
    random_done BOOLEAN;
BEGIN
    -- For demonstration purposes, add some random progress for a few teams
    FOR team_record IN
        SELECT id, team_id
        FROM teams
        WHERE organization_id = 'bhhs' AND hunt_id = 'fall-2025'
        AND team_id IN ('berrypicker', 'team-alpha', 'teacup')
    LOOP
        -- Add progress for each location with some randomness
        FOREACH location_name IN ARRAY locations
        LOOP
            -- Randomly decide if this location is completed (30% chance)
            random_done := (random() < 0.3);

            INSERT INTO hunt_progress (
                team_id,
                location_id,
                done,
                notes,
                photo_url,
                revealed_hints,
                completed_at
            )
            VALUES (
                team_record.id,
                location_name,
                random_done,
                CASE
                    WHEN random_done THEN 'Great photo spot!'
                    ELSE NULL
                END,
                CASE
                    WHEN random_done THEN 'https://example.com/photo.jpg'
                    ELSE NULL
                END,
                floor(random() * 3)::INTEGER, -- 0-2 hints revealed
                CASE
                    WHEN random_done THEN NOW() - (random() * interval '7 days')
                    ELSE NULL
                END
            )
            ON CONFLICT (team_id, location_id) DO UPDATE SET
                done = EXCLUDED.done,
                notes = EXCLUDED.notes,
                photo_url = EXCLUDED.photo_url,
                revealed_hints = EXCLUDED.revealed_hints,
                completed_at = EXCLUDED.completed_at,
                updated_at = NOW();
        END LOOP;
    END LOOP;
END $$;

-- Display summary of imported data
SELECT
    'Organizations' as table_name,
    COUNT(*)::TEXT as record_count
FROM organizations
UNION ALL
SELECT
    'Hunts' as table_name,
    COUNT(*)::TEXT as record_count
FROM hunts
UNION ALL
SELECT
    'Teams' as table_name,
    COUNT(*)::TEXT as record_count
FROM teams
UNION ALL
SELECT
    'Team Codes' as table_name,
    COUNT(*)::TEXT as record_count
FROM team_codes
UNION ALL
SELECT
    'Settings' as table_name,
    COUNT(*)::TEXT as record_count
FROM settings
UNION ALL
SELECT
    'Hunt Progress' as table_name,
    COUNT(*)::TEXT as record_count
FROM hunt_progress
ORDER BY table_name;

-- Display team codes for reference
SELECT
    tc.code,
    t.display_name as team_name,
    t.organization_id,
    t.hunt_id,
    tc.is_active
FROM team_codes tc
JOIN teams t ON tc.team_id = t.id
ORDER BY tc.code;