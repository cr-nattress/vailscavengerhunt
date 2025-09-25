-- Device locks table for team verification
CREATE TABLE IF NOT EXISTS device_locks (
  device_fingerprint TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for team lookups
CREATE INDEX IF NOT EXISTS idx_device_locks_team_id ON device_locks(team_id);

-- Create index for expiration cleanup
CREATE INDEX IF NOT EXISTS idx_device_locks_expires_at ON device_locks(expires_at);

-- Enable Row Level Security (RLS)
ALTER TABLE device_locks ENABLE ROW LEVEL SECURITY;

-- Create policy for service role (full access)
CREATE POLICY "Service role has full access to device_locks"
ON device_locks
FOR ALL
TO service_role
USING (true);

-- Create policy for anonymous users (no access)
CREATE POLICY "No anonymous access to device_locks"
ON device_locks
FOR ALL
TO anon
USING (false);

-- Optional: Create a function to automatically clean up expired locks
CREATE OR REPLACE FUNCTION cleanup_expired_device_locks()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM device_locks
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a scheduled job to clean up expired locks (requires pg_cron extension)
-- Note: pg_cron must be enabled in Supabase dashboard
-- SELECT cron.schedule('cleanup-device-locks', '0 * * * *', 'SELECT cleanup_expired_device_locks();');