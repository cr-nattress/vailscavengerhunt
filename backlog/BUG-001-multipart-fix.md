# BUG-001 Multipart Fix Documentation

## Date Fixed: 2025-09-27

## Problem
The photo-upload-orchestrated endpoint was returning 400 Bad Request with "No multipart data found" error when called from the browser.

## Root Cause
The Express server middleware was parsing the multipart/form-data body using express.json() and express.urlencoded(), which prevented the raw multipart data from reaching the Netlify function. The Netlify function expects raw multipart data with proper boundary headers to parse using the `parse-multipart-data` library.

## Solution Applied

### Changes to `src/server/server.ts`

1. **Removed multer dependency** - No longer parsing multipart on Express side
2. **Added raw body capture middleware** - Captures raw multipart data before Express parses it
3. **Modified Netlify function handler** - Passes raw body as base64 encoded to the function

#### Key Code Changes:

```typescript
// Raw body capture middleware (lines 59-74)
app.use((req, res, next) => {
  const contentType = req.headers['content-type'] || '';

  // If it's multipart, capture raw body
  if (contentType.includes('multipart/form-data')) {
    let data = Buffer.alloc(0);

    req.on('data', (chunk) => {
      data = Buffer.concat([data, chunk]);
    });

    req.on('end', () => {
      (req as any).rawBody = data;
      next();
    });
  } else {
    next();
  }
});
```

```typescript
// Updated Netlify function handler (lines 149-157)
if (functionFile === 'photo-upload-orchestrated' && (req as any).rawBody) {
  // For photo upload, use raw body and encode as base64
  body = (req as any).rawBody.toString('base64');
  isBase64Encoded = true;
  console.log('[Photo Upload] Using raw body, size:', (req as any).rawBody.length, 'bytes');
} else if (req.body) {
  body = JSON.stringify(req.body);
}
```

## Testing Results
✅ Multipart data is properly captured (890 bytes in test)
✅ Raw body is passed through with base64 encoding
✅ Netlify function successfully parses multipart boundary
✅ Files are extracted from multipart data
✅ Upload to Cloudinary succeeds

## How It Works Now

1. **Browser** sends multipart/form-data to `/api/photo-upload-orchestrated`
2. **Express** captures raw body buffer before any parsing
3. **Express** redirects to `/.netlify/functions/photo-upload-orchestrated`
4. **Express** passes raw body as base64 encoded string
5. **Netlify Function** decodes base64 to get original multipart data
6. **Netlify Function** parses multipart using boundary from headers
7. **Netlify Function** uploads to Cloudinary and updates database

## Production Considerations
In production on Netlify, the platform handles multipart parsing automatically, so this raw body capture is only needed for local development with Express.

## Files Modified
- `src/server/server.ts` - Added raw body capture, removed multer
- `src/client/PhotoUploadService.ts` - Previously fixed path to `/photo-upload-orchestrated`

## Verification Command
```bash
curl -X POST http://localhost:3001/api/photo-upload-orchestrated \
  -F "photo=@image.jpg" \
  -F "locationTitle=Test Location" \
  -F "sessionId=test-session" \
  -F "orgId=bhhs" \
  -F "huntId=fall-2025" \
  -F "teamId=test-team" \
  -F "locationId=loc-123"
```

## Status
✅ **FIXED** - Photo uploads now work correctly in local development environment