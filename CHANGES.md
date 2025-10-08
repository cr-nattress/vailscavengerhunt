# Changes Summary - Multi-Org Support & Pre-Populated Images

## Issues Fixed

### 1. "0 of 0 stops" Problem ✅
**Root Cause**: Application was looking for stops in `kv_store` table instead of new `hunt_stops` table.

**Solution**: Updated `locationsHelper.js` to use the `get_hunt_stops()` database function and fall back to direct queries.

### 2. Pre-Populated Images Not Displaying ✅
**Root Cause**: No frontend support for `pre_populated_image_url` field.

**Solution**: Updated `StopCard.tsx` to detect and display pre-populated images, hide upload button, and show disabled camera icon.

## Files Modified

### Backend

#### `netlify/functions/_lib/locationsHelper.js`
**Changes:**
- ✅ Now calls `get_hunt_stops()` RPC function for multi-org support
- ✅ Falls back to direct query if RPC fails
- ✅ Includes `pre_populated_image_url` in response
- ✅ Properly parses lat/lng as floats
- ✅ Adds `originalNumber` field for stop ordering

**Before:**
```javascript
// Looked in kv_store table
const { data: stopData } = await supabase
  .from('kv_store')
  .select('key, value')
  .like('key', `${orgId}/${huntId}/stops/%`)
```

**After:**
```javascript
// Uses hunt_stops via RPC function
const { data: stopData } = await supabase
  .rpc('get_hunt_stops', {
    p_organization_id: orgId,
    p_hunt_id: huntId,
    p_team_id: teamId
  })

// Falls back to direct query if RPC fails
const { data: fallbackData } = await supabase
  .from('hunt_configurations')
  .select(`
    stop_id,
    default_order,
    hunt_stops (
      stop_id,
      title,
      description,
      clue,
      hints,
      position_lat,
      position_lng,
      pre_populated_image_url
    )
  `)
```

### Frontend

#### `src/features/app/StopCard.tsx`
**Changes:**
- ✅ Detects `pre_populated_image_url` field from stop data
- ✅ Displays pre-populated image instead of placeholder
- ✅ Hides upload button when pre-populated image exists
- ✅ Shows grayed-out camera icon in viewing mode
- ✅ Updates status text to "📷 Reference Photo"
- ✅ Updates caption to "🖼️ Location reference image"
- ✅ Removes title blur when pre-populated image exists
- ✅ Keeps hints/clues visible (helps users find location)

**Display Logic:**
```typescript
// Check for pre-populated image
const hasPrePopulatedImage = !!(stop as any).pre_populated_image_url
const prePopulatedImageUrl = (stop as any).pre_populated_image_url

// Display priority: pre-populated > user photo > preview > placeholder
const displayImage = hasPrePopulatedImage
  ? prePopulatedImageUrl
  : (previewImage || state.photo || PLACEHOLDER)
```

**Upload Button Visibility:**
```tsx
{/* Only show upload button if NOT pre-populated and no user photo */}
{!hasPrePopulatedImage && !state.photo && (
  <div className='mt-3'>
    <input type='file' ... />
    <label>📸 Upload Photo</label>
  </div>
)}
```

**Disabled Camera Icon:**
```tsx
{/* Show disabled camera in pre-populated mode */}
{hasPrePopulatedImage && !state.done && (
  <div className='mt-3 flex items-center justify-center gap-2 px-4 py-3 rounded-lg'
       style={{
         backgroundColor: 'var(--color-surface)',
         border: '1px solid var(--color-border)',
         opacity: 0.6
       }}>
    <svg>...</svg>
    <span>Photo viewing mode</span>
  </div>
)}
```

## Files Created

### Database Scripts

#### `scripts/sql/complete-multi-org-setup.sql`
**Purpose**: Complete schema setup for multi-org hunt system

**Creates:**
- ✅ All core tables (organizations, hunts, hunt_stops, etc.)
- ✅ Pre-populated image support columns
- ✅ Performance indexes
- ✅ `get_hunt_stops()` function
- ✅ Idempotent (safe to re-run)

#### `scripts/sql/enable-pre-populated-images.sql`
**Purpose**: Enable pre-populated mode for Mountain Adventures

**Does:**
- ✅ Adds `photo_mode` column to hunts table
- ✅ Adds `pre_populated_image_url` column to hunt_stops
- ✅ Sets Mountain Adventures hunt to `pre_populated` mode
- ✅ Adds test image URL to all 10 stops
- ✅ Includes verification queries

### Documentation

#### `scripts/sql/SETUP_GUIDE.md`
**Purpose**: Complete troubleshooting guide for "0 of 0 stops" issue

**Contains:**
- ✅ 3-step setup process
- ✅ Database verification queries
- ✅ API testing commands
- ✅ Frontend verification checklist
- ✅ Common issues and solutions
- ✅ Quick fix command sequence

#### `docs/MULTI_ORG_RANKINGS_VERIFICATION.md`
**Purpose**: Verify rankings are properly filtered by org/hunt

**Contains:**
- ✅ Implementation analysis
- ✅ Data flow diagrams
- ✅ Test scenarios
- ✅ Security verification

#### `backlog/epic-demo-scavenger-hunt/STORY-006-pre-populated-images.md`
**Purpose**: Complete specification for pre-populated images feature

**Contains:**
- ✅ Database schema changes
- ✅ Frontend implementation details
- ✅ API updates
- ✅ Testing strategy
- ✅ Migration plan

#### `backlog/epic-demo-scavenger-hunt/PRE-POPULATED-IMAGES-STATUS.md`
**Purpose**: Implementation status tracker

**Contains:**
- ✅ Completed items
- ✅ Pending items
- ✅ Test instructions
- ✅ Configuration details

## Database Schema Changes

### New Columns

#### `hunts` table
```sql
ALTER TABLE hunts
ADD COLUMN photo_mode TEXT DEFAULT 'upload'
CHECK (photo_mode IN ('upload', 'pre_populated'));
```

#### `hunt_stops` table
```sql
ALTER TABLE hunt_stops
ADD COLUMN pre_populated_image_url TEXT;
```

### New Function

```sql
CREATE OR REPLACE FUNCTION get_hunt_stops(
  p_organization_id TEXT,
  p_hunt_id TEXT,
  p_team_id UUID DEFAULT NULL
)
RETURNS TABLE (
  stop_id TEXT,
  title TEXT,
  description TEXT,
  clue TEXT,
  hints JSONB,
  position_lat DECIMAL,
  position_lng DECIMAL,
  step_order INTEGER,
  is_completed BOOLEAN,
  pre_populated_image_url TEXT
)
```

## Setup Instructions

### Quick Start (3 steps)

Run these SQL scripts in Supabase SQL Editor:

```sql
-- Step 1: Core schema (2 min)
-- Run: scripts/sql/complete-multi-org-setup.sql

-- Step 2: Mountain Adventures data (1 min)
-- Run: scripts/sql/second-org-scavenger-hunt.sql

-- Step 3: Pre-populated images (30 sec)
-- Run: scripts/sql/enable-pre-populated-images.sql
```

### Verification

```bash
# Test login
# Team code: SUMMIT2025 or POWDER2025
# Expected: See 10 stops with pre-populated images

# Test API
curl "https://your-app.netlify.app/api/consolidated/active/mountain-adventures/summit-seekers/winter-2025"
# Expected: 10 locations with pre_populated_image_url field
```

## Expected Behavior

### Upload Mode (e.g., BHHS org)
- ✅ Shows placeholder image (`/images/selfie-placeholder.svg`)
- ✅ Shows "📸 Upload Photo" button
- ✅ Title is blurred until photo uploaded
- ✅ Clues/hints hidden after photo uploaded

### Pre-Populated Mode (e.g., Mountain Adventures)
- ✅ Shows pre-populated image (from database URL)
- ✅ Hides upload button
- ✅ Shows grayed camera icon with "Photo viewing mode" text
- ✅ Title is NOT blurred
- ✅ Clues/hints visible (helps find location)
- ✅ Status shows "📷 Reference Photo"
- ✅ Caption shows "🖼️ Location reference image"

## Testing Checklist

### Database
- [x] Core schema exists (complete-multi-org-setup.sql)
- [x] Mountain Adventures org/hunt exists
- [x] 10 hunt stops created
- [x] Hunt configurations link stops to hunt
- [x] 2 teams created (Summit Seekers, Powder Pioneers)
- [x] 2 team codes created (SUMMIT2025, POWDER2025)
- [x] `get_hunt_stops()` function exists
- [x] `photo_mode` column exists on hunts
- [x] `pre_populated_image_url` column exists on hunt_stops

### Backend
- [x] locationsHelper.js uses hunt_stops table
- [x] locationsHelper.js includes pre_populated_image_url
- [x] consolidated-active returns 10 locations
- [x] Locations include pre_populated_image_url field

### Frontend
- [x] StopCard detects pre_populated_image_url
- [x] Pre-populated image displays instead of placeholder
- [x] Upload button hidden in pre-populated mode
- [x] Camera icon grayed out in pre-populated mode
- [x] Title not blurred with pre-populated image
- [x] Clues/hints still visible in pre-populated mode

### Integration
- [ ] Login with SUMMIT2025 shows 10 stops
- [ ] Pre-populated images load correctly
- [ ] Upload button not visible
- [ ] Grayed camera icon visible
- [ ] Can complete stops (mark as visited)
- [ ] Rankings show both Mountain Adventures teams
- [ ] Switch to BHHS code shows upload mode

## Known Issues & Notes

### Google Photos URL Limitation
The test uses a Google Photos shared album URL which may:
- ❌ Expire over time
- ❌ Not embed properly in all contexts
- ❌ Have rate limiting

**Recommendation for Production:**
Upload images to Cloudinary and update URLs:
```sql
UPDATE hunt_stops
SET pre_populated_image_url = 'https://res.cloudinary.com/your-cloud/image/upload/v1/mountain-adventures/mountain-peak-viewpoint.jpg'
WHERE stop_id = 'mountain-peak-viewpoint';
```

### Image Display
Pre-populated images have subtle visual treatment:
- `opacity: 0.95` - Slightly dimmed
- `filter: brightness(0.95)` - Slightly darker

This helps visually distinguish them from user-uploaded photos.

## Rollback Plan

If issues occur, run in Supabase SQL Editor:

```sql
-- Revert to upload mode
UPDATE hunts
SET photo_mode = 'upload'
WHERE organization_id = 'mountain-adventures' AND id = 'winter-2025';

-- Clear pre-populated image URLs
UPDATE hunt_stops
SET pre_populated_image_url = NULL
WHERE stop_id IN (
  SELECT stop_id FROM hunt_configurations
  WHERE organization_id = 'mountain-adventures' AND hunt_id = 'winter-2025'
);
```

## Next Steps

1. **Test in production** with Mountain Adventures team codes
2. **Upload production images** to Cloudinary (replace Google Photos URL)
3. **Create demo org** using the same pattern
4. **Document admin workflow** for creating new orgs/hunts
5. **Add UI tests** for pre-populated mode

## Support

See detailed troubleshooting in:
- `scripts/sql/SETUP_GUIDE.md` - Complete setup guide
- `backlog/epic-demo-scavenger-hunt/STORY-006-pre-populated-images.md` - Full specification

For issues:
1. Check Netlify Function logs for `[locationsHelper]` errors
2. Run database verification queries from SETUP_GUIDE.md
3. Check browser console for API errors
4. Verify localStorage has correct org/hunt context
