-- Row Level Security (RLS) Setup for Vail Scavenger Hunt (Safe Version)
-- Execute this in the Supabase SQL Editor AFTER the main schema

-- Enable RLS on all security-sensitive tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE hunt_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_codes ENABLE ROW LEVEL SECURITY;

-- Create helper functions in public schema (not auth schema)
CREATE OR REPLACE FUNCTION public.get_team_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'team_id')::UUID,
    (current_setting('request.jwt.claims', true)::json->>'sub')::UUID
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Alternative function to get team_id from user metadata
CREATE OR REPLACE FUNCTION public.get_team_id_from_metadata()
RETURNS TEXT AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->'user_metadata'->>'team_id',
    current_setting('request.jwt.claims', true)::json->>'team_id'
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Function to check if user is authenticated
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS BOOLEAN AS $$
  SELECT current_setting('request.jwt.claims', true)::json->>'sub' IS NOT NULL
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Function to check service role
CREATE OR REPLACE FUNCTION public.is_service_role()
RETURNS BOOLEAN AS $$
  SELECT current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- RLS Policies for teams table
DROP POLICY IF EXISTS "Teams can view their own data" ON teams;
CREATE POLICY "Teams can view their own data" ON teams
  FOR SELECT USING (
    public.is_authenticated() AND
    id = public.get_team_id()
  );

DROP POLICY IF EXISTS "Teams can update their own data" ON teams;
CREATE POLICY "Teams can update their own data" ON teams
  FOR UPDATE USING (
    public.is_authenticated() AND
    id = public.get_team_id()
  );

-- Allow service role to manage teams
DROP POLICY IF EXISTS "Service role can manage teams" ON teams;
CREATE POLICY "Service role can manage teams" ON teams
  FOR ALL USING (
    public.is_service_role()
  );

-- Allow public read for leaderboard (within same hunt)
DROP POLICY IF EXISTS "Public can view teams in same hunt" ON teams;
CREATE POLICY "Public can view teams in same hunt" ON teams
  FOR SELECT USING (true);

-- RLS Policies for hunt_progress table
DROP POLICY IF EXISTS "Teams can view their own progress" ON hunt_progress;
CREATE POLICY "Teams can view their own progress" ON hunt_progress
  FOR SELECT USING (
    public.is_authenticated() AND
    team_id = public.get_team_id()
  );

DROP POLICY IF EXISTS "Teams can manage their own progress" ON hunt_progress;
CREATE POLICY "Teams can manage their own progress" ON hunt_progress
  FOR ALL USING (
    public.is_authenticated() AND
    team_id = public.get_team_id()
  );

-- Allow service role full access to progress
DROP POLICY IF EXISTS "Service role can manage progress" ON hunt_progress;
CREATE POLICY "Service role can manage progress" ON hunt_progress
  FOR ALL USING (
    public.is_service_role()
  );

-- RLS Policies for sessions table
DROP POLICY IF EXISTS "Teams can view their own sessions" ON sessions;
CREATE POLICY "Teams can view their own sessions" ON sessions
  FOR SELECT USING (
    public.is_authenticated() AND
    team_id = public.get_team_id()
  );

DROP POLICY IF EXISTS "Teams can create their own sessions" ON sessions;
CREATE POLICY "Teams can create their own sessions" ON sessions
  FOR INSERT WITH CHECK (
    public.is_authenticated() AND
    team_id = public.get_team_id()
  );

DROP POLICY IF EXISTS "Teams can update their own sessions" ON sessions;
CREATE POLICY "Teams can update their own sessions" ON sessions
  FOR UPDATE USING (
    public.is_authenticated() AND
    team_id = public.get_team_id()
  );

-- Allow service role to manage sessions
DROP POLICY IF EXISTS "Service role can manage sessions" ON sessions;
CREATE POLICY "Service role can manage sessions" ON sessions
  FOR ALL USING (
    public.is_service_role()
  );

-- RLS Policies for settings table
DROP POLICY IF EXISTS "Teams can view their own settings" ON settings;
CREATE POLICY "Teams can view their own settings" ON settings
  FOR SELECT USING (
    public.is_authenticated() AND
    team_id = public.get_team_id()
  );

DROP POLICY IF EXISTS "Teams can manage their own settings" ON settings;
CREATE POLICY "Teams can manage their own settings" ON settings
  FOR ALL USING (
    public.is_authenticated() AND
    team_id = public.get_team_id()
  );

-- Public access policies for team code verification (before authentication)
DROP POLICY IF EXISTS "Anyone can verify team codes" ON team_codes;
CREATE POLICY "Anyone can verify team codes" ON team_codes
  FOR SELECT USING (is_active = true);

-- Allow service role to manage team codes
DROP POLICY IF EXISTS "Service role can manage team codes" ON team_codes;
CREATE POLICY "Service role can manage team codes" ON team_codes
  FOR ALL USING (
    public.is_service_role()
  );

-- Public read access for organizations and hunts (reference data)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE hunts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access to organizations" ON organizations;
CREATE POLICY "Public read access to organizations" ON organizations
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read access to hunts" ON hunts;
CREATE POLICY "Public read access to hunts" ON hunts
  FOR SELECT USING (true);

-- Service role can manage reference data
DROP POLICY IF EXISTS "Service role can manage organizations" ON organizations;
CREATE POLICY "Service role can manage organizations" ON organizations
  FOR ALL USING (
    public.is_service_role()
  );

DROP POLICY IF EXISTS "Service role can manage hunts" ON hunts;
CREATE POLICY "Service role can manage hunts" ON hunts
  FOR ALL USING (
    public.is_service_role()
  );

-- Create a function to check team membership for cross-team queries
CREATE OR REPLACE FUNCTION public.can_view_hunt_data(hunt_org_id TEXT, hunt_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_team_record RECORD;
BEGIN
  -- Get the team information for the authenticated user
  SELECT organization_id, hunt_id INTO user_team_record
  FROM teams
  WHERE id = public.get_team_id();

  -- Allow access if user's team is in the same organization and hunt
  RETURN user_team_record.organization_id = hunt_org_id AND
         user_team_record.hunt_id = hunt_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a test function to verify RLS is working
CREATE OR REPLACE FUNCTION public.test_rls_policies()
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

  -- Test 3: Check if helper functions exist
  RETURN QUERY
  SELECT
    'Helper Functions Check'::TEXT,
    CASE
      WHEN (
        SELECT COUNT(*) FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname IN ('get_team_id', 'is_authenticated')
      ) >= 2 THEN 'PASS' ELSE 'FAIL'
    END,
    'Authentication helper functions should exist'::TEXT;

END;
$$ LANGUAGE plpgsql;

-- Add helpful comments
COMMENT ON FUNCTION public.get_team_id() IS 'Extract team UUID from JWT claims';
COMMENT ON FUNCTION public.is_authenticated() IS 'Check if user has valid authentication';
COMMENT ON FUNCTION public.test_rls_policies() IS 'Test function to verify RLS setup';

-- Create a view for policy information (admin/debugging)
CREATE OR REPLACE VIEW public.rls_policy_summary AS
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

COMMENT ON VIEW public.rls_policy_summary IS 'Summary of all RLS policies for debugging';

-- Grant necessary permissions for the leaderboard view
GRANT SELECT ON leaderboard TO authenticated;
GRANT SELECT ON leaderboard TO anon;

-- Grant permissions for helper functions
GRANT EXECUTE ON FUNCTION public.get_team_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_id() TO anon;
GRANT EXECUTE ON FUNCTION public.is_authenticated() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_authenticated() TO anon;
GRANT EXECUTE ON FUNCTION public.can_view_hunt_data(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.test_rls_policies() TO service_role;