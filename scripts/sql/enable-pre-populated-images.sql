-- Enable Pre-Populated Images for Mountain Adventures Hunt
-- This script adds the photo_mode column and sets up pre-populated images

-- ============================================================================
-- 1. ADD SCHEMA CHANGES
-- ============================================================================

-- Add photo_mode column to hunts table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'hunts' AND column_name = 'photo_mode'
    ) THEN
        ALTER TABLE hunts
        ADD COLUMN photo_mode TEXT DEFAULT 'upload'
        CHECK (photo_mode IN ('upload', 'pre_populated'));

        COMMENT ON COLUMN hunts.photo_mode IS
          'Determines photo behavior: upload (user photos) or pre_populated (fixed images)';
    END IF;
END $$;

-- Add pre_populated_image_url column to hunt_stops table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'hunt_stops' AND column_name = 'pre_populated_image_url'
    ) THEN
        ALTER TABLE hunt_stops
        ADD COLUMN pre_populated_image_url TEXT;

        COMMENT ON COLUMN hunt_stops.pre_populated_image_url IS
          'URL to display when photo_mode is pre_populated. Ignored for upload mode.';
    END IF;
END $$;

-- ============================================================================
-- 2. SET MOUNTAIN ADVENTURES TO PRE-POPULATED MODE
-- ============================================================================

-- Update the winter-2025 hunt to use pre-populated images
UPDATE hunts
SET photo_mode = 'pre_populated',
    updated_at = NOW()
WHERE organization_id = 'mountain-adventures'
  AND id = 'winter-2025';

-- ============================================================================
-- 3. ADD PRE-POPULATED IMAGE URLs TO STOPS
-- ============================================================================

-- Using the Google Photos shared album URL as test image for all stops
-- Note: In production, each stop should have its own unique image URL
-- Google Photos shared URLs format: https://photos.app.goo.gl/XXXXXXXXX

UPDATE hunt_stops
SET pre_populated_image_url = 'https://photos.app.goo.gl/nBDjjNVW9ooZL2Mo6',
    updated_at = NOW()
WHERE stop_id IN (
    'mountain-peak-viewpoint',
    'historic-mining-museum',
    'frozen-waterfall-trail',
    'alpine-village-square',
    'cross-country-ski-center',
    'snowshoe-adventure-park',
    'ice-skating-rink',
    'wildlife-observation-point',
    'hot-springs-retreat',
    'summit-express-gondola'
);

-- ============================================================================
-- 4. VERIFICATION QUERIES
-- ============================================================================

-- Verify hunt photo_mode is set
SELECT
    organization_id,
    id as hunt_id,
    name,
    photo_mode,
    is_active
FROM hunts
WHERE organization_id = 'mountain-adventures' AND id = 'winter-2025';

-- Verify all stops have pre_populated_image_url
SELECT
    stop_id,
    title,
    pre_populated_image_url,
    CASE
        WHEN pre_populated_image_url IS NOT NULL THEN '✅ Set'
        ELSE '❌ Missing'
    END as image_status
FROM hunt_stops
WHERE stop_id IN (
    SELECT stop_id
    FROM hunt_configurations
    WHERE organization_id = 'mountain-adventures' AND hunt_id = 'winter-2025'
)
ORDER BY stop_id;

-- Count stops with images
SELECT
    COUNT(*) as total_stops,
    COUNT(pre_populated_image_url) as stops_with_images,
    COUNT(*) - COUNT(pre_populated_image_url) as stops_missing_images
FROM hunt_stops
WHERE stop_id IN (
    SELECT stop_id
    FROM hunt_configurations
    WHERE organization_id = 'mountain-adventures' AND hunt_id = 'winter-2025'
);

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- To revert back to upload mode, run:
/*
UPDATE hunts
SET photo_mode = 'upload',
    updated_at = NOW()
WHERE organization_id = 'mountain-adventures' AND id = 'winter-2025';

UPDATE hunt_stops
SET pre_populated_image_url = NULL,
    updated_at = NOW()
WHERE stop_id IN (
    SELECT stop_id
    FROM hunt_configurations
    WHERE organization_id = 'mountain-adventures' AND hunt_id = 'winter-2025'
);
*/

-- ============================================================================
-- NOTES
-- ============================================================================

-- Test with team codes:
--   - SUMMIT2025 (Summit Seekers)
--   - POWDER2025 (Powder Pioneers)

-- Expected behavior after running this script:
--   1. Mountain Adventures hunt shows photo_mode = 'pre_populated'
--   2. All 10 stops have the Google Photos URL set
--   3. Frontend should display pre-populated images instead of upload buttons
--   4. Camera icon should be grayed out
--   5. Stops can be completed without uploading photos

-- Important: This script uses the same Google Photos URL for all stops as a test.
-- In production, each stop should have its own unique image URL from Cloudinary
-- or another reliable image hosting service.

-- Google Photos URLs may have restrictions:
--   - Shared album links may expire or change
--   - May not allow direct image embedding in all contexts
--   - Better to use dedicated image hosting (Cloudinary, Supabase Storage, etc.)

-- For production, consider:
--   1. Upload unique images to Cloudinary for each stop
--   2. Use Cloudinary transformations for optimization
--   3. Update this script with individual image URLs
