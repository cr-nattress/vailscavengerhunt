# STORY-004: Custom Cloudinary Loader for Next.js

## Story
**As a** developer using Next.js Image component
**I want** a custom Cloudinary loader that automatically optimizes images
**So that** all images benefit from Cloudinary transformations with minimal configuration

## Acceptance Criteria
- [ ] Create custom Cloudinary loader for Next.js Image component
- [ ] Loader automatically applies optimization parameters
- [ ] Support for width, quality, and src parameters
- [ ] Handle both full URLs and public IDs
- [ ] TypeScript types for loader function
- [ ] Unit tests for loader logic
- [ ] Integration tests with actual Next.js Image component
- [ ] Documentation with usage examples

## Context
Next.js provides a powerful `<Image>` component with automatic optimization, but it needs a custom loader to work with Cloudinary. This story implements a loader that integrates our Cloudinary optimization strategy with Next.js's responsive image capabilities.

## Technical Details

### Next.js Image Loader Pattern
```typescript
// Next.js expects a loader function with this signature:
type ImageLoader = (resolverProps: ImageLoaderProps) => string

interface ImageLoaderProps {
  src: string
  width: number
  quality?: number
}
```

### Our Implementation
```typescript
// Custom Cloudinary loader that uses our optimization utilities
export function cloudinaryLoader({ src, width, quality }: ImageLoaderProps): string {
  // Extract public ID from URL or use src directly
  // Build optimized URL with Cloudinary transformations
  // Return URL ready for Next.js Image component
}
```

## Implementation Tasks

### Task 1: Create Cloudinary Loader Function
**Prompt:**
```
Create a new file lib/cloudinaryLoader.ts with Next.js Image loader implementation:

1. Import necessary types and utilities:
   import type { ImageLoader, ImageLoaderProps } from 'next/image'
   import { optimizeCloudinaryUrl } from '@/utils/cloudinaryOptimizer'

2. Extract environment configuration:
   const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

3. Create helper function to extract public ID from URL:
   function extractPublicId(src: string): string {
     // If src is already a public ID (no http), return as-is
     if (!src.startsWith('http')) {
       return src
     }

     // Extract from full Cloudinary URL
     // Pattern: .../upload/(vXXXX/)?(path/to/image.jpg)
     const match = src.match(/\/upload\/(?:v\d+\/)?(.+)$/)
     return match ? match[1] : src
   }

4. Implement the main loader function:
   export const cloudinaryLoader: ImageLoader = ({ src, width, quality }) => {
     // Validate cloud name
     if (!CLOUDINARY_CLOUD_NAME) {
       console.error('CLOUDINARY_CLOUD_NAME not configured')
       return src // Fallback to original src
     }

     // Extract public ID
     const publicId = extractPublicId(src)

     // Build transformation parameters
     const transformations = [
       `w_${width}`,
       `q_${quality || 'auto:good'}`,
       'f_auto',
       'c_limit',
       'dpr_auto'
     ].join(',')

     // Build and return full Cloudinary URL
     return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${transformations}/${publicId}`
   }

5. Add comprehensive JSDoc:
   /**
    * Custom Cloudinary loader for Next.js Image component.
    *
    * Automatically applies Cloudinary transformations including:
    * - Responsive sizing based on Next.js width prop
    * - Automatic format selection (WebP, AVIF, JPEG)
    * - Quality optimization
    * - Device pixel ratio support
    *
    * @param props - Next.js Image loader props
    * @returns Optimized Cloudinary URL
    *
    * @example
    * // In Next.js component:
    * import Image from 'next/image'
    * import { cloudinaryLoader } from '@/lib/cloudinaryLoader'
    *
    * <Image
    *   loader={cloudinaryLoader}
    *   src="samples/cloudinary-icon.png"
    *   width={800}
    *   height={600}
    *   alt="Cloudinary"
    * />
    *
    * @example
    * // With full URL:
    * <Image
    *   loader={cloudinaryLoader}
    *   src="https://res.cloudinary.com/demo/image/upload/sample.jpg"
    *   width={1200}
    *   height={800}
    *   alt="Sample"
    * />
    */

6. Export the loader and helper functions
```

### Task 2: Create Advanced Loader Variants
**Prompt:**
```
Add specialized loader variants in lib/cloudinaryLoader.ts:

1. Create progressive loader for hero images:
   export const cloudinaryProgressiveLoader: ImageLoader = ({ src, width, quality }) => {
     const publicId = extractPublicId(src)

     const transformations = [
       `w_${width}`,
       `q_${quality || 'auto:good'}`,
       'f_auto',
       'c_limit',
       'dpr_auto',
       width > 1000 ? 'fl_progressive' : null
     ].filter(Boolean).join(',')

     return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${transformations}/${publicId}`
   }

2. Create thumbnail loader with aggressive compression:
   export const cloudinaryThumbnailLoader: ImageLoader = ({ src, width }) => {
     const publicId = extractPublicId(src)

     const transformations = [
       `w_${width}`,
       'q_auto:eco',  // More aggressive for thumbnails
       'f_auto',
       'c_limit',
       'dpr_auto'
     ].join(',')

     return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${transformations}/${publicId}`
   }

3. Create authenticated image loader:
   export function createAuthenticatedLoader(type: 'authenticated' | 'private'): ImageLoader {
     return ({ src, width, quality }) => {
       const publicId = extractPublicId(src)

       // Note: This returns unsigned URL - signing should be done server-side
       const transformations = [
         `w_${width}`,
         `q_${quality || 'auto:good'}`,
         'f_auto',
         'c_limit',
         'dpr_auto'
       ].join(',')

       return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/${type}/${transformations}/${publicId}`
     }
   }

4. Add JSDoc for each variant explaining use cases and differences
```

### Task 3: Create Wrapper Components for Common Patterns
**Prompt:**
```
Create wrapper components in components/CloudinaryImage.tsx:

1. Create base CloudinaryImage component:
   import Image, { ImageProps } from 'next/image'
   import { cloudinaryLoader } from '@/lib/cloudinaryLoader'

   export interface CloudinaryImageProps extends Omit<ImageProps, 'loader'> {
     /** Cloudinary public ID or full URL */
     src: string
   }

   export function CloudinaryImage(props: CloudinaryImageProps) {
     return <Image {...props} loader={cloudinaryLoader} />
   }

2. Create CloudinaryHeroImage for large hero images:
   import { cloudinaryProgressiveLoader } from '@/lib/cloudinaryLoader'

   export function CloudinaryHeroImage(props: CloudinaryImageProps) {
     return (
       <Image
         {...props}
         loader={cloudinaryProgressiveLoader}
         priority // Hero images should load immediately
       />
     )
   }

3. Create CloudinaryThumbnail for small images:
   import { cloudinaryThumbnailLoader } from '@/lib/cloudinaryLoader'

   export function CloudinaryThumbnail(props: CloudinaryImageProps) {
     return (
       <Image
         {...props}
         loader={cloudinaryThumbnailLoader}
         loading="lazy" // Thumbnails can lazy load
       />
     )
   }

4. Add TypeScript types and JSDoc for each component

5. Export all components from a barrel file:
   export {
     CloudinaryImage,
     CloudinaryHeroImage,
     CloudinaryThumbnail
   } from './CloudinaryImage'
```

### Task 4: Create Unit Tests
**Prompt:**
```
Create comprehensive unit tests in lib/cloudinaryLoader.test.ts:

1. Test suite for extractPublicId helper:
   describe('extractPublicId', () => {
     test('returns public ID from full Cloudinary URL')
     test('returns public ID from URL with version number')
     test('returns public ID from URL with nested folders')
     test('returns input as-is if already a public ID')
     test('handles edge cases (empty string, null, undefined)')
   })

2. Test suite for cloudinaryLoader:
   describe('cloudinaryLoader', () => {
     test('generates correct URL with width parameter')
     test('applies quality parameter when provided')
     test('uses auto:good quality by default')
     test('includes f_auto for format optimization')
     test('includes dpr_auto for Retina support')
     test('includes c_limit to prevent upscaling')
     test('handles public ID input')
     test('handles full URL input')
     test('handles URLs with version numbers')
   })

3. Test suite for specialized loaders:
   describe('cloudinaryProgressiveLoader', () => {
     test('adds fl_progressive for images > 1000px')
     test('excludes fl_progressive for images <= 1000px')
   })

   describe('cloudinaryThumbnailLoader', () => {
     test('uses q_auto:eco for smaller file sizes')
   })

4. Test suite for error handling:
   describe('Error handling', () => {
     test('returns original src if CLOUDINARY_CLOUD_NAME not set')
     test('handles malformed URLs gracefully')
     test('logs error when cloud name missing')
   })

5. Mock environment variables for testing:
   beforeEach(() => {
     process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = 'test-cloud'
   })

6. Aim for 100% code coverage
```

### Task 5: Create Integration Tests with Next.js Image
**Prompt:**
```
Create integration tests in lib/cloudinaryLoader.integration.test.tsx:

1. Set up React Testing Library:
   import { render, screen } from '@testing-library/react'
   import Image from 'next/image'
   import { cloudinaryLoader } from './cloudinaryLoader'

2. Test basic Next.js Image integration:
   describe('Next.js Image integration', () => {
     test('CloudinaryImage renders with correct src')
     test('Image component receives optimized URL')
     test('Width and height props are respected')
     test('Alt text is properly set')
     test('Loading prop works correctly')
   })

3. Test responsive image generation:
   describe('Responsive images', () => {
     test('generates srcSet with multiple widths')
     test('sizes attribute is respected')
     test('fill mode works correctly')
   })

4. Test wrapper components:
   describe('CloudinaryImage wrapper', () => {
     test('CloudinaryImage uses cloudinaryLoader')
     test('CloudinaryHeroImage uses progressive loader')
     test('CloudinaryHeroImage has priority prop')
     test('CloudinaryThumbnail uses thumbnail loader')
     test('CloudinaryThumbnail has lazy loading')
   })

5. Test edge cases:
   describe('Edge cases', () => {
     test('handles missing environment variables')
     test('works with absolute URLs')
     test('works with relative paths')
   })
```

### Task 6: Create Documentation
**Prompt:**
```
Create comprehensive documentation in lib/README.md:

# Cloudinary Next.js Integration

## Overview
Custom loaders and components for seamless Cloudinary integration with Next.js Image component.

## Basic Usage

### With Custom Loader
```tsx
import Image from 'next/image'
import { cloudinaryLoader } from '@/lib/cloudinaryLoader'

export function MyComponent() {
  return (
    <Image
      loader={cloudinaryLoader}
      src="samples/cloudinary-icon.png"
      width={800}
      height={600}
      alt="Cloudinary Icon"
    />
  )
}
```

### With Wrapper Component
```tsx
import { CloudinaryImage } from '@/components/CloudinaryImage'

export function MyComponent() {
  return (
    <CloudinaryImage
      src="samples/cloudinary-icon.png"
      width={800}
      height={600}
      alt="Cloudinary Icon"
    />
  )
}
```

## Available Components

### CloudinaryImage
General-purpose optimized image component.

### CloudinaryHeroImage
For large hero/banner images with progressive loading.

### CloudinaryThumbnail
For thumbnails and small images with aggressive compression.

## Advanced Usage

### Responsive Images
[Examples with sizes and srcSet]

### Fill Mode
[Examples with fill prop]

### Priority Loading
[Examples with priority prop]

### Lazy Loading
[Examples with loading prop]

## Performance Considerations
[Guidelines on when to use each component/loader]

## Troubleshooting
[Common issues and solutions]
```

## Testing Checklist

### Unit Tests
- [ ] extractPublicId tested with all input types
- [ ] cloudinaryLoader generates correct URLs
- [ ] Specialized loaders work as expected
- [ ] Error handling covers edge cases
- [ ] 100% code coverage achieved

### Integration Tests
- [ ] Next.js Image component renders correctly
- [ ] Loader function is called with correct parameters
- [ ] Wrapper components work as expected
- [ ] Responsive image generation works
- [ ] All props pass through correctly

### Visual Tests
- [ ] Images display at correct sizes
- [ ] Images sharp on Retina displays
- [ ] Progressive loading works for hero images
- [ ] Lazy loading works for thumbnails
- [ ] srcSet generates multiple sizes

### Browser Tests
- [ ] Chrome: Receives AVIF or WebP
- [ ] Safari: Receives WebP or HEIC
- [ ] Firefox: Receives WebP
- [ ] Retina displays: Receives 2x images
- [ ] Standard displays: Receives 1x images

## Performance Impact

### Before (Direct URLs)
```tsx
<img src="https://res.cloudinary.com/demo/image/upload/sample.jpg" />
// No optimization, no responsive images
```

### After (Next.js Image + Cloudinary Loader)
```tsx
<CloudinaryImage src="sample.jpg" width={800} height={600} />
// Optimized, responsive, Retina-ready
// srcset="
//   ...w_640,q_auto:good,f_auto,dpr_auto... 640w,
//   ...w_750,q_auto:good,f_auto,dpr_auto... 750w,
//   ...w_828,q_auto:good,f_auto,dpr_auto... 828w,
// "
```

## Expected Results

### URL Generation
```typescript
// Input
{ src: 'sample.jpg', width: 800, quality: 85 }

// Output
'https://res.cloudinary.com/demo/image/upload/w_800,q_85,f_auto,c_limit,dpr_auto/sample.jpg'
```

### Responsive Images
Next.js automatically generates srcSet with multiple sizes:
- 640w, 750w, 828w, 1080w, 1200w, 1920w, 2048w, 3840w

Cloudinary serves optimized version for each size.

## Definition of Done
- [ ] Cloudinary loader function implemented
- [ ] Specialized loaders created
- [ ] Wrapper components created
- [ ] All unit tests passing with 100% coverage
- [ ] Integration tests passing
- [ ] Browser testing completed
- [ ] Visual verification on Retina displays
- [ ] Documentation complete with examples
- [ ] Code reviewed and approved
- [ ] No TypeScript or ESLint errors

## Dependencies
- **Requires**:
  - STORY-001 (Enhanced utility with DPR support)
  - Next.js 13+ installed
  - next/image component available
- **Blocks**:
  - STORY-007 (Migrate existing views to Next.js Image)

## Estimated Effort
**2-3 days** (16-24 hours)
- Loader implementation: 4 hours
- Wrapper components: 3 hours
- Unit tests: 4 hours
- Integration tests: 3 hours
- Documentation: 2 hours
- Testing & validation: 4 hours

## Notes
- **Next.js Image** automatically generates responsive images
- **Cloudinary loader** integrates with Next.js's optimization
- **Wrapper components** simplify usage and ensure consistency
- **TypeScript** provides full type safety
- **Testing is critical** - loader affects all images in the app

## References
- [Next.js Image Component](https://nextjs.org/docs/app/api-reference/components/image)
- [Next.js Image Loaders](https://nextjs.org/docs/app/api-reference/components/image#loader)
- [Cloudinary Next.js Integration](https://cloudinary.com/documentation/next_integration)

## Rollback Plan
If issues arise:
1. Remove loader configuration
2. Fall back to standard Next.js Image (no Cloudinary optimization)
3. Or revert to direct `<img>` tags temporarily
4. Investigate and fix issues
5. Re-deploy with fixes

## Future Enhancements (Out of Scope)
- Blur placeholder generation
- Automatic art direction
- AI-powered cropping (g_auto)
- Video support
- Automatic WebP/AVIF detection without f_auto
