-- Supabase Migration Schema (SAFE VERSION)
-- NON-DESTRUCTIVE: Only adds objects if they don't exist
-- Will not delete or modify existing data
-- Safe to run multiple times

-- ============================================
-- EXTENSION SETUP
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Note: pg_cron may not be available in all Supabase plans
-- It will be created later if available

-- ============================================
-- HELPER FUNCTION TO CHECK TABLE EXISTS
-- ============================================
CREATE OR REPLACE FUNCTION table_exists(tbl_name text)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM information_schema.tables t
        WHERE t.table_schema = 'public'
        AND t.table_name = tbl_name
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 1. DEVICE LOCKS TABLE
-- ============================================
DO $$
BEGIN
    IF NOT table_exists('device_locks') THEN
        CREATE TABLE device_locks (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            device_fingerprint TEXT UNIQUE NOT NULL,
            team_id TEXT NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        RAISE NOTICE 'Created table: device_locks';
    ELSE
        -- Add columns if they don't exist
        ALTER TABLE device_locks ADD COLUMN IF NOT EXISTS id UUID DEFAULT uuid_generate_v4();
        ALTER TABLE device_locks ADD COLUMN IF NOT EXISTS device_fingerprint TEXT;
        ALTER TABLE device_locks ADD COLUMN IF NOT EXISTS team_id TEXT;
        ALTER TABLE device_locks ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
        ALTER TABLE device_locks ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Table device_locks already exists - added missing columns if any';
    END IF;
END$$;

-- Create indexes (safe - uses IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_device_locks_fingerprint ON device_locks(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_device_locks_expires_at ON device_locks(expires_at);
CREATE INDEX IF NOT EXISTS idx_device_locks_team_id ON device_locks(team_id);

-- ============================================
-- 2. DEBUG LOGS TABLE
-- ============================================
DO $$
BEGIN
    IF NOT table_exists('debug_logs') THEN
        CREATE TABLE debug_logs (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            filename TEXT NOT NULL,
            data JSONB NOT NULL,
            timestamp TIMESTAMPTZ NOT NULL,
            headers JSONB,
            ip_address TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        RAISE NOTICE 'Created table: debug_logs';
    ELSE
        -- Add columns if they don't exist
        ALTER TABLE debug_logs ADD COLUMN IF NOT EXISTS id UUID DEFAULT uuid_generate_v4();
        ALTER TABLE debug_logs ADD COLUMN IF NOT EXISTS filename TEXT;
        ALTER TABLE debug_logs ADD COLUMN IF NOT EXISTS data JSONB;
        ALTER TABLE debug_logs ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ;
        ALTER TABLE debug_logs ADD COLUMN IF NOT EXISTS headers JSONB;
        ALTER TABLE debug_logs ADD COLUMN IF NOT EXISTS ip_address TEXT;
        ALTER TABLE debug_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Table debug_logs already exists - added missing columns if any';
    END IF;
END$$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_debug_logs_timestamp ON debug_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_debug_logs_filename ON debug_logs(filename);
CREATE INDEX IF NOT EXISTS idx_debug_logs_created_at ON debug_logs(created_at DESC);

-- ============================================
-- 3. KV STORE TABLE
-- ============================================
DO $$
BEGIN
    IF NOT table_exists('kv_store') THEN
        CREATE TABLE kv_store (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            key TEXT UNIQUE NOT NULL,
            value JSONB NOT NULL,
            indexes TEXT[] DEFAULT '{}',
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        RAISE NOTICE 'Created table: kv_store';
    ELSE
        -- Add columns if they don't exist
        ALTER TABLE kv_store ADD COLUMN IF NOT EXISTS id UUID DEFAULT uuid_generate_v4();
        ALTER TABLE kv_store ADD COLUMN IF NOT EXISTS key TEXT;
        ALTER TABLE kv_store ADD COLUMN IF NOT EXISTS value JSONB;
        ALTER TABLE kv_store ADD COLUMN IF NOT EXISTS indexes TEXT[] DEFAULT '{}';
        ALTER TABLE kv_store ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE kv_store ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Table kv_store already exists - added missing columns if any';
    END IF;
END$$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_kv_store_key ON kv_store(key);
CREATE INDEX IF NOT EXISTS idx_kv_store_indexes ON kv_store USING GIN(indexes);
CREATE INDEX IF NOT EXISTS idx_kv_store_updated_at ON kv_store(updated_at DESC);

-- ============================================
-- 4. TEAM PROGRESS TABLE
-- ============================================
DO $$
BEGIN
    IF NOT table_exists('team_progress') THEN
        CREATE TABLE team_progress (
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
            version INTEGER DEFAULT 1,
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        RAISE NOTICE 'Created table: team_progress';
    ELSE
        -- Add columns if they don't exist
        ALTER TABLE team_progress ADD COLUMN IF NOT EXISTS id UUID DEFAULT uuid_generate_v4();
        ALTER TABLE team_progress ADD COLUMN IF NOT EXISTS team_id TEXT;
        ALTER TABLE team_progress ADD COLUMN IF NOT EXISTS org_id TEXT;
        ALTER TABLE team_progress ADD COLUMN IF NOT EXISTS hunt_id TEXT;
        ALTER TABLE team_progress ADD COLUMN IF NOT EXISTS progress JSONB DEFAULT '{}';
        ALTER TABLE team_progress ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;
        ALTER TABLE team_progress ADD COLUMN IF NOT EXISTS completed_stops INTEGER DEFAULT 0;
        ALTER TABLE team_progress ADD COLUMN IF NOT EXISTS total_stops INTEGER DEFAULT 0;
        ALTER TABLE team_progress ADD COLUMN IF NOT EXISTS percent_complete INTEGER DEFAULT 0;
        ALTER TABLE team_progress ADD COLUMN IF NOT EXISTS latest_activity TIMESTAMPTZ;
        ALTER TABLE team_progress ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
        ALTER TABLE team_progress ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE team_progress ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Table team_progress already exists - added missing columns if any';
    END IF;
END$$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_team_progress_leaderboard ON team_progress(org_id, hunt_id, percent_complete DESC, completed_stops DESC);
CREATE INDEX IF NOT EXISTS idx_team_progress_team ON team_progress(team_id);
CREATE INDEX IF NOT EXISTS idx_team_progress_org_hunt ON team_progress(org_id, hunt_id);

-- ============================================
-- 5. TEAM MAPPINGS TABLE
-- ============================================
DO $$
BEGIN
    IF NOT table_exists('team_mappings') THEN
        CREATE TABLE team_mappings (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            team_code TEXT UNIQUE NOT NULL,
            team_id TEXT NOT NULL,
            team_name TEXT NOT NULL,
            organization_id TEXT NOT NULL,
            hunt_id TEXT NOT NULL,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        RAISE NOTICE 'Created table: team_mappings';
    ELSE
        -- Add columns if they don't exist
        ALTER TABLE team_mappings ADD COLUMN IF NOT EXISTS id UUID DEFAULT uuid_generate_v4();
        ALTER TABLE team_mappings ADD COLUMN IF NOT EXISTS team_code TEXT;
        ALTER TABLE team_mappings ADD COLUMN IF NOT EXISTS team_id TEXT;
        ALTER TABLE team_mappings ADD COLUMN IF NOT EXISTS team_name TEXT;
        ALTER TABLE team_mappings ADD COLUMN IF NOT EXISTS organization_id TEXT;
        ALTER TABLE team_mappings ADD COLUMN IF NOT EXISTS hunt_id TEXT;
        ALTER TABLE team_mappings ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
        ALTER TABLE team_mappings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE team_mappings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Table team_mappings already exists - added missing columns if any';
    END IF;
END$$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_team_mappings_code ON team_mappings(team_code);
CREATE INDEX IF NOT EXISTS idx_team_mappings_team_id ON team_mappings(team_id);
CREATE INDEX IF NOT EXISTS idx_team_mappings_org_hunt ON team_mappings(organization_id, hunt_id);
CREATE INDEX IF NOT EXISTS idx_team_mappings_active ON team_mappings(is_active) WHERE is_active = true;

-- ============================================
-- 6. HUNT SETTINGS TABLE
-- ============================================
DO $$
BEGIN
    IF NOT table_exists('hunt_settings') THEN
        CREATE TABLE hunt_settings (
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
            CONSTRAINT unique_org_team_hunt UNIQUE(org_id, team_id, hunt_id)
        );
        RAISE NOTICE 'Created table: hunt_settings';
    ELSE
        -- Add columns if they don't exist
        ALTER TABLE hunt_settings ADD COLUMN IF NOT EXISTS id UUID DEFAULT uuid_generate_v4();
        ALTER TABLE hunt_settings ADD COLUMN IF NOT EXISTS org_id TEXT;
        ALTER TABLE hunt_settings ADD COLUMN IF NOT EXISTS team_id TEXT;
        ALTER TABLE hunt_settings ADD COLUMN IF NOT EXISTS hunt_id TEXT;
        ALTER TABLE hunt_settings ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';
        ALTER TABLE hunt_settings ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{"contributors": []}';
        ALTER TABLE hunt_settings ADD COLUMN IF NOT EXISTS last_modified_by TEXT;
        ALTER TABLE hunt_settings ADD COLUMN IF NOT EXISTS total_updates INTEGER DEFAULT 0;
        ALTER TABLE hunt_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE hunt_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

        -- Add unique constraint if not exists
        DO $constraint$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'unique_org_team_hunt'
            ) THEN
                ALTER TABLE hunt_settings ADD CONSTRAINT unique_org_team_hunt UNIQUE(org_id, team_id, hunt_id);
            END IF;
        END $constraint$;

        RAISE NOTICE 'Table hunt_settings already exists - added missing columns if any';
    END IF;
END$$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_hunt_settings_composite ON hunt_settings(org_id, team_id, hunt_id);
CREATE INDEX IF NOT EXISTS idx_hunt_settings_updated_at ON hunt_settings(updated_at DESC);

-- ============================================
-- UTILITY FUNCTIONS (CREATE OR REPLACE is safe)
-- ============================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Cleanup expired device locks
CREATE OR REPLACE FUNCTION cleanup_expired_device_locks()
RETURNS void AS $$
BEGIN
    DELETE FROM device_locks WHERE expires_at < NOW();
    RAISE NOTICE 'Cleaned up expired device locks';
END;
$$ LANGUAGE plpgsql;

-- Cleanup old debug logs
CREATE OR REPLACE FUNCTION cleanup_old_debug_logs()
RETURNS void AS $$
DECLARE
    retention_days INTEGER;
    deleted_count INTEGER;
BEGIN
    -- Get retention period from environment or use default 30 days
    retention_days := COALESCE(
        current_setting('app.log_retention_days', true)::INTEGER,
        30
    );

    DELETE FROM debug_logs
    WHERE created_at < NOW() - INTERVAL '1 day' * retention_days;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % old debug logs (retention: % days)', deleted_count, retention_days;
END;
$$ LANGUAGE plpgsql;

-- Calculate progress stats
CREATE OR REPLACE FUNCTION calculate_progress_stats()
RETURNS TRIGGER AS $$
DECLARE
    stop_count INTEGER;
BEGIN
    -- Calculate completed stops
    SELECT COUNT(*)
    INTO stop_count
    FROM jsonb_each(NEW.progress) AS p(key, value)
    WHERE p.value->>'done' = 'true';

    NEW.completed_stops = stop_count;

    -- Calculate total stops
    SELECT COUNT(*)
    INTO stop_count
    FROM jsonb_object_keys(NEW.progress);

    NEW.total_stops = stop_count;

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

-- Update hunt settings metadata
CREATE OR REPLACE FUNCTION update_hunt_settings_metadata()
RETURNS TRIGGER AS $$
BEGIN
    -- Increment total updates
    NEW.total_updates = COALESCE(OLD.total_updates, 0) + 1;

    -- Update contributor tracking in metadata
    IF NEW.last_modified_by IS NOT NULL THEN
        -- This is complex JSON manipulation, keeping it simple
        NEW.metadata = jsonb_set(
            COALESCE(NEW.metadata, '{"contributors": []}'::jsonb),
            '{lastModifiedAt}',
            to_jsonb(NOW())
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS (CREATE OR REPLACE for safety)
-- ============================================

-- Drop and recreate triggers to ensure they're up to date
DROP TRIGGER IF EXISTS update_kv_store_updated_at ON kv_store;
CREATE TRIGGER update_kv_store_updated_at
    BEFORE UPDATE ON kv_store
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_team_progress_updated_at ON team_progress;
CREATE TRIGGER update_team_progress_updated_at
    BEFORE UPDATE ON team_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS calculate_team_progress_stats ON team_progress;
CREATE TRIGGER calculate_team_progress_stats
    BEFORE INSERT OR UPDATE ON team_progress
    FOR EACH ROW
    EXECUTE FUNCTION calculate_progress_stats();

DROP TRIGGER IF EXISTS update_team_mappings_updated_at ON team_mappings;
CREATE TRIGGER update_team_mappings_updated_at
    BEFORE UPDATE ON team_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_hunt_settings_updated_at ON hunt_settings;
CREATE TRIGGER update_hunt_settings_updated_at
    BEFORE UPDATE ON hunt_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_hunt_settings_metadata_trigger ON hunt_settings;
CREATE TRIGGER update_hunt_settings_metadata_trigger
    BEFORE UPDATE ON hunt_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_hunt_settings_metadata();

-- ============================================
-- RLS POLICIES (Safe - only create if not exists)
-- ============================================

-- Enable RLS only if not already enabled
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
        AND tablename IN ('device_locks', 'debug_logs', 'kv_store', 'team_progress', 'team_mappings', 'hunt_settings')
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        RAISE NOTICE 'Enabled RLS for table: %', t;
    END LOOP;
END$$;

-- Create policies only if they don't exist
DO $$
DECLARE
    t TEXT;
    policy_name TEXT := 'Service role full access';
BEGIN
    FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
        AND tablename IN ('device_locks', 'debug_logs', 'kv_store', 'team_progress', 'team_mappings', 'hunt_settings')
    LOOP
        -- Check if policy exists
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE tablename = t
            AND policyname = policy_name
        ) THEN
            EXECUTE format('CREATE POLICY %I ON %I FOR ALL USING (auth.jwt() ->> %L = %L)',
                policy_name, t, 'role', 'service_role');
            RAISE NOTICE 'Created policy % for table: %', policy_name, t;
        END IF;
    END LOOP;
END$$;

-- ============================================
-- HELPER VIEWS (CREATE OR REPLACE is safe)
-- ============================================

-- Active device locks view
CREATE OR REPLACE VIEW active_device_locks AS
SELECT
    device_fingerprint,
    team_id,
    expires_at,
    EXTRACT(EPOCH FROM (expires_at - NOW())) AS seconds_remaining
FROM device_locks
WHERE expires_at > NOW()
ORDER BY expires_at DESC;

-- Recent debug logs view
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

-- Leaderboard summary view
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
-- HELPER FUNCTIONS FOR QUERIES
-- ============================================

-- Get leaderboard function
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

-- Upsert KV with indexes
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
-- SCHEDULED JOBS (Only if pg_cron is available)
-- ============================================
-- Note: pg_cron may not be available in all Supabase plans
-- You can run cleanup functions manually or via external schedulers
DO $$
BEGIN
    -- Check if pg_cron extension exists
    IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
        -- Try to create the extension if not already created
        CREATE EXTENSION IF NOT EXISTS pg_cron;

        -- Check if pg_cron is now available
        IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
            -- Remove existing schedules if they exist
            DELETE FROM cron.job WHERE jobname IN ('cleanup-expired-device-locks', 'cleanup-old-debug-logs');

            -- Schedule daily cleanup of expired device locks
            INSERT INTO cron.job (jobname, schedule, command)
            VALUES (
                'cleanup-expired-device-locks',
                '0 2 * * *', -- Run at 2 AM daily
                'SELECT cleanup_expired_device_locks();'
            );

            -- Schedule monthly cleanup of old debug logs
            INSERT INTO cron.job (jobname, schedule, command)
            VALUES (
                'cleanup-old-debug-logs',
                '0 3 1 * *', -- Run at 3 AM on the first day of each month
                'SELECT cleanup_old_debug_logs();'
            );

            RAISE NOTICE 'Scheduled cleanup jobs created successfully';
        ELSE
            RAISE NOTICE 'pg_cron extension could not be enabled';
        END IF;
    ELSE
        RAISE NOTICE 'pg_cron not available - cleanup jobs not scheduled. Run cleanup functions manually.';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not create scheduled jobs: %. This is not critical - you can run cleanup functions manually.', SQLERRM;
END$$;

-- ============================================
-- VALIDATION QUERIES
-- ============================================

-- Show what was created/exists
DO $$
DECLARE
    table_count INTEGER;
    index_count INTEGER;
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('device_locks', 'debug_logs', 'kv_store', 'team_progress', 'team_mappings', 'hunt_settings');

    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename IN ('device_locks', 'debug_logs', 'kv_store', 'team_progress', 'team_mappings', 'hunt_settings');

    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename IN ('device_locks', 'debug_logs', 'kv_store', 'team_progress', 'team_mappings', 'hunt_settings');

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration Summary:';
    RAISE NOTICE '  Tables ready: %/6', table_count;
    RAISE NOTICE '  Indexes created: %', index_count;
    RAISE NOTICE '  RLS policies: %', policy_count;
    RAISE NOTICE '========================================';
END$$;