-- Supabase Tables Creation (Simplified Version)
-- This creates only the essential tables without scheduled jobs
-- Safe to run multiple times - uses IF NOT EXISTS

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. DEVICE LOCKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS device_locks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_fingerprint TEXT UNIQUE NOT NULL,
    team_id TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_device_locks_fingerprint ON device_locks(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_device_locks_expires_at ON device_locks(expires_at);
CREATE INDEX IF NOT EXISTS idx_device_locks_team_id ON device_locks(team_id);

-- ============================================
-- 2. DEBUG LOGS TABLE
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_debug_logs_timestamp ON debug_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_debug_logs_filename ON debug_logs(filename);
CREATE INDEX IF NOT EXISTS idx_debug_logs_created_at ON debug_logs(created_at DESC);

-- ============================================
-- 3. KV STORE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS kv_store (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    indexes TEXT[] DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_kv_store_key ON kv_store(key);
CREATE INDEX IF NOT EXISTS idx_kv_store_indexes ON kv_store USING GIN(indexes);
CREATE INDEX IF NOT EXISTS idx_kv_store_updated_at ON kv_store(updated_at DESC);

-- ============================================
-- 4. TEAM PROGRESS TABLE
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
    version INTEGER DEFAULT 1,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_team_progress_leaderboard ON team_progress(org_id, hunt_id, percent_complete DESC, completed_stops DESC);
CREATE INDEX IF NOT EXISTS idx_team_progress_team ON team_progress(team_id);
CREATE INDEX IF NOT EXISTS idx_team_progress_org_hunt ON team_progress(org_id, hunt_id);

-- ============================================
-- 5. TEAM MAPPINGS TABLE
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
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_team_mappings_code ON team_mappings(team_code);
CREATE INDEX IF NOT EXISTS idx_team_mappings_team_id ON team_mappings(team_id);
CREATE INDEX IF NOT EXISTS idx_team_mappings_org_hunt ON team_mappings(organization_id, hunt_id);
CREATE INDEX IF NOT EXISTS idx_team_mappings_active ON team_mappings(is_active) WHERE is_active = true;

-- ============================================
-- 6. HUNT SETTINGS TABLE
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
    CONSTRAINT unique_org_team_hunt UNIQUE(org_id, team_id, hunt_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_hunt_settings_composite ON hunt_settings(org_id, team_id, hunt_id);
CREATE INDEX IF NOT EXISTS idx_hunt_settings_updated_at ON hunt_settings(updated_at DESC);

-- ============================================
-- BASIC FUNCTIONS
-- ============================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
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

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE device_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE debug_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE kv_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE hunt_settings ENABLE ROW LEVEL SECURITY;

-- Create service role policies (only if they don't exist)
DO $$
BEGIN
    -- Check and create policy for each table
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'device_locks'
        AND policyname = 'Service role full access'
    ) THEN
        CREATE POLICY "Service role full access" ON device_locks
            FOR ALL
            USING (auth.jwt() ->> 'role' = 'service_role');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'debug_logs'
        AND policyname = 'Service role full access'
    ) THEN
        CREATE POLICY "Service role full access" ON debug_logs
            FOR ALL
            USING (auth.jwt() ->> 'role' = 'service_role');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'kv_store'
        AND policyname = 'Service role full access'
    ) THEN
        CREATE POLICY "Service role full access" ON kv_store
            FOR ALL
            USING (auth.jwt() ->> 'role' = 'service_role');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'team_progress'
        AND policyname = 'Service role full access'
    ) THEN
        CREATE POLICY "Service role full access" ON team_progress
            FOR ALL
            USING (auth.jwt() ->> 'role' = 'service_role');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'team_mappings'
        AND policyname = 'Service role full access'
    ) THEN
        CREATE POLICY "Service role full access" ON team_mappings
            FOR ALL
            USING (auth.jwt() ->> 'role' = 'service_role');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'hunt_settings'
        AND policyname = 'Service role full access'
    ) THEN
        CREATE POLICY "Service role full access" ON hunt_settings
            FOR ALL
            USING (auth.jwt() ->> 'role' = 'service_role');
    END IF;
END$$;

-- ============================================
-- SUMMARY
-- ============================================
DO $$
DECLARE
    table_count INTEGER;
    index_count INTEGER;
BEGIN
    -- Count tables
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('device_locks', 'debug_logs', 'kv_store', 'team_progress', 'team_mappings', 'hunt_settings');

    -- Count indexes
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename IN ('device_locks', 'debug_logs', 'kv_store', 'team_progress', 'team_mappings', 'hunt_settings');

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Table Creation Summary:';
    RAISE NOTICE '  Tables created: %/6', table_count;
    RAISE NOTICE '  Indexes created: %', index_count;
    RAISE NOTICE '  RLS enabled on all tables';
    RAISE NOTICE '  Service role policies created';
    RAISE NOTICE '========================================';
END$$;