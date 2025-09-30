# STORY-002: Apply Cloudinary Optimization to HistoryView

## Story
**As a** user viewing my scavenger hunt history
**I want** photos to load quickly with minimal data usage
**So that** I can review my completed stops efficiently on mobile devices

## Acceptance Criteria
- [ ] Import `optimizeCloudinaryUrl` utility in HistoryView component
- [ ] Apply optimization to expanded card photo display (line ~228-232)
- [ ] Use `card` context for history photos (optimal balance of size and quality)
- [ ] Add `loading="lazy"` attribute for native lazy loading
- [ ] Verify no layout shift when images load
- [ ] Test on mobile device or throttled connection
- [ ] Measure performance improvements (before/after file sizes)

## Current State

### File: `src/features/views/HistoryView.tsx` (lines 226-233)
```tsx
{entry.photo && (
  <div className="relative">
    <img
      src={entry.photo}
      alt={entry.title}
      className="w-full rounded-lg object-cover"
    />
  </div>
)}
```

### Issues
- Displays full-size images (2-4 MB each)
- No optimization applied to URLs
- Slow loading on mobile/4G connections
- High bandwidth usage
- No lazy loading implemented

## Technical Implementation

### Updated Code
```tsx
import { optimizeCloudinaryUrl } from '../../utils/cloudinaryOptimizer'

// In component render (lines 226-233):
{entry.photo && (
  <div className="relative">
    <img
      src={optimizeCloudinaryUrl(entry.photo, 'card')}
      alt={entry.title}
      className="w-full rounded-lg object-cover"
      loading="lazy"
    />
  </div>
)}
```

### Optimization Applied
- **Context**: `card` → `w_800,h_600,c_limit,q_auto:good,f_auto`
- **Format**: Automatic (WebP/AVIF for modern browsers, JPEG fallback)
- **Quality**: `auto:good` (excellent quality, optimized compression)
- **Size reduction**: ~70-75% (2-4 MB → 300-600 KB per image)
- **Lazy loading**: Native browser lazy loading for off-screen images

## Performance Impact

### Before Optimization
- Average image size: 2.5 MB
- 10 photos in history: 25 MB total
- Load time on 4G: ~20-25 seconds
- Data usage: High (concern for mobile users)

### After Optimization
- Average image size: ~400 KB (84% reduction)
- 10 photos in history: ~4 MB total (84% reduction)
- Load time on 4G: ~3-4 seconds (6x faster)
- Data usage: Low (mobile-friendly)

## Implementation Tasks

### Task 1: Import Utility and Apply to HistoryView
**Prompt:**
```
Update src/features/views/HistoryView.tsx to use Cloudinary URL optimization:

1. Add import at the top of the file:
   import { optimizeCloudinaryUrl } from '../../utils/cloudinaryOptimizer'

2. Find the image display code around line 228-232 in the expanded card section:
   {entry.photo && (
     <div className="relative">
       <img
         src={entry.photo}
         alt={entry.title}
         className="w-full rounded-lg object-cover"
       />
     </div>
   )}

3. Update the img src to use optimization:
   src={optimizeCloudinaryUrl(entry.photo, 'card')}

4. Add lazy loading attribute:
   loading="lazy"

5. Verify that the rest of the component logic remains unchanged
6. Ensure TypeScript has no errors
7. Test that images still display correctly

The final img tag should look like:
<img
  src={optimizeCloudinaryUrl(entry.photo, 'card')}
  alt={entry.title}
  className="w-full rounded-lg object-cover"
  loading="lazy"
/>
```

### Task 2: Test Performance Improvements
**Prompt:**
```
Test the performance improvements in HistoryView after applying Cloudinary optimization:

1. Open the browser DevTools Network tab
2. Filter by "Img" to show only images
3. Clear the network log
4. Navigate to the History view with completed stops
5. Expand cards to view photos
6. Record the following metrics:
   - Individual image file sizes (before: ~2-4 MB, after: ~300-600 KB expected)
   - Total data transferred for all images
   - Time to load all visible images
   - Image formats delivered (should see WebP or AVIF in modern browsers)

Document findings in a comment or test results file.
Compare with baseline measurements if available.
```

## Testing Checklist
- [ ] HistoryView loads without errors
- [ ] Photos display correctly in expanded cards
- [ ] Image quality is excellent (no visible degradation)
- [ ] Lazy loading works (images load as you scroll)
- [ ] Network tab shows smaller file sizes (300-600 KB range)
- [ ] Modern browsers receive WebP or AVIF format
- [ ] Older browsers receive optimized JPEG
- [ ] Mobile testing confirms faster load times
- [ ] No layout shift when images load

## Browser Testing
Test in multiple browsers to verify format delivery:
- [ ] **Chrome**: Should receive AVIF or WebP
- [ ] **Safari**: Should receive WebP or HEIC
- [ ] **Firefox**: Should receive WebP
- [ ] **Edge**: Should receive AVIF or WebP
- [ ] **Mobile Safari**: Should receive appropriate format
- [ ] **Mobile Chrome**: Should receive AVIF or WebP

## Performance Benchmarks
Document actual performance improvements:

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Avg image size | ~2.5 MB | ~400 KB | 84% reduction |
| 10 images total | ~25 MB | ~4 MB | 84% reduction |
| Load time (4G) | ~20s | ~3-4s | 6x faster |
| Format delivered | JPEG | WebP/AVIF | Modern formats |

## Definition of Done
- [ ] Code changes implemented and committed
- [ ] All existing tests pass
- [ ] Manual testing completed on multiple browsers
- [ ] Performance improvements measured and documented
- [ ] Visual quality verified (no degradation)
- [ ] Mobile testing completed
- [ ] No console errors or warnings
- [ ] Code reviewed and approved

## Dependencies
- **Requires**: STORY-001 (utility function must be implemented first)
- **Blocks**: None

## Estimated Effort
**1-2 hours**

## Notes
- This is the highest-impact story in the epic (History view is frequently used)
- Focus on validation - measure actual file size reduction
- Pay attention to visual quality - ensure `q_auto:good` maintains excellence
- The `card` context (800x600) is sized for typical mobile screens
- Lazy loading prevents loading off-screen images unnecessarily
- No backend changes required - transformations happen via URL modification
- Cloudinary CDN caches transformed images after first request

## Rollback Plan
If issues arise:
1. Remove the `optimizeCloudinaryUrl()` wrapper, restore `src={entry.photo}`
2. Keep the `loading="lazy"` attribute (independent improvement)
3. Investigate issues before re-applying optimization
