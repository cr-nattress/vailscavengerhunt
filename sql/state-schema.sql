-- Application state table
CREATE TABLE IF NOT EXISTS application_state (
    state_key TEXT NOT NULL,
    state_value JSONB NOT NULL,
    state_type TEXT DEFAULT 'session', -- 'session', 'persistent', 'cache'
    organization_id TEXT,
    team_id TEXT,
    hunt_id TEXT,
    user_session_id TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,

    PRIMARY KEY (state_key, organization_id, team_id, user_session_id)
);

-- Enable RLS for security
ALTER TABLE application_state ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access on application_state"
ON application_state FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_app_state_org_team ON application_state(organization_id, team_id);
CREATE INDEX IF NOT EXISTS idx_app_state_session ON application_state(user_session_id);
CREATE INDEX IF NOT EXISTS idx_app_state_type ON application_state(state_type);
CREATE INDEX IF NOT EXISTS idx_app_state_expires ON application_state(expires_at);
CREATE INDEX IF NOT EXISTS idx_app_state_updated_at ON application_state(updated_at);

-- Updated timestamp trigger
CREATE TRIGGER update_application_state_updated_at
    BEFORE UPDATE ON application_state
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired state
CREATE OR REPLACE FUNCTION cleanup_expired_state()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM application_state
    WHERE expires_at IS NOT NULL AND expires_at < NOW();

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;