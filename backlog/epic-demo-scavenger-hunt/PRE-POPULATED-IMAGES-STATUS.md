# Pre-Populated Images - Implementation Status

## Current Status: ⚠️ PARTIALLY READY

### ✅ Completed
1. **Database Schema Created**
   - SQL script: `scripts/sql/enable-pre-populated-images.sql`
   - Adds `photo_mode` column to `hunts` table
   - Adds `pre_populated_image_url` column to `hunt_stops` table
   - Sets Mountain Adventures hunt to `photo_mode = 'pre_populated'`
   - Populates all 10 stops with test image URL

2. **Documentation Complete**
   - Full implementation spec: `STORY-006-pre-populated-images.md`
   - Contains all frontend/backend changes needed
   - Testing strategy defined
   - Migration plan documented

### ❌ Not Implemented (Frontend)
The following code changes are **required** before this feature will work:

1. **Backend API Updates**
   - [ ] `netlify/functions/consolidated-active.js` - Return `photo_mode` from hunt
   - [ ] `netlify/functions/consolidated-active.js` - Return `pre_populated_image_url` from stops
   - [ ] `netlify/functions/progress-patch-supabase.js` - Allow null photos for pre_populated mode

2. **App Store Updates**
   - [ ] `src/store/appStore.ts` - Add `photoMode` state
   - [ ] `src/store/appStore.ts` - Add `setPhotoMode()` action

3. **Component Updates**
   - [ ] `src/features/teamLock/TeamLockWrapper.tsx` - Set photo mode from API response
   - [ ] `src/features/app/StopCard.tsx` - Conditional rendering based on photo mode
   - [ ] `src/features/app/StopsList.tsx` - Pass photo mode to StopCard
   - [ ] `src/features/views/ActiveView.tsx` - Get photo mode from store and pass to children

4. **Type Updates**
   - [ ] `src/types/consolidated.ts` - Add `photo_mode` to hunt type
   - [ ] `src/types/consolidated.ts` - Add `pre_populated_image_url` to location type

## How to Test (After Implementation)

### Database Setup
1. Run the SQL script in Supabase:
   ```bash
   # Copy contents of scripts/sql/enable-pre-populated-images.sql
   # Paste into Supabase SQL Editor
   # Execute
   ```

2. Verify setup:
   ```sql
   -- Should show photo_mode = 'pre_populated'
   SELECT photo_mode FROM hunts
   WHERE organization_id = 'mountain-adventures' AND id = 'winter-2025';

   -- Should show 10 stops with image URLs
   SELECT stop_id, pre_populated_image_url FROM hunt_stops
   WHERE stop_id LIKE 'mountain-%' OR stop_id LIKE '%-viewpoint';
   ```

### Frontend Testing
1. Login with Mountain Adventures team code: `SUMMIT2025` or `POWDER2025`
2. Expected behavior:
   - ✅ Pre-populated image displays for each stop
   - ✅ Upload button is hidden
   - ✅ Grayed camera icon shown
   - ✅ Stops can be completed without uploading photos
   - ✅ Progress syncs correctly

### Comparison Test
1. Login with BHHS team code: `BERRY01`
   - Should show upload mode (existing behavior)
2. Logout and login with Mountain Adventures: `SUMMIT2025`
   - Should show pre-populated mode (new behavior)

## Current Configuration

### Mountain Adventures Hunt
- **Organization**: `mountain-adventures`
- **Hunt ID**: `winter-2025`
- **Photo Mode**: `pre_populated` ✅
- **Team Codes**: `SUMMIT2025`, `POWDER2025`
- **Stops**: 10 locations, all with image URL

### Test Image URL
- **URL**: https://photos.app.goo.gl/nBDjjNVW9ooZL2Mo6
- **Applied to**: All 10 Mountain Adventures stops
- **Note**: Same image used for all stops as test (in production, each should have unique image)

### ⚠️ Google Photos URL Warning
The test URL is a Google Photos shared album link, which has limitations:
- May expire or change over time
- May not embed properly in all contexts
- Not recommended for production

**For production**: Upload unique images to Cloudinary and use those URLs instead.

## Implementation Order

### Phase 1: Backend (Required First)
1. Update `consolidated-active.js` to return photo mode and image URLs
2. Update `progress-patch-supabase.js` to handle pre-populated mode
3. Test API responses manually

### Phase 2: Frontend Store
1. Add `photoMode` to app store
2. Update TeamLockWrapper to set photo mode
3. Test state management

### Phase 3: UI Components
1. Update StopCard with conditional rendering
2. Update parent components to pass photo mode
3. Test UI behavior

### Phase 4: Testing & QA
1. Run E2E tests
2. Manual testing with both modes
3. Cross-browser testing
4. Mobile testing

## Quick Start Implementation

If you want to implement this feature, follow these steps in order:

### Step 1: Database (5 minutes)
```bash
# Execute SQL script in Supabase
cat scripts/sql/enable-pre-populated-images.sql | supabase db execute
```

### Step 2: Backend API (30 minutes)
See detailed code in `STORY-006-pre-populated-images.md` section "Frontend Changes > 1. Update consolidated-active.js"

### Step 3: App Store (15 minutes)
See detailed code in `STORY-006-pre-populated-images.md` section "Frontend Changes > 2. Update App Store"

### Step 4: Components (60 minutes)
See detailed code in `STORY-006-pre-populated-images.md` sections 3-6

### Step 5: Test (30 minutes)
Use test plan from `STORY-006-pre-populated-images.md` section "Testing Strategy"

**Total Estimated Time**: 2-3 hours

## Files Created

1. ✅ `scripts/sql/enable-pre-populated-images.sql` - Database setup
2. ✅ `backlog/epic-demo-scavenger-hunt/STORY-006-pre-populated-images.md` - Full spec
3. ✅ `backlog/epic-demo-scavenger-hunt/PRE-POPULATED-IMAGES-STATUS.md` - This status doc

## Next Actions

### To Enable This Feature:
1. Review `STORY-006-pre-populated-images.md` for complete implementation details
2. Execute database script in Supabase
3. Implement backend API changes
4. Implement frontend changes
5. Test with Mountain Adventures team codes

### To Rollback:
```sql
-- Run this in Supabase SQL Editor to disable
UPDATE hunts
SET photo_mode = 'upload'
WHERE organization_id = 'mountain-adventures' AND id = 'winter-2025';
```

## Support

- **Full Specification**: `backlog/epic-demo-scavenger-hunt/STORY-006-pre-populated-images.md`
- **Database Script**: `scripts/sql/enable-pre-populated-images.sql`
- **Test Team Codes**: `SUMMIT2025`, `POWDER2025`
- **Test Image URL**: https://photos.app.goo.gl/nBDjjNVW9ooZL2Mo6
