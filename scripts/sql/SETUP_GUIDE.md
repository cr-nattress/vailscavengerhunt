# Multi-Org Hunt System Setup Guide

## Problem: "0 of 0 stops" Issue

If you're seeing **0 of 0 stops** when logging in with Mountain Adventures team codes, it means the hunt stops data isn't properly configured in the database.

## Root Cause

The application was looking for stops in the **wrong table**:
- ❌ Old: Looked in `kv_store` table
- ✅ New: Looks in `hunt_stops` + `hunt_configurations` tables

## Solution: 3-Step Setup Process

### Step 1: Core Schema Setup
Run the complete schema setup script first:

```bash
# In Supabase SQL Editor, run:
scripts/sql/complete-multi-org-setup.sql
```

**What this does:**
- ✅ Creates all necessary tables (organizations, hunts, hunt_stops, etc.)
- ✅ Adds pre-populated image support (photo_mode, pre_populated_image_url)
- ✅ Creates indexes for performance
- ✅ Creates `get_hunt_stops()` function
- ✅ Safe to run multiple times (idempotent)

**Expected output:**
```
Organizations: 0-2
Hunts: 0-2
Hunt Stops: 0-20
Hunt Configurations: 0-20
Teams: 0-4
Team Codes: 0-4
```

### Step 2: Create Mountain Adventures Org & Hunt
Run the Mountain Adventures data script:

```bash
# In Supabase SQL Editor, run:
scripts/sql/second-org-scavenger-hunt.sql
```

**What this does:**
- ✅ Creates `mountain-adventures` organization
- ✅ Creates `winter-2025` hunt
- ✅ Creates 10 hunt stops with clues/hints
- ✅ Links stops to the hunt via `hunt_configurations`
- ✅ Sets ordering strategy to `fixed`
- ✅ Creates 2 teams: Summit Seekers, Powder Pioneers
- ✅ Creates team codes: `SUMMIT2025`, `POWDER2025`
- ✅ Initializes team settings

**Expected output:**
```
Organizations: 1
Hunts: 1
Hunt Stops: 10
Hunt Configurations: 10
Teams: 2
Team Codes: 2
Settings: 2

Team Codes:
SUMMIT2025 → Summit Seekers
POWDER2025 → Powder Pioneers
```

### Step 3: Enable Pre-Populated Images (Optional)
If you want to use pre-populated images instead of photo uploads:

```bash
# In Supabase SQL Editor, run:
scripts/sql/enable-pre-populated-images.sql
```

**What this does:**
- ✅ Sets `winter-2025` hunt to `photo_mode = 'pre_populated'`
- ✅ Adds Google Photos URL to all 10 stops
- ✅ Shows verification queries

**Note:** Google Photos URLs may not work reliably. For production, upload images to Cloudinary.

## Verification Checklist

### Database Verification

```sql
-- 1. Verify organizations exist
SELECT * FROM organizations WHERE id = 'mountain-adventures';
-- Expected: 1 row (Mountain Adventures Co.)

-- 2. Verify hunt exists
SELECT * FROM hunts WHERE organization_id = 'mountain-adventures' AND id = 'winter-2025';
-- Expected: 1 row (Winter Adventure Hunt 2025)

-- 3. Verify hunt stops exist
SELECT COUNT(*) FROM hunt_stops
WHERE stop_id IN (
  SELECT stop_id FROM hunt_configurations
  WHERE organization_id = 'mountain-adventures' AND hunt_id = 'winter-2025'
);
-- Expected: 10

-- 4. Verify hunt configurations
SELECT
  hc.default_order,
  hs.stop_id,
  hs.title
FROM hunt_configurations hc
JOIN hunt_stops hs ON hc.stop_id = hs.stop_id
WHERE hc.organization_id = 'mountain-adventures' AND hc.hunt_id = 'winter-2025'
ORDER BY hc.default_order;
-- Expected: 10 rows in order

-- 5. Verify teams exist
SELECT team_id, display_name FROM teams
WHERE organization_id = 'mountain-adventures' AND hunt_id = 'winter-2025';
-- Expected: summit-seekers, powder-pioneers

-- 6. Verify team codes
SELECT tc.code, t.display_name
FROM team_codes tc
JOIN teams t ON tc.team_id = t.id
WHERE tc.organization_id = 'mountain-adventures' AND tc.hunt_id = 'winter-2025';
-- Expected: SUMMIT2025, POWDER2025

-- 7. Test get_hunt_stops function
SELECT * FROM get_hunt_stops('mountain-adventures', 'winter-2025', NULL);
-- Expected: 10 rows with all stop data
```

### API Verification

```bash
# 1. Test team verification
curl -X POST https://your-app.netlify.app/.netlify/functions/team-verify \
  -H "Content-Type: application/json" \
  -d '{"code": "SUMMIT2025"}'

# Expected response:
{
  "teamId": "summit-seekers",
  "teamName": "Summit Seekers",
  "organizationId": "mountain-adventures",
  "huntId": "winter-2025",
  ...
}

# 2. Test consolidated active endpoint
curl "https://your-app.netlify.app/api/consolidated/active/mountain-adventures/summit-seekers/winter-2025"

# Expected response:
{
  "orgId": "mountain-adventures",
  "huntId": "winter-2025",
  "locations": {
    "name": "mountain-adventures - winter-2025",
    "locations": [
      {
        "id": "mountain-peak-viewpoint",
        "title": "Mountain Peak Viewpoint",
        "clue": "Where eagles soar...",
        ...
      },
      // ... 9 more stops
    ]
  },
  ...
}

# 3. Test leaderboard
curl "https://your-app.netlify.app/api/leaderboard/mountain-adventures/winter-2025"

# Expected response:
{
  "orgId": "mountain-adventures",
  "huntId": "winter-2025",
  "teams": [
    {
      "teamId": "summit-seekers",
      "completedStops": 0,
      "totalStops": 10,
      ...
    },
    {
      "teamId": "powder-pioneers",
      "completedStops": 0,
      "totalStops": 10,
      ...
    }
  ]
}
```

### Frontend Verification

1. **Login with Mountain Adventures code:**
   - Navigate to app
   - Enter team code: `SUMMIT2025`
   - Click verify

2. **Expected behavior:**
   - ✅ Login successful
   - ✅ Shows "10 stops" in progress card
   - ✅ Displays all 10 location cards with clues
   - ✅ Each stop shows title, clue, and hint button
   - ✅ Rankings tab shows both Mountain Adventures teams

3. **Common issues:**
   - ❌ "0 of 0 stops" → Database setup incomplete (run scripts above)
   - ❌ "Team code not found" → Team codes not created (run step 2)
   - ❌ No locations showing → `get_hunt_stops()` function missing (run step 1)
   - ❌ Wrong stops showing → Wrong org/hunt context (check app store)

## Troubleshooting

### Issue: "0 of 0 stops" after setup

**Diagnosis:**
```sql
-- Check if stops are linked to hunt
SELECT COUNT(*) FROM hunt_configurations
WHERE organization_id = 'mountain-adventures' AND hunt_id = 'winter-2025';
```

**If count = 0:**
- Run `scripts/sql/second-org-scavenger-hunt.sql` again
- Check for SQL errors in the output

**If count = 10:**
- Check API logs in Netlify Functions dashboard
- Look for `[locationsHelper]` logs
- Verify `get_hunt_stops()` function exists

### Issue: API returns empty locations array

**Check Netlify Function logs:**
```
[locationsHelper] Fetching locations for mountain-adventures/winter-2025
[locationsHelper] RPC get_hunt_stops failed, trying direct query: ...
[locationsHelper] Found 10 stops via fallback query
```

**If you see "RPC get_hunt_stops failed":**
- The `get_hunt_stops()` function doesn't exist
- Run `scripts/sql/complete-multi-org-setup.sql`

**If you see "No stops found":**
- Hunt configurations are missing
- Run `scripts/sql/second-org-scavenger-hunt.sql`

### Issue: Wrong org/hunt context

**Check browser console:**
```javascript
// Open DevTools → Console
// Run:
JSON.parse(localStorage.getItem('team-lock'))

// Should show:
{
  "organizationId": "mountain-adventures",
  "huntId": "winter-2025",
  ...
}
```

**If org/hunt is wrong:**
- Clear localStorage: `localStorage.clear()`
- Refresh page
- Login again with team code

### Issue: Pre-populated images not showing

**Check hunt photo_mode:**
```sql
SELECT photo_mode FROM hunts
WHERE organization_id = 'mountain-adventures' AND id = 'winter-2025';
-- Expected: 'pre_populated'
```

**If NULL or 'upload':**
- Run `scripts/sql/enable-pre-populated-images.sql`

**If 'pre_populated' but images not showing:**
- Check browser console for image load errors
- Google Photos URLs may be blocked
- Upload images to Cloudinary and update URLs

## Code Changes Summary

### Updated Files

1. **netlify/functions/_lib/locationsHelper.js**
   - ✅ Now uses `get_hunt_stops()` RPC function
   - ✅ Fallback to direct query if RPC fails
   - ✅ Supports `pre_populated_image_url` field
   - ✅ Properly filters by org/hunt

2. **scripts/sql/complete-multi-org-setup.sql** (NEW)
   - ✅ Creates all tables and indexes
   - ✅ Adds photo_mode and pre_populated_image_url columns
   - ✅ Creates get_hunt_stops() function
   - ✅ Idempotent (safe to re-run)

3. **scripts/sql/enable-pre-populated-images.sql** (NEW)
   - ✅ Enables pre-populated mode for Mountain Adventures
   - ✅ Adds image URLs to all stops

## Quick Fix Command Sequence

If you're seeing "0 of 0 stops", run these in Supabase SQL Editor in order:

```sql
-- 1. Core schema (2 min)
\i scripts/sql/complete-multi-org-setup.sql

-- 2. Mountain Adventures data (1 min)
\i scripts/sql/second-org-scavenger-hunt.sql

-- 3. Pre-populated images (optional, 30 sec)
\i scripts/sql/enable-pre-populated-images.sql
```

Then:
1. Clear browser cache/localStorage
2. Refresh app
3. Login with `SUMMIT2025`
4. Should see 10 stops!

## Expected Final State

After completing all steps:

### Database:
- ✅ 1 organization: `mountain-adventures`
- ✅ 1 hunt: `winter-2025` (with `photo_mode = 'pre_populated'`)
- ✅ 10 hunt stops (all with clues, hints, coordinates, image URLs)
- ✅ 10 hunt configurations (linking stops to hunt)
- ✅ 1 hunt ordering config (strategy: `fixed`)
- ✅ 2 teams: Summit Seekers, Powder Pioneers
- ✅ 2 team codes: SUMMIT2025, POWDER2025
- ✅ 2 settings records (one per team)

### Application:
- ✅ Login with SUMMIT2025 works
- ✅ Shows "0 of 10 stops" initially
- ✅ Displays all 10 location cards
- ✅ Each stop has title, clue, 3 hints
- ✅ Pre-populated images display (not upload buttons)
- ✅ Grayed camera icon visible
- ✅ Rankings show both teams
- ✅ Can complete stops without photos

### API Endpoints:
- ✅ `/api/consolidated/active/{org}/{team}/{hunt}` returns 10 locations
- ✅ `/api/leaderboard/{org}/{hunt}` returns 2 teams
- ✅ `/.netlify/functions/team-verify` validates SUMMIT2025

## Support

If issues persist after following this guide:

1. **Check Netlify Function logs:**
   - Netlify Dashboard → Functions → View logs
   - Look for `[locationsHelper]` or `[consolidated-active]` errors

2. **Check browser console:**
   - F12 → Console tab
   - Look for API errors or failed requests

3. **Verify database state:**
   - Run verification queries above
   - Check table row counts

4. **Review git changes:**
   - `git diff netlify/functions/_lib/locationsHelper.js`
   - Ensure file was updated correctly

5. **Restart dev server:**
   ```bash
   # Kill existing server
   # Restart:
   npm run dev
   ```

## Related Files

- `scripts/sql/complete-multi-org-setup.sql` - Core schema
- `scripts/sql/second-org-scavenger-hunt.sql` - Mountain Adventures data
- `scripts/sql/enable-pre-populated-images.sql` - Pre-populated image mode
- `netlify/functions/_lib/locationsHelper.js` - Updated to use hunt_stops
- `netlify/functions/consolidated-active.js` - Main data endpoint
- `docs/MULTI_ORG_RANKINGS_VERIFICATION.md` - Rankings verification
- `backlog/epic-demo-scavenger-hunt/STORY-006-pre-populated-images.md` - Pre-populated images spec
