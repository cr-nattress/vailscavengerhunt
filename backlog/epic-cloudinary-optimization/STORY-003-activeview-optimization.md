# STORY-003: Apply Cloudinary Optimization to ActiveView

## Story
**As a** user actively participating in a scavenger hunt
**I want** newly uploaded photos to display quickly with optimal quality
**So that** I can immediately see my progress without waiting for large images to load

## Acceptance Criteria
- [ ] Import `optimizeCloudinaryUrl` utility in ActiveView component
- [ ] Apply optimization to photo displays in active hunt view
- [ ] Use `full` context for primary photo displays (higher quality for immediate feedback)
- [ ] Add lazy loading where appropriate
- [ ] Verify photo uploads still work correctly
- [ ] Test that newly uploaded photos display with optimization applied
- [ ] Measure performance improvements

## Current State

### File: `src/features/views/ActiveView.tsx`
Currently displays photos from the `activeData` response, which includes:
- Stop cards with completion status
- Progress indicators with photos
- Photo URLs from `photo` field in progress data

### Issues
- Full-size images displayed without optimization
- New uploads return large image URLs
- Slower feedback loop after photo upload
- High bandwidth usage during active hunts

## Technical Implementation

### Changes Required
1. **Import utility** at top of file
2. **Apply optimization** to any `<img>` tags displaying photos
3. **Use `full` context** for active view (balance between quality and size)
4. **Preserve existing functionality** (photo upload flow must continue working)

### Code Pattern
```tsx
import { optimizeCloudinaryUrl } from '../../utils/cloudinaryOptimizer'

// When rendering photos:
<img
  src={optimizeCloudinaryUrl(photoUrl, 'full')}
  alt="Stop photo"
  loading="lazy"
/>
```

### Optimization Applied
- **Context**: `full` → `w_1200,c_limit,q_auto:good,f_auto`
- **Format**: Automatic (WebP/AVIF for modern browsers)
- **Quality**: `auto:good` (excellent quality for user feedback)
- **Size reduction**: ~60-70% (2-4 MB → 600-900 KB per image)

## Performance Impact

### Before Optimization
- Average uploaded photo: 2.5 MB
- Display time: 3-5 seconds to load
- Feedback delay after upload

### After Optimization
- Average photo after optimization: ~700 KB (72% reduction)
- Display time: ~1 second to load
- Faster user feedback loop

## Implementation Tasks

### Task 1: Identify All Image Displays in ActiveView
**Prompt:**
```
Analyze src/features/views/ActiveView.tsx and identify all locations where photos are displayed:

1. Search for <img> tags in the component
2. Look for photo URLs being rendered (check for variables like:
   - photo, photoUrl, progress.photo, stop.photo, etc.)
3. Identify which photos should be optimized
4. Note line numbers for each location

Create a list of all image display locations with:
- Line number
- Context (what type of photo: stop photo, progress photo, etc.)
- Current code snippet
- Recommended optimization context (full, card, or thumbnail)

DO NOT make changes yet - just analyze and document.
```

### Task 2: Apply Optimization to ActiveView
**Prompt:**
```
Update src/features/views/ActiveView.tsx to use Cloudinary URL optimization:

1. Add import at the top of the file:
   import { optimizeCloudinaryUrl } from '../../utils/cloudinaryOptimizer'

2. For each image display location identified in Task 1:
   - Wrap the photo URL with optimizeCloudinaryUrl(url, 'full')
   - Add loading="lazy" if the image is not immediately visible
   - Preserve all existing attributes and functionality

3. Ensure the photo upload flow still works:
   - handlePhotoUpload function should remain unchanged
   - Photo preview after upload should display correctly
   - Progress updates should still trigger re-fetching

4. Verify TypeScript compilation succeeds
5. Test that all images display correctly

Example transformation:
Before: src={progress.photo}
After:  src={optimizeCloudinaryUrl(progress.photo, 'full')}
```

### Task 3: Test Photo Upload and Display Flow
**Prompt:**
```
Test the complete photo upload and display flow in ActiveView:

1. Start a scavenger hunt
2. Navigate to an incomplete stop
3. Upload a photo using the photo upload feature
4. Verify:
   - Photo upload succeeds
   - Progress updates correctly
   - Uploaded photo displays with optimization (check Network tab)
   - Image quality is excellent
   - File size is reduced (should see ~700 KB instead of ~2.5 MB)
   - Modern browsers receive WebP/AVIF format

5. Test on mobile device or with throttled connection:
   - Photos load quickly
   - No significant delay in feedback
   - Visual quality remains high

Document any issues or unexpected behavior.
```

## Testing Checklist
- [ ] ActiveView loads without errors
- [ ] All photos display correctly
- [ ] Photo upload flow works end-to-end
- [ ] Newly uploaded photos appear with optimization
- [ ] Image quality is excellent
- [ ] Network tab shows reduced file sizes
- [ ] Modern browsers receive WebP/AVIF
- [ ] No layout shift when images load
- [ ] Progress updates trigger correctly
- [ ] Mobile testing completed

## Specific Test Cases
1. **Upload new photo**:
   - [ ] Photo uploads successfully
   - [ ] Progress updates to "done"
   - [ ] Photo displays with optimization applied

2. **View existing photos**:
   - [ ] Previously uploaded photos display correctly
   - [ ] Optimization applied to historical photos

3. **Navigate between stops**:
   - [ ] Photos load quickly when switching stops
   - [ ] Lazy loading works for off-screen images

4. **Network conditions**:
   - [ ] Fast connection: Photos load instantly
   - [ ] Slow 3G: Photos load progressively
   - [ ] Offline: Appropriate error handling

## Performance Benchmarks

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Uploaded photo size | ~2.5 MB | ~700 KB | 72% reduction |
| Photo display time (4G) | ~3-5s | ~1s | 3-5x faster |
| Feedback delay | Noticeable | Minimal | Better UX |
| Format delivered | JPEG | WebP/AVIF | Modern |

## Edge Cases to Test
- [ ] Photo is null/undefined (should handle gracefully)
- [ ] Photo URL is not from Cloudinary (should pass through unchanged)
- [ ] Very small images (should not be upscaled due to `c_limit`)
- [ ] Photos with unusual aspect ratios
- [ ] Multiple photos loaded simultaneously

## Definition of Done
- [ ] Code changes implemented and committed
- [ ] All existing tests pass
- [ ] Photo upload flow tested end-to-end
- [ ] Performance improvements measured and documented
- [ ] Visual quality verified (no degradation)
- [ ] Mobile testing completed
- [ ] No console errors or warnings
- [ ] Code reviewed and approved

## Dependencies
- **Requires**: STORY-001 (utility function must be implemented first)
- **Related**: Works alongside existing photo upload functionality

## Estimated Effort
**1-2 hours**

## Notes
- **Context Choice**: Using `full` context (1200px) instead of `card` because:
  - ActiveView is where users see immediate feedback after upload
  - Higher quality is important for user satisfaction
  - Still achieves 60-70% file size reduction
  - Better perceived value ("my photo looks great!")

- **Photo Upload Flow**: The optimization is purely on the display side:
  - Upload still sends full-resolution image to Cloudinary
  - Upload transformations remain unchanged (1600x1600, quality: auto:good)
  - Only the display URLs are optimized for delivery
  - Original high-res version remains in Cloudinary for future use

- **Lazy Loading**: Be cautious with lazy loading in ActiveView:
  - Primary photo (just uploaded) should NOT be lazy loaded
  - Photos in scrollable lists can be lazy loaded
  - Balance between performance and immediate feedback

## Rollback Plan
If issues arise:
1. Remove `optimizeCloudinaryUrl()` wrapper from image displays
2. Restore direct use of photo URLs
3. Keep lazy loading attributes (independent improvement)
4. Investigate and fix issues before re-applying
