-- Supabase Migration Schema
-- Complete replacement for Netlify Blob Storage
-- This script creates all required tables, indexes, and RLS policies
-- IMPORTANT: This script is NON-DESTRUCTIVE - it only adds objects if they don't exist

-- Enable UUID extension (safe - uses IF NOT EXISTS)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. DEVICE LOCKS TABLE
-- Replaces: device-locks blob store
-- Used by: team-verify.js
-- ============================================
CREATE TABLE IF NOT EXISTS device_locks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_fingerprint TEXT UNIQUE NOT NULL,
    team_id TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes separately with IF NOT EXISTS
CREATE INDEX IF NOT EXISTS idx_device_locks_fingerprint ON device_locks(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_device_locks_expires_at ON device_locks(expires_at);
CREATE INDEX IF NOT EXISTS idx_device_locks_team_id ON device_locks(team_id);

-- Auto-cleanup expired locks (runs daily)
CREATE OR REPLACE FUNCTION cleanup_expired_device_locks()
RETURNS void AS $$
BEGIN
    DELETE FROM device_locks WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- RLS Policies (only enable if not already enabled)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'device_locks' AND rowsecurity = true) THEN
        ALTER TABLE device_locks ENABLE ROW LEVEL SECURITY;
    END IF;
END$$;

-- Service role can do everything (create only if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'device_locks'
        AND policyname = 'Service role full access'
    ) THEN
        CREATE POLICY "Service role full access" ON device_locks
            FOR ALL
            USING (auth.jwt() ->> 'role' = 'service_role');
    END IF;
END$$;

-- ============================================
-- 2. DEBUG LOGS TABLE
-- Replaces: logs blob store
-- Used by: write-log.js
-- ============================================
CREATE TABLE IF NOT EXISTS debug_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename TEXT NOT NULL,
    data JSONB NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    headers JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes separately with IF NOT EXISTS
CREATE INDEX IF NOT EXISTS idx_debug_logs_timestamp ON debug_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_debug_logs_filename ON debug_logs(filename);
CREATE INDEX IF NOT EXISTS idx_debug_logs_created_at ON debug_logs(created_at DESC);

-- Auto-cleanup old logs (30 days retention)
CREATE OR REPLACE FUNCTION cleanup_old_debug_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM debug_logs WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE debug_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON debug_logs
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- 3. KV STORE TABLE
-- Replaces: kv blob store
-- Used by: kv-upsert.js, kv-list.js
-- ============================================
CREATE TABLE IF NOT EXISTS kv_store (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    indexes TEXT[] DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Indexes for performance
    INDEX idx_kv_store_key ON kv_store(key),
    INDEX idx_kv_store_indexes ON kv_store USING GIN(indexes),
    INDEX idx_kv_store_updated_at ON kv_store(updated_at DESC)
);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_kv_store_updated_at
    BEFORE UPDATE ON kv_store
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE kv_store ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON kv_store
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- 4. TEAM PROGRESS TABLE
-- Replaces: vail-hunt-state blob store
-- Used by: teamStorage.js, leaderboard-get.js
-- ============================================
CREATE TABLE IF NOT EXISTS team_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id TEXT UNIQUE NOT NULL,
    org_id TEXT NOT NULL,
    hunt_id TEXT NOT NULL,
    progress JSONB DEFAULT '{}',
    score INTEGER DEFAULT 0,
    completed_stops INTEGER DEFAULT 0,
    total_stops INTEGER DEFAULT 0,
    percent_complete INTEGER DEFAULT 0,
    latest_activity TIMESTAMPTZ,
    version INTEGER DEFAULT 1, -- For optimistic locking
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Composite index for leaderboard queries
    INDEX idx_team_progress_leaderboard ON team_progress(org_id, hunt_id, percent_complete DESC, completed_stops DESC),
    INDEX idx_team_progress_team ON team_progress(team_id),
    INDEX idx_team_progress_org_hunt ON team_progress(org_id, hunt_id)
);

CREATE TRIGGER update_team_progress_updated_at
    BEFORE UPDATE ON team_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate progress stats
CREATE OR REPLACE FUNCTION calculate_progress_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate completed stops
    NEW.completed_stops = (
        SELECT COUNT(*)
        FROM jsonb_each(NEW.progress) AS p(key, value)
        WHERE p.value->>'done' = 'true'
    );

    -- Calculate total stops
    NEW.total_stops = jsonb_object_keys(NEW.progress)::INTEGER;

    -- Calculate percentage
    IF NEW.total_stops > 0 THEN
        NEW.percent_complete = ROUND((NEW.completed_stops::DECIMAL / NEW.total_stops) * 100);
    ELSE
        NEW.percent_complete = 0;
    END IF;

    -- Update latest activity
    NEW.latest_activity = NOW();

    -- Increment version for optimistic locking
    NEW.version = COALESCE(OLD.version, 0) + 1;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_team_progress_stats
    BEFORE INSERT OR UPDATE ON team_progress
    FOR EACH ROW
    EXECUTE FUNCTION calculate_progress_stats();

-- RLS Policies
ALTER TABLE team_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON team_progress
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- 5. TEAM MAPPINGS TABLE
-- Replaces: team-mappings blob store
-- Used by: team-verify.js
-- ============================================
CREATE TABLE IF NOT EXISTS team_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_code TEXT UNIQUE NOT NULL,
    team_id TEXT NOT NULL,
    team_name TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    hunt_id TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Indexes for performance
    INDEX idx_team_mappings_code ON team_mappings(team_code),
    INDEX idx_team_mappings_team_id ON team_mappings(team_id),
    INDEX idx_team_mappings_org_hunt ON team_mappings(organization_id, hunt_id),
    INDEX idx_team_mappings_active ON team_mappings(is_active) WHERE is_active = true
);

CREATE TRIGGER update_team_mappings_updated_at
    BEFORE UPDATE ON team_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE team_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON team_mappings
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- 6. HUNT SETTINGS TABLE
-- Replaces: hunt-data blob store
-- Used by: settings-get.js, settings-set.js
-- ============================================
CREATE TABLE IF NOT EXISTS hunt_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id TEXT NOT NULL,
    team_id TEXT NOT NULL,
    hunt_id TEXT NOT NULL,
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{"contributors": []}',
    last_modified_by TEXT,
    total_updates INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Composite unique constraint
    CONSTRAINT unique_org_team_hunt UNIQUE(org_id, team_id, hunt_id),

    -- Indexes
    INDEX idx_hunt_settings_composite ON hunt_settings(org_id, team_id, hunt_id),
    INDEX idx_hunt_settings_updated_at ON hunt_settings(updated_at DESC)
);

CREATE TRIGGER update_hunt_settings_updated_at
    BEFORE UPDATE ON hunt_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to update metadata
CREATE OR REPLACE FUNCTION update_hunt_settings_metadata()
RETURNS TRIGGER AS $$
BEGIN
    -- Increment total updates
    NEW.total_updates = COALESCE(OLD.total_updates, 0) + 1;

    -- Update contributor tracking in metadata
    IF NEW.last_modified_by IS NOT NULL THEN
        -- Check if contributor exists
        IF NOT EXISTS (
            SELECT 1
            FROM jsonb_array_elements(NEW.metadata->'contributors') AS c
            WHERE c->>'sessionId' = NEW.last_modified_by
        ) THEN
            -- Add new contributor
            NEW.metadata = jsonb_set(
                NEW.metadata,
                '{contributors}',
                (NEW.metadata->'contributors') || jsonb_build_object(
                    'sessionId', NEW.last_modified_by,
                    'firstActive', NOW(),
                    'lastActive', NOW()
                )
            );
        ELSE
            -- Update existing contributor's last active time
            NEW.metadata = jsonb_set(
                NEW.metadata,
                '{contributors}',
                (
                    SELECT jsonb_agg(
                        CASE
                            WHEN c->>'sessionId' = NEW.last_modified_by
                            THEN jsonb_set(c, '{lastActive}', to_jsonb(NOW()))
                            ELSE c
                        END
                    )
                    FROM jsonb_array_elements(NEW.metadata->'contributors') AS c
                )
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_hunt_settings_metadata_trigger
    BEFORE UPDATE ON hunt_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_hunt_settings_metadata();

-- RLS Policies
ALTER TABLE hunt_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON hunt_settings
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- 7. SCHEDULED JOBS
-- Set up periodic cleanup tasks
-- ============================================

-- Schedule daily cleanup of expired device locks
SELECT cron.schedule(
    'cleanup-expired-device-locks',
    '0 2 * * *', -- Run at 2 AM daily
    $$SELECT cleanup_expired_device_locks();$$
);

-- Schedule monthly cleanup of old debug logs
SELECT cron.schedule(
    'cleanup-old-debug-logs',
    '0 3 1 * *', -- Run at 3 AM on the first day of each month
    $$SELECT cleanup_old_debug_logs();$$
);

-- ============================================
-- 8. HELPER FUNCTIONS
-- Utility functions for common operations
-- ============================================

-- Function to get leaderboard data
CREATE OR REPLACE FUNCTION get_leaderboard(p_org_id TEXT, p_hunt_id TEXT)
RETURNS TABLE(
    rank INTEGER,
    team_id TEXT,
    completed_stops INTEGER,
    total_stops INTEGER,
    percent_complete INTEGER,
    latest_activity TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ROW_NUMBER() OVER (
            ORDER BY tp.percent_complete DESC,
                     tp.completed_stops DESC,
                     tp.latest_activity ASC
        )::INTEGER AS rank,
        tp.team_id,
        tp.completed_stops,
        tp.total_stops,
        tp.percent_complete,
        tp.latest_activity
    FROM team_progress tp
    WHERE tp.org_id = p_org_id
      AND tp.hunt_id = p_hunt_id
    ORDER BY rank;
END;
$$ LANGUAGE plpgsql;

-- Function to upsert KV with indexes
CREATE OR REPLACE FUNCTION upsert_kv_with_indexes(
    p_key TEXT,
    p_value JSONB,
    p_indexes TEXT[]
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO kv_store (key, value, indexes)
    VALUES (p_key, p_value, COALESCE(p_indexes, '{}'))
    ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        indexes = EXCLUDED.indexes,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. MIGRATION HELPERS
-- Functions to help with data migration
-- ============================================

-- Function to migrate blob data (to be called from migration script)
CREATE OR REPLACE FUNCTION migrate_blob_data(
    p_table_name TEXT,
    p_data JSONB
)
RETURNS VOID AS $$
BEGIN
    -- This is a placeholder for migration logic
    -- Actual implementation will depend on the specific blob structure
    RAISE NOTICE 'Migrating data to table: %', p_table_name;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 10. MONITORING VIEWS
-- Views for monitoring and debugging
-- ============================================

-- View for active device locks
CREATE OR REPLACE VIEW active_device_locks AS
SELECT
    device_fingerprint,
    team_id,
    expires_at,
    EXTRACT(EPOCH FROM (expires_at - NOW())) AS seconds_remaining
FROM device_locks
WHERE expires_at > NOW()
ORDER BY expires_at DESC;

-- View for recent debug logs
CREATE OR REPLACE VIEW recent_debug_logs AS
SELECT
    id,
    filename,
    timestamp,
    ip_address,
    jsonb_array_length(COALESCE(data->'errors', '[]'::jsonb)) AS error_count,
    created_at
FROM debug_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 100;

-- View for team leaderboard summary
CREATE OR REPLACE VIEW leaderboard_summary AS
SELECT
    org_id,
    hunt_id,
    COUNT(*) AS total_teams,
    AVG(percent_complete) AS avg_completion,
    MAX(percent_complete) AS max_completion,
    COUNT(*) FILTER (WHERE percent_complete = 100) AS completed_teams
FROM team_progress
GROUP BY org_id, hunt_id;

-- ============================================
-- 11. GRANTS AND PERMISSIONS
-- Set up proper permissions
-- ============================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant select permissions for anon users (read-only)
GRANT SELECT ON active_device_locks TO anon;
GRANT SELECT ON leaderboard_summary TO anon;

-- Note: Additional grants will be needed based on your specific auth setup

-- ============================================
-- END OF SCHEMA
-- ============================================