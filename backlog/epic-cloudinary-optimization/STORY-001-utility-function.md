# STORY-001: Create Cloudinary URL Optimization Utility

## Story
**As a** developer
**I want** a reusable utility function that transforms Cloudinary URLs with optimization parameters
**So that** images can be delivered with optimal size and format across the application

## Acceptance Criteria
- [ ] Utility file `src/utils/cloudinaryOptimizer.ts` created
- [ ] Function `optimizeCloudinaryUrl(url, context)` implemented
- [ ] Support for contexts: `thumbnail`, `card`, `full`, `collage`
- [ ] Handles null/undefined/empty URLs gracefully
- [ ] Only transforms Cloudinary URLs (leaves other URLs unchanged)
- [ ] TypeScript types defined in `src/types/cloudinary.ts`
- [ ] Unit tests with 100% coverage
- [ ] JSDoc documentation for all exported functions and types

## Technical Details

### File: `src/utils/cloudinaryOptimizer.ts`

#### Transformation Configurations
```typescript
const TRANSFORM_CONFIGS: Record<CloudinaryContext, TransformConfig> = {
  thumbnail: {
    width: 400,
    height: 400,
    quality: 'auto:eco',
    crop: 'limit'
  },
  card: {
    width: 800,
    height: 600,
    quality: 'auto:good',
    crop: 'limit'
  },
  full: {
    width: 1200,
    quality: 'auto:good',
    crop: 'limit'
  },
  collage: {
    width: 1600,
    height: 1200,
    quality: 'auto:good',
    crop: 'limit'
  }
}
```

#### URL Transformation Pattern
```
Input:  https://res.cloudinary.com/{cloud}/image/upload/v12345/{path}/{file}.jpg
Output: https://res.cloudinary.com/{cloud}/image/upload/w_800,h_600,c_limit,q_auto:good,f_auto/v12345/{path}/{file}.jpg
```

### File: `src/types/cloudinary.ts`

#### Type Definitions
```typescript
export type CloudinaryContext = 'thumbnail' | 'card' | 'full' | 'collage'

export type CloudinaryQuality = 'auto:best' | 'auto:good' | 'auto:eco' | 'auto:low'

export interface TransformConfig {
  width: number
  height?: number
  quality: CloudinaryQuality
  crop?: 'limit' | 'fill' | 'fit' | 'scale'
}

export interface OptimizationOptions {
  context?: CloudinaryContext
  width?: number
  height?: number
  quality?: CloudinaryQuality
  progressive?: boolean
}
```

### File: `src/utils/cloudinaryOptimizer.test.ts`

#### Test Coverage
- ✅ Transforms valid Cloudinary URLs correctly
- ✅ Handles null/undefined URLs
- ✅ Leaves non-Cloudinary URLs unchanged
- ✅ Applies correct parameters for each context
- ✅ Handles URLs with existing transformations
- ✅ Handles URLs with version numbers
- ✅ Handles URLs with different path structures

## Implementation Tasks

### Task 1: Create Type Definitions
**Prompt:**
```
Create a new file src/types/cloudinary.ts with TypeScript type definitions for Cloudinary optimization:

1. Export type CloudinaryContext = 'thumbnail' | 'card' | 'full' | 'collage'
2. Export type CloudinaryQuality = 'auto:best' | 'auto:good' | 'auto:eco' | 'auto:low'
3. Export interface TransformConfig with fields:
   - width: number
   - height?: number (optional)
   - quality: CloudinaryQuality
   - crop?: 'limit' | 'fill' | 'fit' | 'scale' (optional)
4. Export interface OptimizationOptions with fields:
   - context?: CloudinaryContext (optional)
   - width?: number (optional)
   - height?: number (optional)
   - quality?: CloudinaryQuality (optional)
   - progressive?: boolean (optional)

Add comprehensive JSDoc comments explaining each type and its usage.
```

### Task 2: Create Utility Function
**Prompt:**
```
Create a new file src/utils/cloudinaryOptimizer.ts that implements Cloudinary URL optimization:

1. Import types from src/types/cloudinary.ts
2. Define TRANSFORM_CONFIGS constant with configurations for each context:
   - thumbnail: w=400, h=400, q=auto:eco, c=limit
   - card: w=800, h=600, q=auto:good, c=limit
   - full: w=1200, q=auto:good, c=limit
   - collage: w=1600, h=1200, q=auto:good, c=limit

3. Implement function optimizeCloudinaryUrl(url: string | null | undefined, context: CloudinaryContext = 'card'): string
   - Return empty string if url is null/undefined/empty
   - Return original URL if it doesn't contain 'res.cloudinary.com'
   - Get config for the specified context
   - Build transformation parameters string: w_{width},h_{height},c_{crop},q_{quality},f_auto
   - Insert parameters by replacing '/upload/' with '/upload/{params}/'
   - Return the transformed URL

4. Add comprehensive JSDoc documentation with:
   - Function description
   - Parameter descriptions
   - Return value description
   - Usage examples
   - Performance notes about Cloudinary CDN caching

Implementation requirements:
- Handle edge cases gracefully (null, undefined, non-Cloudinary URLs)
- Use functional programming style (pure function, no side effects)
- Filter out undefined parameters from the params array
- Ensure proper TypeScript typing throughout
```

### Task 3: Create Unit Tests
**Prompt:**
```
Create a new file src/utils/cloudinaryOptimizer.test.ts with comprehensive unit tests:

Test suite structure:
1. describe('optimizeCloudinaryUrl')
   - test('returns empty string for null/undefined URLs')
   - test('returns empty string for empty string URL')
   - test('returns original URL for non-Cloudinary URLs')
   - test('transforms Cloudinary URL with card context (default)')
   - test('transforms Cloudinary URL with thumbnail context')
   - test('transforms Cloudinary URL with full context')
   - test('transforms Cloudinary URL with collage context')
   - test('handles URLs with version numbers correctly')
   - test('handles URLs with nested folder paths')
   - test('preserves query parameters if present')
   - test('all transformation parameters are properly formatted')

Test data:
- Valid Cloudinary URL: 'https://res.cloudinary.com/dwmjbmdgq/image/upload/v1759047424/scavenger/entries/photo.jpg'
- Non-Cloudinary URL: 'https://example.com/image.jpg'
- URL with nested path: 'https://res.cloudinary.com/cloud/image/upload/v123/folder1/folder2/file.jpg'

Use Jest testing framework with expect assertions.
Aim for 100% code coverage.
```

## Testing Checklist
- [ ] Unit tests pass with 100% coverage
- [ ] TypeScript compilation succeeds with no errors
- [ ] All edge cases handled (null, undefined, empty, non-Cloudinary URLs)
- [ ] Transformation parameters correctly formatted
- [ ] URLs with version numbers handled properly
- [ ] Nested folder paths work correctly

## Documentation
- [ ] JSDoc comments for all exported functions
- [ ] Type definitions documented
- [ ] Usage examples in comments
- [ ] README section in utils folder explaining the optimizer

## Definition of Done
- [ ] Code implemented and passes all tests
- [ ] TypeScript types properly defined
- [ ] Unit tests achieve 100% coverage
- [ ] Code reviewed and approved
- [ ] Documentation complete
- [ ] No TypeScript or ESLint errors
- [ ] Performance validated (function executes in <1ms)

## Dependencies
- None (standalone utility creation)

## Estimated Effort
**2-3 hours**

## Notes
- This is the foundation for all subsequent stories in this epic
- Focus on robustness and edge case handling
- Keep the function pure (no side effects, idempotent)
- Performance is critical - this will be called frequently during rendering
- Consider memoization if performance testing shows it's needed
