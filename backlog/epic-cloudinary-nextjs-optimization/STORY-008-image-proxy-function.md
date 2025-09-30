# STORY-008: Image Proxy Netlify Function

## Story
**As a** developer managing image delivery
**I want** a Netlify Function that proxies and optimizes Cloudinary images
**So that** I can apply consistent transformations and add authentication/authorization

## Acceptance Criteria
- [ ] Create Netlify Function at `netlify/functions/image-proxy.js`
- [ ] Function accepts publicId, width, quality, and context parameters
- [ ] Applies appropriate Cloudinary transformations based on parameters
- [ ] Returns 302 redirect to optimized Cloudinary URL (recommended approach)
- [ ] Optional: Proxy mode that fetches and returns image data
- [ ] Proper error handling for missing parameters
- [ ] Cache headers for optimal performance
- [ ] Comprehensive logging for debugging
- [ ] Unit tests for function logic
- [ ] Integration tests with actual Netlify Functions runtime
- [ ] Documentation with API reference

## Context
While frontend URL transformation is efficient, a Netlify Function proxy provides additional capabilities:
- Centralized optimization logic (easier to update globally)
- Authentication/authorization for private images
- Server-side transformation decisions
- Analytics and usage tracking
- A/B testing different optimization strategies

This story implements the proxy function with redirect mode (fastest) and optional fetch mode.

## Technical Details

### Function Endpoint
```
GET /.netlify/functions/image-proxy
```

### Query Parameters
```typescript
interface ImageProxyParams {
  publicId: string       // Required: Cloudinary public ID
  width?: number         // Optional: Custom width (overrides context)
  height?: number        // Optional: Custom height
  quality?: string       // Optional: Quality setting (auto:good, auto:eco, etc.)
  context?: string       // Optional: Preset context (thumbnail, card, feature, hero)
  dpr?: string          // Optional: Device pixel ratio (auto, 1, 2, 3)
  progressive?: boolean  // Optional: Enable progressive loading
  mode?: 'redirect' | 'proxy'  // Optional: redirect (default) or proxy mode
}
```

### Response Modes

**Redirect Mode (Default - Recommended)**
```javascript
// 302 redirect to Cloudinary URL
// Fast, leverages Cloudinary CDN
// No bandwidth through Netlify
return {
  statusCode: 302,
  headers: { 'Location': optimizedCloudinaryUrl }
}
```

**Proxy Mode (Optional)**
```javascript
// Fetch from Cloudinary and return image data
// Useful for adding headers, analytics, etc.
// More bandwidth through Netlify
return {
  statusCode: 200,
  headers: { 'Content-Type': 'image/...' },
  body: base64EncodedImage,
  isBase64Encoded: true
}
```

## Implementation Tasks

### Task 1: Create Netlify Function Structure
**Prompt:**
```
Create netlify/functions/image-proxy.js with basic structure and parameter parsing:

1. Add file header with JSDoc:
   /**
    * Image Proxy Netlify Function
    *
    * Proxies and optimizes Cloudinary images with consistent transformations.
    * Supports redirect mode (fast) and proxy mode (full control).
    *
    * Endpoint: GET /.netlify/functions/image-proxy
    *
    * Query Parameters:
    * - publicId: string (required) - Cloudinary public ID
    * - width: number (optional) - Custom width
    * - height: number (optional) - Custom height
    * - quality: string (optional) - Quality setting
    * - context: string (optional) - Preset context (thumbnail, card, feature, hero)
    * - dpr: string (optional) - Device pixel ratio
    * - progressive: boolean (optional) - Enable progressive loading
    * - mode: string (optional) - 'redirect' (default) or 'proxy'
    *
    * @example
    * GET /.netlify/functions/image-proxy?publicId=samples/photo.jpg&context=card
    * Returns: 302 redirect to optimized Cloudinary URL
    *
    * @example
    * GET /.netlify/functions/image-proxy?publicId=samples/photo.jpg&width=800&quality=auto:eco
    * Returns: 302 redirect with custom parameters
    */

2. Export handler function:
   exports.handler = async (event, context) => {
     // Function implementation
   }

3. Add CORS headers constant:
   const CORS_HEADERS = {
     'Access-Control-Allow-Origin': '*',
     'Access-Control-Allow-Headers': 'Content-Type',
     'Access-Control-Allow-Methods': 'GET, OPTIONS'
   }

4. Handle OPTIONS request for CORS:
   if (event.httpMethod === 'OPTIONS') {
     return { statusCode: 200, headers: CORS_HEADERS, body: '' }
   }

5. Validate HTTP method:
   if (event.httpMethod !== 'GET') {
     return {
       statusCode: 405,
       headers: CORS_HEADERS,
       body: JSON.stringify({ error: 'Method not allowed' })
     }
   }

6. Parse query parameters with validation:
   const params = event.queryStringParameters || {}
   const {
     publicId,
     width,
     height,
     quality = 'auto:good',
     context,
     dpr = 'auto',
     progressive = false,
     mode = 'redirect'
   } = params

7. Validate required parameters:
   if (!publicId) {
     return {
       statusCode: 400,
       headers: CORS_HEADERS,
       body: JSON.stringify({
         error: 'Missing required parameter: publicId',
         usage: '?publicId=samples/photo.jpg&context=card'
       })
     }
   }
```

### Task 2: Implement Transformation Logic
**Prompt:**
```
Add transformation building logic to netlify/functions/image-proxy.js:

1. Define context presets:
   const CONTEXT_PRESETS = {
     thumbnail: { width: 400, height: 400, quality: 'auto:eco' },
     card: { width: 800, height: 600, quality: 'auto:good' },
     feature: { width: 1200, quality: 'auto:good' },
     hero: { width: 1600, height: 1200, quality: 'auto:good' }
   }

2. Determine dimensions and quality:
   let targetWidth, targetHeight, targetQuality

   if (context && CONTEXT_PRESETS[context]) {
     // Use preset
     const preset = CONTEXT_PRESETS[context]
     targetWidth = width || preset.width
     targetHeight = height || preset.height
     targetQuality = quality || preset.quality
   } else {
     // Use custom parameters or defaults
     targetWidth = width || 800
     targetHeight = height
     targetQuality = quality
   }

3. Build transformation array:
   const transformations = [
     `w_${targetWidth}`,
     targetHeight ? `h_${targetHeight}` : null,
     'c_limit',
     `q_${targetQuality}`,
     'f_auto',
     `dpr_${dpr}`,
     progressive === 'true' && targetWidth > 1000 ? 'fl_progressive' : null
   ].filter(Boolean).join(',')

4. Build Cloudinary URL:
   const cloudName = process.env.CLOUDINARY_CLOUD_NAME

   if (!cloudName) {
     console.error('CLOUDINARY_CLOUD_NAME environment variable not set')
     return {
       statusCode: 500,
       headers: CORS_HEADERS,
       body: JSON.stringify({ error: 'Server configuration error' })
     }
   }

   const optimizedUrl = `https://res.cloudinary.com/${cloudName}/image/upload/${transformations}/${publicId}`

5. Add logging:
   console.log(`[image-proxy] Request: publicId=${publicId}, context=${context}, width=${targetWidth}`)
   console.log(`[image-proxy] Generated URL: ${optimizedUrl}`)
```

### Task 3: Implement Redirect Mode (Recommended)
**Prompt:**
```
Implement redirect mode in netlify/functions/image-proxy.js:

1. Add redirect logic:
   if (mode === 'redirect') {
     return {
       statusCode: 302,
       headers: {
         ...CORS_HEADERS,
         'Location': optimizedUrl,
         // Aggressive caching - transformations are immutable
         'Cache-Control': 'public, max-age=31536000, immutable',
         'X-Cloudinary-Transformations': transformations
       },
       body: ''
     }
   }

2. Add request logging:
   console.log(`[image-proxy] Redirecting to: ${optimizedUrl}`)

3. Add performance timing:
   const startTime = Date.now()
   // ... after returning response
   console.log(`[image-proxy] Redirect completed in ${Date.now() - startTime}ms`)

Benefits of redirect mode:
- Fastest performance (single redirect, no data transfer through Netlify)
- Leverages Cloudinary CDN caching
- Minimal bandwidth usage on Netlify
- Standard HTTP redirect (all browsers support)
```

### Task 4: Implement Proxy Mode (Optional)
**Prompt:**
```
Implement optional proxy mode in netlify/functions/image-proxy.js:

1. Add fetch and proxy logic:
   if (mode === 'proxy') {
     try {
       console.log(`[image-proxy] Fetching image: ${optimizedUrl}`)

       // Fetch image from Cloudinary
       const response = await fetch(optimizedUrl)

       if (!response.ok) {
         throw new Error(`Cloudinary returned ${response.status}`)
       }

       // Get image data
       const imageBuffer = await response.arrayBuffer()
       const contentType = response.headers.get('content-type') || 'image/jpeg'

       console.log(`[image-proxy] Proxying ${imageBuffer.byteLength} bytes as ${contentType}`)

       // Return image data
       return {
         statusCode: 200,
         headers: {
           ...CORS_HEADERS,
           'Content-Type': contentType,
           'Cache-Control': 'public, max-age=31536000, immutable',
           'X-Cloudinary-Transformations': transformations,
           'Content-Length': imageBuffer.byteLength
         },
         body: Buffer.from(imageBuffer).toString('base64'),
         isBase64Encoded: true
       }
     } catch (error) {
       console.error(`[image-proxy] Proxy mode error:`, error)
       return {
         statusCode: 500,
         headers: CORS_HEADERS,
         body: JSON.stringify({
           error: 'Failed to fetch image from Cloudinary',
           details: error.message
         })
       }
     }
   }

2. Add notes in comments:
   // Proxy mode is useful for:
   // - Adding custom headers
   // - Image analytics/tracking
   // - Authentication/authorization
   // - Modifying image data
   // BUT: Uses more Netlify bandwidth and is slower
   // Recommend using redirect mode unless you need these features
```

### Task 5: Add Error Handling and Logging
**Prompt:**
```
Add comprehensive error handling to netlify/functions/image-proxy.js:

1. Wrap main handler in try-catch:
   exports.handler = async (event, context) => {
     const requestId = context.requestId || Math.random().toString(36).substr(2, 9)

     try {
       console.log(`[image-proxy:${requestId}] Request received`)

       // ... existing logic ...

     } catch (error) {
       console.error(`[image-proxy:${requestId}] Unexpected error:`, error)
       console.error(`[image-proxy:${requestId}] Stack:`, error.stack)

       return {
         statusCode: 500,
         headers: CORS_HEADERS,
         body: JSON.stringify({
           error: 'Internal server error',
           requestId,
           message: error.message
         })
       }
     }
   }

2. Add parameter validation errors:
   // Validate context if provided
   if (context && !CONTEXT_PRESETS[context]) {
     return {
       statusCode: 400,
       headers: CORS_HEADERS,
       body: JSON.stringify({
         error: 'Invalid context parameter',
         validContexts: Object.keys(CONTEXT_PRESETS),
         received: context
       })
     }
   }

   // Validate mode if provided
   if (mode && !['redirect', 'proxy'].includes(mode)) {
     return {
       statusCode: 400,
       headers: CORS_HEADERS,
       body: JSON.stringify({
         error: 'Invalid mode parameter',
         validModes: ['redirect', 'proxy'],
         received: mode
       })
     }
   }

3. Add timing logs:
   const startTime = Date.now()
   // ... logic ...
   const duration = Date.now() - startTime
   console.log(`[image-proxy:${requestId}] Completed in ${duration}ms`)
```

### Task 6: Create Unit Tests
**Prompt:**
```
Create unit tests in netlify/functions/image-proxy.test.js:

1. Test suite for parameter validation:
   describe('Parameter validation', () => {
     test('returns 400 when publicId is missing')
     test('returns 400 for invalid context')
     test('returns 400 for invalid mode')
     test('accepts valid parameters')
   })

2. Test suite for transformation building:
   describe('Transformation building', () => {
     test('uses context preset when provided')
     test('uses custom width/height when provided')
     test('custom parameters override context preset')
     test('adds progressive flag for large images')
     test('excludes progressive flag for small images')
     test('includes dpr_auto by default')
     test('respects custom dpr parameter')
   })

3. Test suite for redirect mode:
   describe('Redirect mode', () => {
     test('returns 302 status code')
     test('includes Location header with optimized URL')
     test('includes cache headers')
     test('includes transformation metadata header')
   })

4. Test suite for proxy mode:
   describe('Proxy mode', () => {
     test('fetches image from Cloudinary')
     test('returns image data as base64')
     test('includes correct content-type header')
     test('handles fetch errors gracefully')
   })

5. Test suite for error handling:
   describe('Error handling', () => {
     test('handles missing CLOUDINARY_CLOUD_NAME')
     test('handles malformed publicId')
     test('handles network errors in proxy mode')
     test('includes request ID in error responses')
   })

6. Mock environment variables and fetch:
   beforeEach(() => {
     process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud'
     global.fetch = jest.fn()
   })
```

### Task 7: Create Integration Tests
**Prompt:**
```
Create integration tests that run the actual Netlify Function:

1. Set up test file netlify/functions/image-proxy.integration.test.js:
   const { handler } = require('./image-proxy')

2. Test actual function execution:
   describe('Image proxy function integration', () => {
     test('processes valid request with context')
     test('processes valid request with custom parameters')
     test('handles missing parameters correctly')
     test('redirect mode returns correct response')
     test('proxy mode fetches and returns image')
   })

3. Create mock event objects:
   function createMockEvent(queryStringParameters) {
     return {
       httpMethod: 'GET',
       queryStringParameters,
       headers: {}
     }
   }

   function createMockContext() {
     return {
       requestId: 'test-request-id'
     }
   }

4. Test with real Cloudinary URLs (use public demo images)

5. Verify response structure and headers
```

### Task 8: Create API Documentation
**Prompt:**
```
Create API documentation in docs/api/image-proxy.md:

# Image Proxy API

## Endpoint
GET /.netlify/functions/image-proxy

## Parameters

### Required
- **publicId** (string): Cloudinary public ID or path
  - Example: `samples/cloudinary-icon.png`

### Optional
- **context** (string): Preset optimization context
  - Values: `thumbnail`, `card`, `feature`, `hero`
  - Example: `context=card`

- **width** (number): Custom width in pixels
  - Overrides context width
  - Example: `width=800`

- **height** (number): Custom height in pixels
  - Example: `height=600`

- **quality** (string): Quality setting
  - Values: `auto:best`, `auto:good`, `auto:eco`, `auto:low`, or number 1-100
  - Default: `auto:good`
  - Example: `quality=auto:eco`

- **dpr** (string): Device pixel ratio
  - Values: `auto`, `1`, `1.5`, `2`, `3`
  - Default: `auto`
  - Example: `dpr=2`

- **progressive** (boolean): Enable progressive loading
  - Default: `false`
  - Example: `progressive=true`

- **mode** (string): Response mode
  - Values: `redirect` (default), `proxy`
  - Example: `mode=redirect`

## Response Modes

### Redirect Mode (Default)
Returns 302 redirect to optimized Cloudinary URL.
- Fastest performance
- Leverages Cloudinary CDN
- Minimal Netlify bandwidth

### Proxy Mode
Fetches and returns image data through Netlify.
- Full control over response
- Useful for analytics/tracking
- Higher Netlify bandwidth usage

## Examples

### Basic usage with context
```
GET /.netlify/functions/image-proxy?publicId=samples/photo.jpg&context=card
Response: 302 redirect to optimized URL
```

### Custom dimensions
```
GET /.netlify/functions/image-proxy?publicId=samples/photo.jpg&width=1200&height=800
Response: 302 redirect with custom size
```

### Progressive loading for hero image
```
GET /.netlify/functions/image-proxy?publicId=hero.jpg&context=hero&progressive=true
Response: 302 redirect with progressive loading
```

### Proxy mode with analytics
```
GET /.netlify/functions/image-proxy?publicId=sample.jpg&mode=proxy
Response: Image data (useful for tracking/analytics)
```

## Response Headers

### Redirect Mode
```
HTTP/1.1 302 Found
Location: https://res.cloudinary.com/...
Cache-Control: public, max-age=31536000, immutable
X-Cloudinary-Transformations: w_800,h_600,c_limit,q_auto:good,f_auto,dpr_auto
```

### Proxy Mode
```
HTTP/1.1 200 OK
Content-Type: image/webp
Cache-Control: public, max-age=31536000, immutable
X-Cloudinary-Transformations: w_800,h_600,c_limit,q_auto:good,f_auto,dpr_auto
Content-Length: 45678
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Missing required parameter: publicId",
  "usage": "?publicId=samples/photo.jpg&context=card"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "requestId": "abc123",
  "message": "Error details"
}
```

## Performance Considerations

- **Redirect mode**: ~50-100ms (fast)
- **Proxy mode**: ~500-1000ms (slower, includes fetch)
- **Caching**: Aggressive caching recommended (immutable transformations)
- **CDN**: Cloudinary CDN serves subsequent requests

## Best Practices

1. **Use redirect mode** unless you need proxy features
2. **Use context presets** for consistency
3. **Enable progressive** for large images only
4. **Cache responses** aggressively (transformations don't change)
5. **Monitor usage** to avoid exceeding Netlify bandwidth limits
```

## Testing Checklist

### Unit Tests
- [ ] Parameter validation works correctly
- [ ] Transformation building logic correct
- [ ] Context presets applied properly
- [ ] Custom parameters override presets
- [ ] Error handling comprehensive
- [ ] All code paths covered

### Integration Tests
- [ ] Function executes successfully
- [ ] Redirect mode returns 302
- [ ] Proxy mode returns 200 with image
- [ ] Error cases handled properly
- [ ] Headers set correctly

### Manual Tests
- [ ] Test in browser with various parameters
- [ ] Verify redirect follows to Cloudinary
- [ ] Check Network tab for performance
- [ ] Test with missing parameters
- [ ] Test with invalid parameters
- [ ] Verify caching works

### Performance Tests
- [ ] Redirect mode < 100ms
- [ ] Proxy mode < 1s
- [ ] No memory leaks
- [ ] Handles concurrent requests

## Performance Impact

### Redirect Mode (Recommended)
- **Latency**: ~50-100ms (function execution)
- **Bandwidth**: Minimal (just redirect)
- **Cost**: Minimal Netlify function invocations

### Proxy Mode
- **Latency**: ~500-1000ms (fetch + transfer)
- **Bandwidth**: High (image data through Netlify)
- **Cost**: Higher function duration + bandwidth

## Expected Results

### Request
```
GET /.netlify/functions/image-proxy?publicId=samples/photo.jpg&context=card
```

### Response (Redirect Mode)
```
HTTP/1.1 302 Found
Location: https://res.cloudinary.com/demo/image/upload/w_800,h_600,c_limit,q_auto:good,f_auto,dpr_auto/samples/photo.jpg
Cache-Control: public, max-age=31536000, immutable
```

### Result
Browser automatically follows redirect to Cloudinary, which serves optimized image from CDN.

## Definition of Done
- [ ] Netlify Function implemented
- [ ] Redirect mode working
- [ ] Proxy mode working (optional)
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] Manual testing completed
- [ ] API documentation complete
- [ ] Performance validated
- [ ] Error handling comprehensive
- [ ] Logging in place
- [ ] Code reviewed and approved

## Dependencies
- **Requires**:
  - STORY-001 (transformation logic patterns)
  - Cloudinary account credentials
  - Netlify Functions runtime
- **Blocks**: None (optional feature)

## Estimated Effort
**2-3 days** (16-24 hours)
- Function implementation: 4 hours
- Redirect mode: 2 hours
- Proxy mode: 3 hours
- Unit tests: 3 hours
- Integration tests: 2 hours
- Documentation: 2 hours
- Testing & validation: 4 hours

## Notes
- **Redirect mode is strongly recommended** for performance
- **Proxy mode** should only be used when necessary (analytics, auth, etc.)
- **Function is stateless** - no caching needed in function itself
- **Cloudinary handles caching** - transformations cached by CDN
- **Monitor Netlify usage** - proxy mode uses more bandwidth

## References
- [Netlify Functions Documentation](https://docs.netlify.com/functions/overview/)
- [HTTP Redirects](https://developer.mozilla.org/en-US/docs/Web/HTTP/Redirections)
- [Base64 Encoding for Images](https://docs.netlify.com/functions/build/#format-the-return-object)

## Rollback Plan
If issues arise:
1. Remove function or disable endpoint
2. Fall back to direct Cloudinary URLs
3. Or use frontend URL transformation
4. Investigate and fix issues
5. Re-deploy with fixes

## Future Enhancements (Out of Scope)
- Authentication/authorization
- Rate limiting
- Usage analytics
- A/B testing different transformations
- Dynamic transformation based on user agent
- Image format detection without f_auto
