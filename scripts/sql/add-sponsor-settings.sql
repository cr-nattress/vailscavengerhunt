-- Sponsor Settings Extension
-- Adds sponsor layout configuration support to existing settings system
-- Assumes you have a settings table with (organization_id, hunt_id, key, value) structure

-- Add constraint to validate sponsor layout values if settings table exists
-- Note: Adjust table name and structure based on your actual settings implementation

-- Example settings table structure (create if doesn't exist):
/*
CREATE TABLE IF NOT EXISTS public.settings (
  id uuid primary key default uuid_generate_v4(),
  organization_id text not null,
  hunt_id text not null,
  key text not null,
  value text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  UNIQUE(organization_id, hunt_id, key)
);
*/

-- Add check constraint for sponsor_layout settings if table exists
DO $$
BEGIN
    -- Check if settings table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'settings' AND table_schema = 'public') THEN
        -- Add constraint if it doesn't already exist
        IF NOT EXISTS (SELECT FROM information_schema.check_constraints WHERE constraint_name = 'check_sponsor_layout') THEN
            ALTER TABLE public.settings
            ADD CONSTRAINT check_sponsor_layout
            CHECK (key != 'sponsor_layout' OR value IN ('1x1', '1x2', '1x3'));

            RAISE NOTICE 'Added sponsor_layout validation constraint to settings table';
        ELSE
            RAISE NOTICE 'Sponsor layout constraint already exists';
        END IF;

        -- Add index for sponsor-related settings
        CREATE INDEX IF NOT EXISTS idx_settings_sponsor_keys
        ON public.settings (organization_id, hunt_id, key)
        WHERE key LIKE 'sponsor_%';

        RAISE NOTICE 'Added index for sponsor settings';
    ELSE
        RAISE NOTICE 'Settings table does not exist - sponsor settings constraint not added';
    END IF;
END
$$;

-- Insert default sponsor layout settings for existing events (if you want defaults)
-- Uncomment and modify the following based on your existing data:

/*
-- Example: Add default 1x2 layout for existing events that have sponsors
INSERT INTO public.settings (organization_id, hunt_id, key, value, description)
SELECT DISTINCT
    organization_id,
    hunt_id,
    'sponsor_layout' as key,
    '1x2' as value,
    'Sponsor card grid layout: 1x1, 1x2, or 1x3' as description
FROM public.sponsor_assets
WHERE is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM public.settings s
    WHERE s.organization_id = sponsor_assets.organization_id
      AND s.hunt_id = sponsor_assets.hunt_id
      AND s.key = 'sponsor_layout'
  );
*/

-- Example settings for test data (matches seed data from sponsor-assets):
INSERT INTO public.settings (organization_id, hunt_id, key, value, description)
VALUES
  -- BHHS Fall 2025 - Multiple sponsors, use 1x2 layout
  ('bhhs', 'fall-2025', 'sponsor_layout', '1x2', 'Sponsor card grid layout: 1x1, 1x2, or 1x3'),

  -- Vail Winter 2025 - 3 sponsors, use 1x3 layout
  ('vail', 'winter-2025', 'sponsor_layout', '1x3', 'Sponsor card grid layout: 1x1, 1x2, or 1x3'),

  -- Test org single sponsor - use 1x1 layout
  ('test-org', 'single-sponsor', 'sponsor_layout', '1x1', 'Sponsor card grid layout: 1x1, 1x2, or 1x3')

ON CONFLICT (organization_id, hunt_id, key)
DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now()
WHERE settings.organization_id = EXCLUDED.organization_id
  AND settings.hunt_id = EXCLUDED.hunt_id
  AND settings.key = EXCLUDED.key;

-- Add any other sponsor-related settings:
INSERT INTO public.settings (organization_id, hunt_id, key, value, description)
VALUES
  -- Feature flag per organization (if you want granular control)
  ('bhhs', 'fall-2025', 'sponsor_card_enabled', 'true', 'Enable sponsor card display for this event'),
  ('vail', 'winter-2025', 'sponsor_card_enabled', 'true', 'Enable sponsor card display for this event'),
  ('test-org', 'single-sponsor', 'sponsor_card_enabled', 'true', 'Enable sponsor card display for this event'),

  -- Sponsor card positioning (future enhancement)
  ('bhhs', 'fall-2025', 'sponsor_card_position', 'above-progress', 'Where to show sponsor card: above-progress, below-header, etc.'),
  ('vail', 'winter-2025', 'sponsor_card_position', 'above-progress', 'Where to show sponsor card: above-progress, below-header, etc.'),
  ('test-org', 'single-sponsor', 'sponsor_card_position', 'above-progress', 'Where to show sponsor card: above-progress, below-header, etc.')

ON CONFLICT (organization_id, hunt_id, key)
DO NOTHING; -- Don't overwrite existing custom settings

-- Display summary of sponsor settings
SELECT
  organization_id,
  hunt_id,
  key,
  value,
  description
FROM public.settings
WHERE key LIKE 'sponsor_%'
ORDER BY organization_id, hunt_id, key;

-- Verify sponsor assets have corresponding layout settings
SELECT
  sa.organization_id,
  sa.hunt_id,
  COUNT(DISTINCT sa.id) as sponsor_count,
  s.value as layout_setting,
  CASE
    WHEN COUNT(DISTINCT sa.id) = 1 AND s.value = '1x1' THEN '✅ Optimal'
    WHEN COUNT(DISTINCT sa.id) <= 4 AND s.value = '1x2' THEN '✅ Good'
    WHEN COUNT(DISTINCT sa.id) > 4 AND s.value = '1x3' THEN '✅ Good'
    WHEN s.value IS NULL THEN '⚠️ No layout setting'
    ELSE '⚠️ Suboptimal layout'
  END as layout_assessment
FROM public.sponsor_assets sa
LEFT JOIN public.settings s ON (
  s.organization_id = sa.organization_id
  AND s.hunt_id = sa.hunt_id
  AND s.key = 'sponsor_layout'
)
WHERE sa.is_active = true
GROUP BY sa.organization_id, sa.hunt_id, s.value
ORDER BY sa.organization_id, sa.hunt_id;

-- Create helpful view for sponsor configuration (optional)
CREATE OR REPLACE VIEW public.sponsor_configuration AS
SELECT
  sa.organization_id,
  sa.hunt_id,
  COUNT(sa.id) as total_sponsors,
  COUNT(sa.id) FILTER (WHERE sa.is_active = true) as active_sponsors,
  sl.value as layout,
  se.value as enabled,
  sp.value as position,
  CASE
    WHEN COUNT(sa.id) FILTER (WHERE sa.is_active = true) = 0 THEN 'No sponsors'
    WHEN se.value = 'false' OR se.value IS NULL THEN 'Disabled'
    ELSE 'Active'
  END as status
FROM public.sponsor_assets sa
LEFT JOIN public.settings sl ON (sa.organization_id = sl.organization_id AND sa.hunt_id = sl.hunt_id AND sl.key = 'sponsor_layout')
LEFT JOIN public.settings se ON (sa.organization_id = se.organization_id AND sa.hunt_id = se.hunt_id AND se.key = 'sponsor_card_enabled')
LEFT JOIN public.settings sp ON (sa.organization_id = sp.organization_id AND sp.hunt_id = sa.hunt_id AND sp.key = 'sponsor_card_position')
GROUP BY sa.organization_id, sa.hunt_id, sl.value, se.value, sp.value
ORDER BY sa.organization_id, sa.hunt_id;

-- Show the configuration view
SELECT * FROM public.sponsor_configuration;