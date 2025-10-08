-- Reset Progress for Powder Pioneers Team
-- Clears all hunt progress for the Powder Pioneers team
-- Execute this in the Supabase SQL Editor

-- ============================================================================
-- RESET PROGRESS
-- ============================================================================

-- Delete all progress records for Powder Pioneers team
DELETE FROM hunt_progress
WHERE team_id = (
    SELECT id FROM teams
    WHERE organization_id = 'mountain-adventures'
      AND hunt_id = 'winter-2025'
      AND team_id = 'powder-pioneers'
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify progress has been cleared
SELECT COUNT(*) as remaining_progress_records
FROM hunt_progress
WHERE team_id = (
    SELECT id FROM teams
    WHERE organization_id = 'mountain-adventures'
      AND hunt_id = 'winter-2025'
      AND team_id = 'powder-pioneers'
);

-- Expected: 0 records

-- Show all team progress for Mountain Adventures (to confirm)
SELECT
    t.team_id,
    t.display_name,
    COUNT(hp.location_id) as completed_stops
FROM teams t
LEFT JOIN hunt_progress hp ON t.id = hp.team_id
WHERE t.organization_id = 'mountain-adventures'
  AND t.hunt_id = 'winter-2025'
GROUP BY t.id, t.team_id, t.display_name
ORDER BY t.team_id;

-- ============================================================================
-- COMPLETE!
-- ============================================================================
--
-- Progress reset for: Powder Pioneers (POWDER2025)
-- Organization: Mountain Adventures
-- Hunt: Winter Adventure Hunt 2025
--
-- The team can now start fresh from stop 1.
--
-- ============================================================================
