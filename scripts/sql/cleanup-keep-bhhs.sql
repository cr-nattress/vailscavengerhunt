-- Cleanup Script: Keep only BHHS organization and remove all others
-- Usage: Run this in the Supabase SQL Editor
-- Safety: Executes inside a transaction and prints a summary at the end
-- NOTE: This cleans database rows only. If you also want to purge
--       Supabase Storage objects (e.g., sponsors bucket), that must be
--       done separately via Storage API or dashboard.

BEGIN;

-- 1) Sanity check: ensure BHHS exists
DO $$
DECLARE
  bhhs_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM organizations WHERE id = 'bhhs') INTO bhhs_exists;
  IF NOT bhhs_exists THEN
    RAISE EXCEPTION 'Safety check failed: organization "bhhs" does not exist.';
  END IF;
END $$;

-- 2) Delete org-scoped, non-FK tables first (no ON DELETE CASCADE)
-- sponsor_assets: no foreign keys; remove non-BHHS
DELETE FROM sponsor_assets WHERE organization_id <> 'bhhs';

-- application_state: no foreign keys; remove non-BHHS
DELETE FROM application_state WHERE organization_id IS NOT NULL AND organization_id <> 'bhhs';

-- 3) Core multi-tenant entities with FK cascade
-- Deleting from organizations will cascade to hunts, teams, team_codes,
-- hunt_progress, sessions, settings, hunt_configurations, hunt_ordering_config,
-- and via team_id to team_stop_orders, etc.
DELETE FROM organizations WHERE id <> 'bhhs';

-- 4) Optional: clean up any orphaned settings referencing teams that may have been removed (defensive)
DELETE FROM settings s
USING teams t
WHERE s.team_id = t.id AND t.organization_id <> 'bhhs';

-- 5) Optional: ensure BHHS remains active and sample hunts exist
-- Uncomment if you want to enforce presence
-- INSERT INTO organizations (id, name)
-- VALUES ('bhhs', 'Berkshire Hathaway HomeServices')
-- ON CONFLICT (id) DO NOTHING;

-- 6) Summary
DO $$
DECLARE
  orgs INT;
  hunts INT;
  teams INT;
  codes INT;
  progress INT;
  sessions INT;
  settings_cnt INT;
  sponsors INT;
  app_state INT;
BEGIN
  SELECT COUNT(*) INTO orgs FROM organizations;
  SELECT COUNT(*) INTO hunts FROM hunts WHERE organization_id = 'bhhs';
  SELECT COUNT(*) INTO teams FROM teams WHERE organization_id = 'bhhs';
  SELECT COUNT(*) INTO codes FROM team_codes tc JOIN teams t ON tc.team_id = t.id WHERE t.organization_id = 'bhhs';
  SELECT COUNT(*) INTO progress FROM hunt_progress hp JOIN teams t ON hp.team_id = t.id WHERE t.organization_id = 'bhhs';
  SELECT COUNT(*) INTO sessions FROM sessions s JOIN teams t ON s.team_id = t.id WHERE t.organization_id = 'bhhs';
  SELECT COUNT(*) INTO settings_cnt FROM settings se JOIN teams t ON se.team_id = t.id WHERE t.organization_id = 'bhhs';
  SELECT COUNT(*) INTO sponsors FROM sponsor_assets WHERE organization_id = 'bhhs';
  SELECT COUNT(*) INTO app_state FROM application_state WHERE organization_id = 'bhhs';

  RAISE NOTICE 'Remaining counts -> organizations: %, hunts(BHHS): %, teams(BHHS): %, team_codes(BHHS): %, hunt_progress(BHHS): %, sessions(BHHS): %, settings(BHHS): %, sponsor_assets(BHHS): %, application_state(BHHS): %',
    orgs, hunts, teams, codes, progress, sessions, settings_cnt, sponsors, app_state;
END $$;

COMMIT;
