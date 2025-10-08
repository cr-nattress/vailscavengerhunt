-- Add photo_mode Column to Hunts Table
-- Minimal migration to add photo_mode support without affecting existing data
-- Execute this in your PRODUCTION Supabase SQL Editor

-- ============================================================================
-- ADD PHOTO_MODE COLUMN
-- ============================================================================

-- Add photo_mode column to hunts table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hunts' AND column_name = 'photo_mode'
  ) THEN
    ALTER TABLE hunts
    ADD COLUMN photo_mode TEXT DEFAULT 'upload' CHECK (photo_mode IN ('upload', 'pre_populated'));

    RAISE NOTICE 'Added photo_mode column to hunts table';
  ELSE
    RAISE NOTICE 'photo_mode column already exists';
  END IF;
END $$;

-- ============================================================================
-- ADD PRE_POPULATED_IMAGE_URL COLUMN
-- ============================================================================

-- Add pre_populated_image_url column to hunt_stops table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hunt_stops' AND column_name = 'pre_populated_image_url'
  ) THEN
    ALTER TABLE hunt_stops
    ADD COLUMN pre_populated_image_url TEXT;

    RAISE NOTICE 'Added pre_populated_image_url column to hunt_stops table';
  ELSE
    RAISE NOTICE 'pre_populated_image_url column already exists';
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify columns were added
SELECT
  table_name,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name IN ('hunts', 'hunt_stops')
  AND column_name IN ('photo_mode', 'pre_populated_image_url')
ORDER BY table_name, column_name;

-- Show all hunts with their photo_mode
SELECT
  organization_id,
  id as hunt_id,
  name,
  photo_mode,
  is_active
FROM hunts
ORDER BY organization_id, id;

-- ============================================================================
-- COMPLETE!
-- ============================================================================
--
-- This migration adds:
-- 1. photo_mode column to hunts table (default: 'upload')
-- 2. pre_populated_image_url column to hunt_stops table
--
-- All existing hunts will use 'upload' mode by default.
-- No data is modified or deleted.
--
-- ============================================================================
