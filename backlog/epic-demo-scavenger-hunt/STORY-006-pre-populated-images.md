# Story 006: Pre-Populated Images Configuration

## Overview
Add configuration support for hunts where participants view pre-selected images instead of uploading their own photos. The camera upload UI is replaced with a grayed-out camera icon and a pre-populated image URL, creating a "view-only" experience while maintaining the same UI structure.

## Business Use Case
- **Demo/Showcase Mode**: Display professional photos for demonstration hunts
- **Virtual Tours**: Show curated location images for remote participants
- **Preview Mode**: Allow users to see what locations look like before participating
- **Educational Tours**: Display historical or educational images at each stop
- **Accessibility**: Support users who cannot take photos

## Current State Analysis

### Photo Upload Flow
1. **StopCard.tsx** (lines 48-53, 215-257)
   - File input for photo selection
   - Handles `onChange` event → calls `onUpload`
   - Shows upload button with loading states
   - Displays uploaded photo or placeholder

2. **usePhotoUpload.ts** (lines 45-185)
   - Validates file size and type
   - Uploads to Cloudinary
   - Updates progress via API
   - Returns `photoUrl`

3. **ActiveView.tsx** (lines 136-148)
   - Coordinates upload flow
   - Sets preview URLs
   - Calls `uploadPhoto` hook
   - Refetches data after success

4. **Database: hunt_progress table**
   - `photo_url TEXT` - Stores Cloudinary URL
   - User-uploaded photos stored here
   - No field for pre-configured images

5. **Database: hunt_stops table**
   - `stop_id`, `title`, `description`, `clue`, `hints`
   - `position_lat`, `position_lng`
   - **Missing**: No image URL field

## Proposed Solution

### Architecture Decision
**Option A: Hunt-Level Configuration (Recommended)**
- Single setting applies to entire hunt
- All stops use pre-populated images OR all allow uploads
- Simpler implementation, clearer UX
- Less database complexity

**Option B: Stop-Level Configuration**
- Each stop independently configured
- Mix of pre-populated and upload stops
- More flexible but complex UX
- Requires per-stop configuration

**Recommendation**: Use Option A for initial implementation

### Database Changes

#### 1. Add Hunt Configuration
```sql
-- Add to hunts table
ALTER TABLE hunts
ADD COLUMN photo_mode TEXT DEFAULT 'upload'
CHECK (photo_mode IN ('upload', 'pre_populated'));

-- Add to hunt_stops table
ALTER TABLE hunt_stops
ADD COLUMN pre_populated_image_url TEXT;

COMMENT ON COLUMN hunts.photo_mode IS
  'Determines photo behavior: upload (user photos) or pre_populated (fixed images)';

COMMENT ON COLUMN hunt_stops.pre_populated_image_url IS
  'URL to display when photo_mode is pre_populated. Ignored for upload mode.';
```

#### 2. Update Demo Hunt
```sql
-- Set demo hunt to pre-populated mode
UPDATE hunts
SET photo_mode = 'pre_populated'
WHERE organization_id = 'demo-org' AND id = 'demo-2025';

-- Add image URLs to demo stops
UPDATE hunt_stops
SET pre_populated_image_url = 'https://res.cloudinary.com/demo/image/upload/v1/demo-hunt/city-park-fountain.jpg'
WHERE stop_id = 'city-park-fountain';

UPDATE hunt_stops
SET pre_populated_image_url = 'https://res.cloudinary.com/demo/image/upload/v1/demo-hunt/historic-library.jpg'
WHERE stop_id = 'historic-library';

-- ... (repeat for all demo stops)
```

### Frontend Changes

#### 1. Update consolidated-active.js API Response
```javascript
// netlify/functions/consolidated-active.js
export const handler = async (event) => {
  // ... existing code ...

  // Add hunt photo_mode to response
  const { data: huntData } = await supabase
    .from('hunts')
    .select('id, name, photo_mode')
    .eq('organization_id', orgId)
    .eq('id', huntId)
    .single()

  // Include pre_populated_image_url in locations
  const { data: stops } = await supabase
    .from('hunt_stops')
    .select('stop_id, title, description, clue, hints, pre_populated_image_url')
    .in('stop_id', configuredStopIds)

  return {
    statusCode: 200,
    body: JSON.stringify({
      hunt: huntData, // NEW: includes photo_mode
      locations: {
        locations: stops, // NOW includes pre_populated_image_url
        // ...
      },
      // ...
    })
  }
}
```

#### 2. Update App Store with Photo Mode
```typescript
// src/store/appStore.ts
interface AppStore {
  // ... existing fields ...
  photoMode: 'upload' | 'pre_populated'
  setPhotoMode: (mode: 'upload' | 'pre_populated') => void
}

export const useAppStore = create<AppStore>((set) => ({
  // ... existing state ...
  photoMode: 'upload',
  setPhotoMode: (photoMode) => set({ photoMode }),
}))
```

#### 3. Update TeamLockWrapper to Set Photo Mode
```typescript
// src/features/teamLock/TeamLockWrapper.tsx (around line 45)
if (fullResponse.activeData?.hunt) {
  setPhotoMode(fullResponse.activeData.hunt.photo_mode || 'upload')
}
```

#### 4. Update StopCard Component
```tsx
// src/features/app/StopCard.tsx

interface StopCardProps {
  stop: any
  progress: any
  onUpload: (stopId: string, file: File) => Promise<void>
  onToggleExpanded: (stopId: string) => void
  expanded: boolean
  uploadingStops: Set<string>
  transitioningStops: Set<string>
  revealNextHint: () => void
  index: number
  previewImage?: string
  isSaving?: boolean
  photoMode?: 'upload' | 'pre_populated' // NEW
}

export default function StopCard({
  stop,
  progress,
  onUpload,
  // ... other props
  photoMode = 'upload' // NEW with default
}: StopCardProps) {
  const state = progress[stop.id] || { done: false, notes: '', photo: null, revealedHints: 0 }

  // Determine display image based on mode
  const displayImage = photoMode === 'pre_populated'
    ? stop.pre_populated_image_url || PLACEHOLDER
    : (previewImage || state.photo || PLACEHOLDER)

  const isPrePopulated = photoMode === 'pre_populated'
  const hasUserPhoto = state.photo || previewImage

  // ... existing code ...

  return (
    <div className={/* ... */}>
      {/* ... existing header ... */}

      <div className='mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3'>
        <div className='rounded-xl p-3' style={{ border: '1px solid var(--color-border)' }}>

          {/* Status indicator */}
          {isPrePopulated ? (
            <div className='text-xs uppercase tracking-wide flex items-center gap-1'
                 style={{ color: 'var(--color-text-secondary)' }}>
              📷 Reference Photo
            </div>
          ) : hasUserPhoto ? (
            <div className='text-xs uppercase tracking-wide'
                 style={{ color: 'var(--color-success)' }}>
              ✅ Photo Complete
            </div>
          ) : null}

          {/* Image display */}
          {displayImage && (
            <img
              src={displayImage}
              alt={isPrePopulated ? 'Reference photo' : 'Selfie'}
              className='mt-2 rounded-md object-cover w-full h-40'
              style={{
                opacity: isPrePopulated ? 0.9 : 1,
                filter: isPrePopulated ? 'grayscale(20%)' : 'none'
              }}
              onError={(e) => {(e.target as HTMLElement).style.display='none'}}
            />
          )}

          {/* Caption */}
          <div className='mt-2 flex items-center gap-2 text-xs'
               style={{ color: 'var(--color-text-secondary)' }}>
            {isPrePopulated
              ? '🖼️ Location reference image'
              : hasUserPhoto
                ? '✨ Your selected photo'
                : '📷 Capture a creative selfie together at this location.'}
          </div>
        </div>
      </div>

      {/* Upload button - only show for upload mode */}
      {!isPrePopulated && !state.photo && (
        <div className='mt-3'>
          <input
            type='file'
            accept='image/*'
            onChange={handlePhotoUpload}
            className='hidden'
            id={`file-${stop.id}`}
          />
          <label
            htmlFor={`file-${stop.id}`}
            className={/* ... existing classes ... */}
            style={/* ... existing styles ... */}
          >
            {/* ... existing upload button content ... */}
          </label>
        </div>
      )}

      {/* Pre-populated mode: Show grayed camera icon */}
      {isPrePopulated && !state.done && (
        <div className='mt-3 flex items-center justify-center gap-2 px-4 py-3 rounded-lg'
             style={{
               backgroundColor: 'var(--color-surface)',
               border: '1px solid var(--color-border)',
               opacity: 0.6
             }}>
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"
               style={{ color: 'var(--color-text-secondary)' }}>
            <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
          <span style={{ color: 'var(--color-text-secondary)' }}>
            Photo viewing mode
          </span>
        </div>
      )}

      {/* ... rest of component ... */}
    </div>
  )
}
```

#### 5. Update ActiveView to Pass Photo Mode
```tsx
// src/features/views/ActiveView.tsx (around line 170)
const { photoMode } = useAppStore()

// ...

<StopsList
  stops={stops}
  progress={progress}
  onPhotoUpload={handlePhotoUpload}
  onToggleExpanded={toggleStopExpanded}
  expandedStops={expandedStops}
  uploadingStops={uploadingStops}
  transitioningStops={transitioningStops}
  onRevealNextHint={revealNextHint}
  previewUrls={previewUrls}
  savingStops={savingStops}
  photoMode={photoMode} // NEW
/>
```

#### 6. Update StopsList to Forward Photo Mode
```tsx
// src/features/app/StopsList.tsx
interface StopsListProps {
  // ... existing props ...
  photoMode?: 'upload' | 'pre_populated'
}

export default function StopsList({
  stops,
  // ... other props
  photoMode
}: StopsListProps) {
  return (
    <div>
      {stops.map((stop, index) => (
        <StopCard
          key={stop.id}
          stop={stop}
          // ... other props
          photoMode={photoMode} // NEW
        />
      ))}
    </div>
  )
}
```

### Progress Completion Logic

#### Option 1: Auto-Complete on Clue Reveal (Recommended)
When `photoMode = 'pre_populated'`, mark stop as complete when user reveals all hints or after viewing for X seconds.

```typescript
// src/features/app/StopCard.tsx
useEffect(() => {
  if (photoMode === 'pre_populated' && !state.done) {
    // Auto-complete after all hints revealed
    if (state.revealedHints >= (stop.hints?.length || 0)) {
      // Mark as complete without photo
      onAutoComplete?.(stop.id)
    }
  }
}, [photoMode, state.revealedHints, stop.hints, state.done])
```

#### Option 2: Manual "Mark Complete" Button
Add explicit button for pre-populated mode:

```tsx
{isPrePopulated && !state.done && (
  <button
    onClick={() => onMarkComplete(stop.id)}
    className='mt-3 w-full px-4 py-3 rounded-lg font-medium'
    style={{
      backgroundColor: 'var(--color-accent)',
      color: 'white'
    }}
  >
    ✓ Mark as Visited
  </button>
)}
```

### API Changes

#### consolidated-active.js
```javascript
// Include hunt.photo_mode in response
const huntInfo = await supabase
  .from('hunts')
  .select('id, name, photo_mode, start_date, end_date')
  .eq('organization_id', orgId)
  .eq('id', huntId)
  .single()

// Include pre_populated_image_url in stops
const stopsWithImages = await supabase
  .from('hunt_stops')
  .select(`
    stop_id,
    title,
    description,
    clue,
    hints,
    position_lat,
    position_lng,
    pre_populated_image_url
  `)
  // ...

return {
  statusCode: 200,
  body: JSON.stringify({
    hunt: huntInfo.data,
    locations: {
      locations: stopsWithImages.data,
      // ...
    },
    // ...
  })
}
```

#### progress-patch-supabase.js
```javascript
// Allow completing without photo when photo_mode = 'pre_populated'
export const handler = async (event) => {
  const { orgId, teamId, huntId, stopId } = getPathParams(event.path)
  const { done, photo_url } = JSON.parse(event.body)

  // Check hunt photo mode
  const { data: hunt } = await supabase
    .from('hunts')
    .select('photo_mode')
    .eq('organization_id', orgId)
    .eq('id', huntId)
    .single()

  // Validate: if upload mode, require photo to mark done
  if (hunt?.photo_mode === 'upload' && done && !photo_url) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'Photo required to complete stop in upload mode'
      })
    }
  }

  // Update progress (photo_url can be null for pre_populated mode)
  const { data, error } = await supabase
    .from('hunt_progress')
    .upsert({
      team_id: teamId,
      location_id: stopId,
      done,
      photo_url: photo_url || null,
      completed_at: done ? new Date().toISOString() : null
    })

  // ...
}
```

## Configuration Files

### Environment Variables
```bash
# .env
# No new env vars needed - uses existing Cloudinary for pre-populated images
```

### Public Config (netlify/functions/_lib/config.js)
```javascript
export function getPublicConfig() {
  return {
    // ... existing config ...

    // Photo behavior settings (optional - could be hunt-specific)
    DEFAULT_PHOTO_MODE: process.env.DEFAULT_PHOTO_MODE || 'upload',
    ALLOW_PHOTO_MODE_OVERRIDE: process.env.ALLOW_PHOTO_MODE_OVERRIDE === 'true',
  }
}
```

## Image Storage Strategy

### Option 1: Use Cloudinary (Recommended)
- Upload curated images to Cloudinary
- Store URLs in `hunt_stops.pre_populated_image_url`
- Leverage existing CDN and transformations
- Example URL: `https://res.cloudinary.com/demo/image/upload/v1/demo-hunt/stop-1.jpg`

### Option 2: Use Supabase Storage
- Store images in Supabase Storage bucket
- Generate public URLs
- Example URL: `https://[project].supabase.co/storage/v1/object/public/hunt-images/stop-1.jpg`

### Option 3: External URLs
- Link to any public image URL
- No storage needed
- Less control over availability

**Recommendation**: Use Cloudinary for consistency with existing photo infrastructure

## Testing Strategy

### Unit Tests
- [ ] StopCard renders pre-populated image when `photoMode='pre_populated'`
- [ ] StopCard hides upload button in pre-populated mode
- [ ] StopCard shows grayed camera icon in pre-populated mode
- [ ] Progress can be marked complete without photo in pre-populated mode

### Integration Tests
- [ ] consolidated-active returns `photo_mode` from hunt
- [ ] consolidated-active returns `pre_populated_image_url` from stops
- [ ] progress-patch allows completion without photo when mode is pre_populated
- [ ] App store correctly sets and persists photo mode

### E2E Tests
```javascript
// tests/e2e/pre-populated-images.test.js
describe('Pre-Populated Images', () => {
  it('should display reference images in pre-populated mode', async () => {
    // Login with demo team (demo-org)
    await login('DEMO01')

    // Verify photo mode is pre_populated
    const photoMode = await getPhotoMode()
    expect(photoMode).toBe('pre_populated')

    // Check first stop shows pre-populated image
    const stop1Image = await getStopImage('city-park-fountain')
    expect(stop1Image.src).toContain('demo-hunt/city-park-fountain.jpg')

    // Verify upload button is hidden
    const uploadButton = await page.$('#file-city-park-fountain')
    expect(uploadButton).toBeNull()

    // Verify grayed camera icon is visible
    const cameraIcon = await page.$('.camera-icon-grayed')
    expect(cameraIcon).toBeTruthy()
  })

  it('should allow completion without photo upload', async () => {
    await login('DEMO01')

    // Mark stop as complete (no photo)
    await markStopComplete('city-park-fountain')

    // Verify progress updated
    const progress = await getProgress()
    expect(progress['city-park-fountain'].done).toBe(true)
    expect(progress['city-park-fountain'].photo).toBeNull()
  })

  it('should switch between upload and pre-populated modes', async () => {
    // Login with BHHS team (upload mode)
    await login('BERRY01')
    expect(await getPhotoMode()).toBe('upload')
    expect(await isUploadButtonVisible()).toBe(true)

    // Switch to demo team (pre-populated mode)
    await logout()
    await login('DEMO01')
    expect(await getPhotoMode()).toBe('pre_populated')
    expect(await isUploadButtonVisible()).toBe(false)
  })
})
```

### Manual Testing Checklist
- [ ] Demo org displays pre-populated images
- [ ] BHHS org still allows photo uploads
- [ ] Pre-populated images load correctly
- [ ] Camera icon is grayed out in pre-populated mode
- [ ] Upload button hidden in pre-populated mode
- [ ] Stops can be completed without photos in pre-populated mode
- [ ] Progress syncs correctly across devices
- [ ] Leaderboard works with pre-populated hunts
- [ ] History view shows pre-populated images

## Migration Plan

### Phase 1: Database Schema
1. Add `photo_mode` column to `hunts` table
2. Add `pre_populated_image_url` column to `hunt_stops` table
3. Set default values for existing hunts (`photo_mode = 'upload'`)

### Phase 2: Upload Reference Images
1. Select 5 high-quality reference images for demo stops
2. Upload to Cloudinary under `demo-hunt/` folder
3. Update demo hunt stops with image URLs

### Phase 3: Backend API Updates
1. Update `consolidated-active.js` to return `photo_mode` and `pre_populated_image_url`
2. Update `progress-patch-supabase.js` to allow null photos for pre-populated mode
3. Update `login-initialize.js` if needed

### Phase 4: Frontend Updates
1. Add `photoMode` to app store
2. Update `TeamLockWrapper` to set photo mode from API
3. Update `StopCard` component with conditional rendering
4. Update `ActiveView` to pass photo mode to children
5. Update `StopsList` to forward photo mode

### Phase 5: Testing & Deployment
1. Run unit tests
2. Run integration tests
3. Run E2E tests
4. Manual QA on demo hunt
5. Deploy to staging
6. Final QA
7. Deploy to production

## Files to Create/Modify

### New Files
- [ ] `backlog/epic-demo-scavenger-hunt/STORY-006-pre-populated-images.md` (this file)
- [ ] `tests/e2e/pre-populated-images.test.js`
- [ ] `scripts/sql/add-photo-mode-columns.sql`
- [ ] `scripts/upload-demo-images.js` (Cloudinary upload script)

### Modified Files
- [ ] `scripts/sql/supabase-hunt-system.sql` - Add new columns
- [ ] `scripts/sql/demo-org-scavenger-hunt.sql` - Set photo_mode and image URLs
- [ ] `netlify/functions/consolidated-active.js` - Return photo_mode
- [ ] `netlify/functions/progress-patch-supabase.js` - Allow null photos
- [ ] `src/store/appStore.ts` - Add photoMode state
- [ ] `src/features/teamLock/TeamLockWrapper.tsx` - Set photo mode
- [ ] `src/features/app/StopCard.tsx` - Conditional rendering for modes
- [ ] `src/features/app/StopsList.tsx` - Pass photo mode to cards
- [ ] `src/features/views/ActiveView.tsx` - Get and pass photo mode
- [ ] `src/types/consolidated.ts` - Add photo_mode to types

## Acceptance Criteria

### Functional
- [ ] Hunt can be configured with `photo_mode = 'pre_populated'`
- [ ] Pre-populated image URLs can be set per stop
- [ ] Frontend displays pre-populated images when configured
- [ ] Upload button hidden in pre-populated mode
- [ ] Grayed camera icon shown in pre-populated mode
- [ ] Stops can be completed without photos in pre-populated mode
- [ ] Upload mode continues to work unchanged
- [ ] Demo org uses pre-populated mode successfully

### Non-Functional
- [ ] Image loading performance < 2s per stop
- [ ] No impact on upload mode performance
- [ ] Mobile responsive on all devices
- [ ] Accessible (screen reader compatible)
- [ ] Images optimized via Cloudinary transformations

### Edge Cases
- [ ] Graceful fallback if pre-populated image URL fails to load
- [ ] Handle missing `photo_mode` (default to 'upload')
- [ ] Handle missing `pre_populated_image_url` (show placeholder)
- [ ] Prevent photo upload attempts in pre-populated mode
- [ ] Progress syncs correctly when switching between modes

## Rollout Strategy

### Soft Launch
1. Deploy with feature flag `ENABLE_PRE_POPULATED_MODE=false`
2. Test internally with demo org
3. Enable for demo org only
4. Monitor for 1 week

### Full Launch
1. Enable feature flag globally
2. Document in multi-org setup guide
3. Announce to stakeholders
4. Provide admin training

### Rollback Plan
- Feature flag can disable instantly
- Database changes are backward compatible (columns allow NULL)
- Frontend gracefully handles missing photo_mode (defaults to 'upload')

## Success Metrics
- ✅ Demo hunt accessible with pre-populated images
- ✅ 100% of pre-populated images load successfully
- ✅ 0 errors related to photo upload in pre-populated mode
- ✅ Upload mode unaffected (0 regressions)
- ✅ Demo used in 3+ sales presentations

## Future Enhancements
- [ ] Admin UI to upload and configure pre-populated images
- [ ] Support mixed mode (some stops upload, some pre-populated)
- [ ] Batch image upload tool
- [ ] Image moderation workflow
- [ ] A/B testing upload vs pre-populated modes

## Related Documentation
- [Epic: Demo Scavenger Hunt](./epic.md)
- [Hunt Stops Schema](../../scripts/sql/supabase-hunt-system.sql)
- [StopCard Component](../../src/features/app/StopCard.tsx)
- [Photo Upload Service](../../src/hooks/usePhotoUpload.ts)
