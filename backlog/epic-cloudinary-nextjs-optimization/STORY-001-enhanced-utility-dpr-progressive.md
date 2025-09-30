# STORY-001: Enhanced Cloudinary Utility with DPR and Progressive Loading

## Story
**As a** developer optimizing images
**I want** enhanced Cloudinary transformation utilities with DPR and progressive loading support
**So that** images render sharply on Retina displays and load progressively for better UX

## Acceptance Criteria
- [ ] Extend existing `optimizeCloudinaryUrl()` with DPR support
- [ ] Add `dpr_auto` parameter to all transformations
- [ ] Add optional `fl_progressive` flag for large images
- [ ] Create new transformation options interface
- [ ] Add TypeScript types for DPR and progressive options
- [ ] Update unit tests to cover new parameters
- [ ] Document DPR and progressive loading in JSDoc
- [ ] Maintain backward compatibility with existing code

## Context
The existing `optimizeCloudinaryUrl()` utility (from epic-cloudinary-optimization) provides basic optimization but lacks:
- Device pixel ratio optimization for Retina displays
- Progressive loading for better perceived performance
- Flexible transformation options

This story enhances the utility to support these advanced features.

## Technical Details

### Current State
```typescript
// Current utility from epic-cloudinary-optimization
optimizeCloudinaryUrl(url: string, context: CloudinaryContext): string {
  // Returns: w_800,h_600,c_limit,q_auto:good,f_auto
}
```

### Enhanced State
```typescript
// Enhanced utility with additional options
optimizeCloudinaryUrl(
  url: string,
  context: CloudinaryContext,
  options?: OptimizationOptions
): string {
  // Returns: w_800,h_600,c_limit,q_auto:good,f_auto,dpr_auto,fl_progressive
}
```

## Implementation Tasks

### Task 1: Update Type Definitions
**Prompt:**
```
Update src/types/cloudinary.ts to add enhanced optimization options:

1. Add new interface OptimizationOptions:
   interface OptimizationOptions {
     enableDPR?: boolean          // Default: true
     enableProgressive?: boolean  // Default: false
     customQuality?: CloudinaryQuality  // Override context quality
     customWidth?: number         // Override context width
     customHeight?: number        // Override context height
   }

2. Update existing CloudinaryQuality type to include numeric options:
   export type CloudinaryQuality =
     | 'auto:best'
     | 'auto:good'
     | 'auto:eco'
     | 'auto:low'
     | number  // For explicit quality (1-100)

3. Add DPR type:
   export type CloudinaryDPR = 'auto' | 1.0 | 1.5 | 2.0 | 3.0

4. Add comprehensive JSDoc documentation for each type explaining:
   - When to use each option
   - Performance implications
   - Visual quality trade-offs
   - Browser compatibility notes

5. Export all new types and ensure backward compatibility
```

### Task 2: Enhance optimizeCloudinaryUrl Function
**Prompt:**
```
Update src/utils/cloudinaryOptimizer.ts to add DPR and progressive loading support:

1. Update function signature:
   export function optimizeCloudinaryUrl(
     url: string | null | undefined,
     context: CloudinaryContext = 'card',
     options: OptimizationOptions = {}
   ): string

2. Add default options:
   const defaultOptions: Required<OptimizationOptions> = {
     enableDPR: true,
     enableProgressive: false,
     customQuality: undefined,
     customWidth: undefined,
     customHeight: undefined,
     ...options
   }

3. Update parameter building logic:
   - Get base config from TRANSFORM_CONFIGS[context]
   - Override with customWidth/customHeight if provided
   - Override with customQuality if provided
   - Add 'dpr_auto' if enableDPR is true
   - Add 'fl_progressive' if enableProgressive is true and width > 1000

4. Build params array with proper filtering:
   const params = [
     customWidth ? `w_${customWidth}` : `w_${config.width}`,
     config.height || customHeight ? `h_${customHeight || config.height}` : null,
     `c_${config.crop}`,
     `q_${customQuality || config.quality}`,
     'f_auto',
     enableDPR ? 'dpr_auto' : null,
     enableProgressive && width > 1000 ? 'fl_progressive' : null
   ].filter(Boolean).join(',')

5. Return transformed URL as before

6. Add comprehensive JSDoc with examples:
   /**
    * Optimizes Cloudinary image URLs with DPR and progressive loading support.
    *
    * @example Basic usage
    * optimizeCloudinaryUrl(url, 'card')
    * // Returns: .../w_800,h_600,c_limit,q_auto:good,f_auto,dpr_auto/...
    *
    * @example With progressive loading for hero image
    * optimizeCloudinaryUrl(url, 'hero', { enableProgressive: true })
    * // Returns: .../w_1600,h_1200,c_limit,q_auto:good,f_auto,dpr_auto,fl_progressive/...
    *
    * @example Custom quality override
    * optimizeCloudinaryUrl(url, 'card', { customQuality: 'auto:eco' })
    * // Returns: .../w_800,h_600,c_limit,q_auto:eco,f_auto,dpr_auto/...
    *
    * @example Disable DPR for specific use case
    * optimizeCloudinaryUrl(url, 'thumbnail', { enableDPR: false })
    * // Returns: .../w_400,h_400,c_limit,q_auto:eco,f_auto/...
    */

7. Maintain backward compatibility - existing calls without options should work identically
```

### Task 3: Create Helper Functions for Common Patterns
**Prompt:**
```
Add convenience helper functions to src/utils/cloudinaryOptimizer.ts:

1. Create optimizeForRetina() helper:
   export function optimizeForRetina(
     url: string | null | undefined,
     context: CloudinaryContext = 'card'
   ): string {
     return optimizeCloudinaryUrl(url, context, { enableDPR: true })
   }

2. Create optimizeProgressive() helper:
   export function optimizeProgressive(
     url: string | null | undefined,
     context: CloudinaryContext = 'hero'
   ): string {
     return optimizeCloudinaryUrl(url, context, {
       enableDPR: true,
       enableProgressive: true
     })
   }

3. Create optimizeWithCustomSize() helper:
   export function optimizeWithCustomSize(
     url: string | null | undefined,
     width: number,
     height?: number,
     quality: CloudinaryQuality = 'auto:good'
   ): string {
     return optimizeCloudinaryUrl(url, 'card', {
       customWidth: width,
       customHeight: height,
       customQuality: quality,
       enableDPR: true
     })
   }

4. Add JSDoc documentation for each helper explaining:
   - Use case
   - Parameters
   - Example output
   - When to use vs. base function
```

### Task 4: Update Unit Tests
**Prompt:**
```
Update src/utils/cloudinaryOptimizer.test.ts to test new features:

1. Add test suite for DPR support:
   describe('DPR optimization', () => {
     test('adds dpr_auto by default')
     test('excludes dpr_auto when enableDPR is false')
     test('dpr_auto parameter is in correct position')
   })

2. Add test suite for progressive loading:
   describe('Progressive loading', () => {
     test('adds fl_progressive for large images when enabled')
     test('excludes fl_progressive by default')
     test('excludes fl_progressive for small images even when enabled')
     test('fl_progressive parameter is in correct position')
   })

3. Add test suite for custom options:
   describe('Custom optimization options', () => {
     test('customWidth overrides context width')
     test('customHeight overrides context height')
     test('customQuality overrides context quality')
     test('multiple custom options work together')
   })

4. Add test suite for helper functions:
   describe('Helper functions', () => {
     test('optimizeForRetina includes dpr_auto')
     test('optimizeProgressive includes both dpr_auto and fl_progressive')
     test('optimizeWithCustomSize uses provided dimensions')
   })

5. Add test suite for backward compatibility:
   describe('Backward compatibility', () => {
     test('calls without options parameter work as before')
     test('existing code using two parameters still works')
     test('output matches previous version for default calls')
   })

6. Update existing tests to account for new dpr_auto parameter in default output

7. Ensure 100% code coverage for all new code paths
```

### Task 5: Update Documentation
**Prompt:**
```
Update documentation to reflect new DPR and progressive loading features:

1. Update src/utils/README.md (if it exists) or create it:

   # Cloudinary Image Optimization

   ## DPR (Device Pixel Ratio) Optimization

   ### What is DPR?
   - Explanation of Retina/high-DPI displays
   - How dpr_auto works
   - Performance impact (2x/3x file size for 2x/3x displays)

   ### Usage
   - Basic usage with DPR (default)
   - Disabling DPR when needed
   - Testing on Retina displays

   ## Progressive Loading

   ### What is Progressive Loading?
   - Explanation of progressive JPEG/WebP
   - Perceived performance benefits
   - When to use (large hero images)
   - When NOT to use (small thumbnails)

   ### Usage
   - Enabling progressive loading
   - Best practices
   - Browser support

   ## Advanced Usage

   ### Custom Options
   - All available options
   - Examples of each option
   - Combining options

   ### Helper Functions
   - optimizeForRetina()
   - optimizeProgressive()
   - optimizeWithCustomSize()

   ## Performance Guidelines

   ### DPR Considerations
   - Bandwidth trade-off (2x data for 2x DPR)
   - When to disable (low-bandwidth scenarios)
   - Testing recommendations

   ### Progressive Loading Considerations
   - Only for images > 1000px wide
   - Minimal overhead for large images
   - Better perceived performance

2. Add inline code examples for common patterns

3. Include performance comparison table:
   | Image Type | DPR | Progressive | File Size | Load Time |
   |------------|-----|-------------|-----------|-----------|
   | Thumbnail  | Yes | No          | ~150 KB   | ~0.5s     |
   | Card       | Yes | No          | ~400 KB   | ~1s       |
   | Hero       | Yes | Yes         | ~1.5 MB   | ~3s       |
   | Hero (2x)  | Yes | Yes         | ~3 MB     | ~6s       |
```

## Testing Checklist

### Unit Tests
- [ ] All new functions have unit tests
- [ ] DPR parameter tested in all contexts
- [ ] Progressive loading logic tested
- [ ] Custom options tested individually and combined
- [ ] Helper functions tested
- [ ] Backward compatibility verified
- [ ] 100% code coverage achieved

### Integration Tests
- [ ] DPR works on Retina displays (2x, 3x)
- [ ] Progressive images load progressively in browser
- [ ] Custom dimensions work correctly
- [ ] Quality overrides work as expected
- [ ] All helper functions produce correct URLs

### Browser Testing
- [ ] Test on Retina MacBook Pro (2x DPR)
- [ ] Test on standard display (1x DPR)
- [ ] Test on mobile devices (various DPR)
- [ ] Verify Cloudinary serves appropriate image sizes
- [ ] Check Network tab for correct DPR multiplier

### Visual Testing
- [ ] Images sharp on Retina displays
- [ ] Progressive images appear gradually
- [ ] No quality degradation visible
- [ ] Proper sizing for all contexts

## Performance Impact

### DPR Optimization
- **Retina displays (2x)**: Serves 2x resolution images (2x file size, but sharp display)
- **Standard displays (1x)**: Serves 1x resolution images (no extra bandwidth)
- **Automatic detection**: Cloudinary detects device DPR automatically

### Progressive Loading
- **Perceived performance**: Images appear faster (low-res first, then full)
- **Actual performance**: Minimal overhead (~1-2% file size increase)
- **Best for**: Large hero images (> 1000px wide)
- **Not for**: Thumbnails (unnecessary overhead)

## Expected Results

### Before Enhancement
```
URL: .../w_800,h_600,c_limit,q_auto:good,f_auto/photo.jpg
Retina: Blurry on 2x displays
Size on Retina: 400 KB (inadequate resolution)
Progressive: No
```

### After Enhancement
```
URL: .../w_800,h_600,c_limit,q_auto:good,f_auto,dpr_auto/photo.jpg
Retina: Sharp on 2x displays (Cloudinary serves 1600x1200)
Size on Retina: 800 KB (2x resolution)
Size on standard: 400 KB (1x resolution)
Progressive: Optional (fl_progressive for hero images)
```

## Definition of Done
- [ ] Type definitions updated with new options
- [ ] optimizeCloudinaryUrl() enhanced with DPR and progressive support
- [ ] Helper functions created and documented
- [ ] All unit tests passing with 100% coverage
- [ ] Integration testing completed
- [ ] Browser testing on Retina displays verified
- [ ] Documentation updated with usage guidelines
- [ ] Backward compatibility verified
- [ ] Code reviewed and approved
- [ ] No TypeScript or ESLint errors

## Dependencies
- **Requires**: epic-cloudinary-optimization STORY-001 (base utility must exist)
- **Blocks**: None (this is foundational for other stories but doesn't block them)

## Estimated Effort
**1.5-2 days** (12-16 hours)
- Type definitions: 2 hours
- Function enhancement: 4 hours
- Helper functions: 2 hours
- Unit tests: 3 hours
- Documentation: 2 hours
- Testing & validation: 3 hours

## Notes
- **DPR is enabled by default** - this is intentional for best quality
- **Progressive loading is optional** - only enable for large images
- **Backward compatibility is critical** - existing code must work unchanged
- **Performance monitoring** will be added in STORY-002
- **Cloudinary handles DPR automatically** - we just add the parameter, CDN does the work
- **Test on real Retina devices** - simulators may not accurately show DPR behavior

## References
- [Cloudinary DPR Documentation](https://cloudinary.com/documentation/responsive_images#device_pixel_ratio_dpr_support)
- [Progressive JPEG Guide](https://cloudinary.com/blog/progressive_jpegs_and_green_martians)
- [Web.dev Responsive Images](https://web.dev/serve-responsive-images/)

## Rollback Plan
If issues arise:
1. Revert to previous version of `optimizeCloudinaryUrl()`
2. Remove new helper functions
3. Keep type definitions (non-breaking)
4. Document issues for future attempt
5. Existing code continues working with base optimization

## Future Enhancements (Out of Scope)
- AI-powered gravity (`g_auto`) for smart cropping
- Automatic art direction based on viewport
- Client hints for automatic DPR detection
- Lazy loading integration
- Placeholder generation (blur-up effect)
