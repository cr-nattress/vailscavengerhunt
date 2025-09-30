# STORY-004: Apply Cloudinary Optimization to AlbumViewer Component

## Story
**As a** user viewing photo collages in the album
**I want** collages to load quickly with excellent quality
**So that** I can showcase my scavenger hunt memories efficiently

## Acceptance Criteria
- [ ] Import `optimizeCloudinaryUrl` utility in AlbumViewer component
- [ ] Apply optimization to collage image display (line ~110-115)
- [ ] Use `collage` context for album photos (highest quality, 1600px width)
- [ ] Add lazy loading attribute
- [ ] Verify collages display with excellent quality
- [ ] Measure performance improvements
- [ ] Test expand/collapse functionality still works

## Current State

### File: `src/components/AlbumViewer.tsx` (lines 110-115)
```tsx
<div className='flex justify-center transition-all duration-300 ease-in-out mt-4'>
  <img
    src={imageUrl || undefined}
    alt="Full size collage"
    className='max-w-full h-auto rounded-lg shadow-md'
    style={{ maxHeight: '70vh' }}
  />
</div>
```

### Issues
- Displays full-size collage images without optimization
- Collages can be very large (3-6 MB)
- Slow loading experience
- High bandwidth usage for showcase feature

## Technical Implementation

### Updated Code
```tsx
import { optimizeCloudinaryUrl } from '../utils/cloudinaryOptimizer'

// In component render (lines 110-115):
<div className='flex justify-center transition-all duration-300 ease-in-out mt-4'>
  <img
    src={optimizeCloudinaryUrl(imageUrl, 'collage')}
    alt="Full size collage"
    className='max-w-full h-auto rounded-lg shadow-md'
    style={{ maxHeight: '70vh' }}
    loading="lazy"
  />
</div>
```

### Optimization Applied
- **Context**: `collage` → `w_1600,h_1200,c_limit,q_auto:good,f_auto`
- **Format**: Automatic (WebP/AVIF for modern browsers, JPEG fallback)
- **Quality**: `auto:good` (excellent quality for showcase)
- **Size reduction**: ~50-65% (3-6 MB → 1-2 MB per collage)

## Performance Impact

### Before Optimization
- Average collage size: 4 MB
- Load time on 4G: ~6-8 seconds
- Noticeable delay when expanding album

### After Optimization
- Average collage size: ~1.5 MB (62% reduction)
- Load time on 4G: ~2-3 seconds (3x faster)
- Smoother expand/collapse experience

## Implementation Tasks

### Task 1: Apply Optimization to AlbumViewer
**Prompt:**
```
Update src/components/AlbumViewer.tsx to use Cloudinary URL optimization:

1. Add import at the top of the file:
   import { optimizeCloudinaryUrl } from '../utils/cloudinaryOptimizer'

2. Find the img tag around line 110-115 in the component
3. Update the src attribute from:
   src={imageUrl || undefined}
   to:
   src={optimizeCloudinaryUrl(imageUrl, 'collage')}

4. Add lazy loading attribute:
   loading="lazy"

5. Verify that:
   - The preloader img tag (line ~126-133) is NOT modified (it's hidden and used for loading detection)
   - All other functionality remains unchanged
   - TypeScript compilation succeeds

The final img tag should look like:
<img
  src={optimizeCloudinaryUrl(imageUrl, 'collage')}
  alt="Full size collage"
  className='max-w-full h-auto rounded-lg shadow-md'
  style={{ maxHeight: '70vh' }}
  loading="lazy"
/>
```

### Task 2: Test AlbumViewer Functionality
**Prompt:**
```
Test the AlbumViewer component with Cloudinary optimization:

1. Navigate to a view where AlbumViewer is displayed (if collages are enabled)
2. Test expand/collapse functionality:
   - Click to expand album
   - Verify collage loads and displays
   - Check image quality (should be excellent)
   - Click to collapse
   - Verify smooth animation

3. Check Network tab:
   - Collage file size should be ~1-2 MB (down from 3-6 MB)
   - Modern browsers should receive WebP or AVIF format
   - Verify transformation parameters in URL

4. Test on mobile device or throttled connection:
   - Collages load in reasonable time
   - Quality remains excellent on mobile screens
   - No layout issues

5. Test edge cases:
   - No collage available (component should not render)
   - Invalid collage URL (should handle gracefully)
   - Expand/collapse rapidly (no visual glitches)

Document findings and any issues.
```

### Task 3: Validate Preloader Behavior
**Prompt:**
```
Verify that the hidden preloader image (lines ~126-133) is working correctly:

1. The hidden preloader should remain UNMODIFIED (do not apply optimization to it)
2. Why: The preloader detects when the image is loaded via onLoad callback
3. If optimized, it would load a different URL than the visible image
4. Test that the loading state works correctly:
   - Image loads
   - imageLoaded state becomes true
   - Visible image appears smoothly

The preloader code should remain:
<img
  src={imageUrl}  // NOT optimized
  alt="Preloading collage"
  className='hidden'
  onLoad={() => setImageLoaded(true)}
  onError={() => setImageLoaded(true)}
/>

Confirm this is correct and document why we don't optimize the preloader.
```

## Testing Checklist
- [ ] AlbumViewer renders without errors
- [ ] Collage displays with excellent quality
- [ ] Expand/collapse functionality works smoothly
- [ ] Network tab shows reduced file sizes (1-2 MB range)
- [ ] Modern browsers receive WebP or AVIF format
- [ ] Lazy loading works correctly
- [ ] Preloader still detects image load properly
- [ ] No layout shift when image loads
- [ ] Mobile testing completed
- [ ] Performance improvement measured

## Visual Quality Validation
Since collages are showcase features, quality is critical:
- [ ] **Sharpness**: Text/details remain crisp
- [ ] **Colors**: No visible color degradation
- [ ] **Compression artifacts**: No visible JPEG artifacts or banding
- [ ] **Comparison**: Side-by-side with original shows minimal difference
- [ ] **Mobile display**: Quality excellent on high-DPI mobile screens

## Performance Benchmarks

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Avg collage size | ~4 MB | ~1.5 MB | 62% reduction |
| Load time (4G) | ~6-8s | ~2-3s | 3x faster |
| Format delivered | JPEG | WebP/AVIF | Modern |
| Visual quality | Excellent | Excellent | Maintained |

## Definition of Done
- [ ] Code changes implemented and committed
- [ ] All existing tests pass
- [ ] Expand/collapse functionality tested
- [ ] Performance improvements measured and documented
- [ ] Visual quality verified (no degradation)
- [ ] Mobile testing completed
- [ ] No console errors or warnings
- [ ] Code reviewed and approved
- [ ] Preloader functionality validated

## Dependencies
- **Requires**: STORY-001 (utility function must be implemented first)
- **Independent of**: Other view optimization stories

## Estimated Effort
**1 hour**

## Notes
- **Context Choice**: Using `collage` context (1600x1200) because:
  - Collages are meant to be high-quality showcase images
  - Users expect excellent visual quality in album view
  - Still achieves 50-65% file size reduction
  - maxHeight: 70vh constraint limits actual display size

- **Preloader Consideration**: The hidden preloader image should NOT be optimized:
  - It's used purely for load detection via onLoad callback
  - Doesn't impact visual display (it's hidden)
  - Optimizing it would create inconsistency with visible image
  - Keep it loading the same URL as the visible image for consistency

- **Lazy Loading**: Since collages are often below the fold (in collapsed state):
  - Lazy loading is beneficial
  - Won't load until user expands the album
  - Saves bandwidth for users who don't view album

- **maxHeight Constraint**: The `maxHeight: '70vh'` style limits display size:
  - Even with 1600px width transformation, display is constrained
  - Ensures collages don't overwhelm the viewport
  - Provides consistent user experience across devices

## Rollback Plan
If issues arise:
1. Remove `optimizeCloudinaryUrl()` wrapper
2. Restore `src={imageUrl || undefined}`
3. Keep lazy loading attribute
4. Investigate issues before re-applying

## Future Enhancements (Out of Scope)
- Progressive loading with blur placeholder
- Responsive collage sizes based on viewport
- Touch gestures for zoom/pan on mobile
- Download original full-resolution option
