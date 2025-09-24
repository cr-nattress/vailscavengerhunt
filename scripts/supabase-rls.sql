-- Row Level Security (RLS) Setup for Vail Scavenger Hunt
-- Execute this in the Supabase SQL Editor AFTER the main schema

-- Enable RLS on all security-sensitive tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE hunt_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create JWT auth function to extract team_id from claims
CREATE OR REPLACE FUNCTION auth.team_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'team_id')::UUID,
    (current_setting('request.jwt.claims', true)::json->>'sub')::UUID
  )
$$ LANGUAGE sql STABLE;

-- Alternative function to get team_id from user metadata
CREATE OR REPLACE FUNCTION auth.team_id_from_metadata()
RETURNS TEXT AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->'user_metadata'->>'team_id',
    current_setting('request.jwt.claims', true)::json->>'team_id'
  )
$$ LANGUAGE sql STABLE;

-- Function to check if user is authenticated
CREATE OR REPLACE FUNCTION auth.is_authenticated()
RETURNS BOOLEAN AS $$
  SELECT current_setting('request.jwt.claims', true)::json->>'sub' IS NOT NULL
$$ LANGUAGE sql STABLE;

-- RLS Policies for teams table
CREATE POLICY "Teams can view their own data" ON teams
  FOR SELECT USING (
    auth.is_authenticated() AND
    id = auth.team_id()
  );

CREATE POLICY "Teams can update their own data" ON teams
  FOR UPDATE USING (
    auth.is_authenticated() AND
    id = auth.team_id()
  );

-- Allow teams to be created during registration (service role only)
CREATE POLICY "Service role can manage teams" ON teams
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'service_role'
  );

-- RLS Policies for hunt_progress table
CREATE POLICY "Teams can view their own progress" ON hunt_progress
  FOR SELECT USING (
    auth.is_authenticated() AND
    team_id = auth.team_id()
  );

CREATE POLICY "Teams can manage their own progress" ON hunt_progress
  FOR ALL USING (
    auth.is_authenticated() AND
    team_id = auth.team_id()
  );

-- RLS Policies for sessions table
CREATE POLICY "Teams can view their own sessions" ON sessions
  FOR SELECT USING (
    auth.is_authenticated() AND
    team_id = auth.team_id()
  );

CREATE POLICY "Teams can create their own sessions" ON sessions
  FOR INSERT WITH CHECK (
    auth.is_authenticated() AND
    team_id = auth.team_id()
  );

CREATE POLICY "Teams can update their own sessions" ON sessions
  FOR UPDATE USING (
    auth.is_authenticated() AND
    team_id = auth.team_id()
  );

-- RLS Policies for settings table
CREATE POLICY "Teams can view their own settings" ON settings
  FOR SELECT USING (
    auth.is_authenticated() AND
    team_id = auth.team_id()
  );

CREATE POLICY "Teams can manage their own settings" ON settings
  FOR ALL USING (
    auth.is_authenticated() AND
    team_id = auth.team_id()
  );

-- Public access policies for team code verification (before authentication)
CREATE POLICY "Anyone can verify team codes" ON team_codes
  FOR SELECT USING (is_active = true);

-- Allow service role to manage team codes
CREATE POLICY "Service role can manage team codes" ON team_codes
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Public read access for organizations and hunts (reference data)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE hunts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access to organizations" ON organizations
  FOR SELECT USING (true);

CREATE POLICY "Public read access to hunts" ON hunts
  FOR SELECT USING (true);

-- Service role can manage reference data
CREATE POLICY "Service role can manage organizations" ON organizations
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "Service role can manage hunts" ON hunts
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Enable RLS on team_codes table
ALTER TABLE team_codes ENABLE ROW LEVEL SECURITY;

-- Special policy for leaderboard view access
-- (Note: Views inherit RLS from underlying tables)

-- Create a function to check team membership for cross-team queries
CREATE OR REPLACE FUNCTION auth.can_view_hunt_data(hunt_org_id TEXT, hunt_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_team_record RECORD;
BEGIN
  -- Get the team information for the authenticated user
  SELECT organization_id, hunt_id INTO user_team_record
  FROM teams
  WHERE id = auth.team_id();

  -- Allow access if user's team is in the same organization and hunt
  RETURN user_team_record.organization_id = hunt_org_id AND
         user_team_record.hunt_id = hunt_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy for leaderboard access (teams can see leaderboard for their hunt)
CREATE POLICY "Teams can view leaderboard for their hunt" ON teams
  FOR SELECT USING (
    auth.is_authenticated() AND
    auth.can_view_hunt_data(organization_id, hunt_id)
  );

-- Create a test function to verify RLS is working
CREATE OR REPLACE FUNCTION test_rls_policies()
RETURNS TABLE (
  test_name TEXT,
  result TEXT,
  details TEXT
) AS $$
BEGIN
  -- Test 1: Check if RLS is enabled on key tables
  RETURN QUERY
  SELECT
    'RLS Enabled Check'::TEXT,
    CASE
      WHEN (
        SELECT COUNT(*) FROM pg_class c
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public'
        AND c.relname IN ('teams', 'hunt_progress', 'sessions', 'settings')
        AND c.relrowsecurity = true
      ) = 4 THEN 'PASS' ELSE 'FAIL'
    END,
    'RLS should be enabled on teams, hunt_progress, sessions, settings'::TEXT;

  -- Test 2: Check if policies exist
  RETURN QUERY
  SELECT
    'Policies Exist Check'::TEXT,
    CASE
      WHEN (
        SELECT COUNT(*) FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename IN ('teams', 'hunt_progress', 'sessions', 'settings')
      ) > 0 THEN 'PASS' ELSE 'FAIL'
    END,
    'Security policies should be created for protected tables'::TEXT;

  -- Test 3: Check if auth functions exist
  RETURN QUERY
  SELECT
    'Auth Functions Check'::TEXT,
    CASE
      WHEN (
        SELECT COUNT(*) FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'auth'
        AND p.proname IN ('team_id', 'is_authenticated')
      ) >= 2 THEN 'PASS' ELSE 'FAIL'
    END,
    'Authentication helper functions should exist'::TEXT;

END;
$$ LANGUAGE plpgsql;

-- Add helpful comments
COMMENT ON FUNCTION auth.team_id() IS 'Extract team UUID from JWT claims';
COMMENT ON FUNCTION auth.is_authenticated() IS 'Check if user has valid authentication';
COMMENT ON FUNCTION test_rls_policies() IS 'Test function to verify RLS setup';

-- Create a view for policy information (admin/debugging)
CREATE OR REPLACE VIEW rls_policy_summary AS
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

COMMENT ON VIEW rls_policy_summary IS 'Summary of all RLS policies for debugging';

-- Grant necessary permissions for the leaderboard view
GRANT SELECT ON leaderboard TO authenticated;
GRANT SELECT ON leaderboard TO anon;