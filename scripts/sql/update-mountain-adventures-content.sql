-- Update Mountain Adventures Hunt Content
-- Updates all 5 stops with correct titles, clues, and hints
-- Execute this in the Supabase SQL Editor

-- ============================================================================
-- UPDATE ALL STOP CONTENT
-- ============================================================================

-- Step 1: The Soft Start
UPDATE hunt_stops
SET title = 'The Soft Start',
    clue = 'Put on that favorite t-shirt — the one that feels like a cozy memory and a fresh beginning all at once.',
    hints = '["You make comfort look stunning — somehow relaxed, yet radiant at the same time."]',
    description = '',
    updated_at = NOW()
WHERE stop_id = 'mountain-peak-viewpoint';

-- Step 2: The Hidden Confidence
UPDATE hunt_stops
SET title = 'The Hidden Confidence',
    clue = 'Choose the set that makes you feel confident from the inside out. It''s not about what shows — it''s about how you shine.',
    hints = '["You carry quiet confidence like it''s your natural state — and it suits you perfectly."]',
    description = '',
    updated_at = NOW()
WHERE stop_id = 'historic-mining-museum';

-- Step 3: The Step of Grace
UPDATE hunt_stops
SET title = 'The Step of Grace',
    clue = 'Step into your favorite heels — the ones that make you stand a little taller and move like the world''s already applauding.',
    hints = '["Every step you take turns the ordinary into something worth watching — elegant and effortless."]',
    description = '',
    updated_at = NOW()
WHERE stop_id = 'frozen-waterfall-trail';

-- Step 4: The Star of the Show
UPDATE hunt_stops
SET title = 'The Star of the Show',
    clue = 'Top it off with that cowboy hat — playful, bold, and full of personality. Let your charm do the rest.',
    hints = '["You wear confidence better than any accessory — it''s magnetic in the best way."]',
    description = '',
    updated_at = NOW()
WHERE stop_id = 'alpine-village-square';

-- Step 5: The Finishing Touch
UPDATE hunt_stops
SET title = 'The Finishing Touch',
    clue = 'Add a spritz of your favorite perfume — a quiet signature that lingers just enough to be remembered.',
    hints = '["Your presence is like a favorite song — subtle, timeless, and impossible to forget."]',
    description = '',
    updated_at = NOW()
WHERE stop_id = 'cross-country-ski-center';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Display all updated stops
SELECT
    hc.default_order as step,
    hs.stop_id,
    hs.title,
    hs.clue,
    hs.hints,
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

-- ============================================================================
-- COMPLETE!
-- ============================================================================
--
-- Updated content for all 5 steps:
--
-- Step 1: The Soft Start
--   Image: num-1
--   Clue: Put on that favorite t-shirt...
--
-- Step 2: The Hidden Confidence
--   Image: num-2
--   Clue: Choose the set that makes you feel confident...
--
-- Step 3: The Step of Grace
--   Image: num-3
--   Clue: Step into your favorite heels...
--
-- Step 4: The Star of the Show
--   Image: num-4
--   Clue: Top it off with that cowboy hat...
--
-- Step 5: The Finishing Touch
--   Image: num-5
--   Clue: Add a spritz of your favorite perfume...
--
-- All stops updated with correct titles, clues, and hints!
--
-- ============================================================================
