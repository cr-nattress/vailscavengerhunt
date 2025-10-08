-- Fix Steps 3 and 4 - Swap Content
-- Steps 3 and 4 content is reversed, this swaps them back to correct order
-- Execute this in the Supabase SQL Editor

-- ============================================================================
-- SWAP STEPS 3 AND 4 CONTENT
-- ============================================================================

-- Step 3: The Step of Grace (currently has step 4 content - fix it)
UPDATE hunt_stops
SET title = 'The Step of Grace',
    clue = 'Step into your favorite heels — the ones that make you stand a little taller and move like the world''s already applauding.',
    hints = '["Every step you take turns the ordinary into something worth watching — elegant and effortless."]',
    updated_at = NOW()
WHERE stop_id = 'frozen-waterfall-trail';

-- Step 4: The Star of the Show (currently has step 3 content - fix it)
UPDATE hunt_stops
SET title = 'The Star of the Show',
    clue = 'Top it off with that cowboy hat — playful, bold, and full of personality. Let your charm do the rest.',
    hints = '["You wear confidence better than any accessory — it''s magnetic in the best way."]',
    updated_at = NOW()
WHERE stop_id = 'alpine-village-square';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Display all stops in order to verify
SELECT
    hc.default_order as step,
    hs.stop_id,
    hs.title,
    LEFT(hs.clue, 50) || '...' as clue_preview,
    CASE
        WHEN hs.pre_populated_image_url LIKE '%num-1%' THEN 'num-1 ✅'
        WHEN hs.pre_populated_image_url LIKE '%num-2%' THEN 'num-2 ✅'
        WHEN hs.pre_populated_image_url LIKE '%num-3%' THEN 'num-3 ✅'
        WHEN hs.pre_populated_image_url LIKE '%num-4%' THEN 'num-4 ✅'
        WHEN hs.pre_populated_image_url LIKE '%num-5%' THEN 'num-5 ✅'
        ELSE 'unknown'
    END as image
FROM hunt_configurations hc
JOIN hunt_stops hs ON hc.stop_id = hs.stop_id
WHERE hc.organization_id = 'mountain-adventures'
  AND hc.hunt_id = 'winter-2025'
ORDER BY hc.default_order;

-- Expected output:
-- Step 1: The Soft Start       | "Put on that favorite t-shirt..."        | num-1
-- Step 2: The Hidden Confidence | "Choose the set that makes you feel..."  | num-2
-- Step 3: The Step of Grace     | "Step into your favorite heels..."       | num-3
-- Step 4: The Star of the Show  | "Top it off with that cowboy hat..."     | num-4
-- Step 5: The Finishing Touch   | "Add a spritz of your favorite..."       | num-5

-- ============================================================================
-- COMPLETE!
-- ============================================================================
--
-- Fixed content order:
--
-- Step 3: The Step of Grace (heels)
-- Step 4: The Star of the Show (cowboy hat)
--
-- Restart dev server or wait 5 minutes for cache to clear.
--
-- ============================================================================
