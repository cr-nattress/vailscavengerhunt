# Phase 21: Harden Photo Upload Netlify Function

## Summary
Improve resilience of `netlify/functions/photo-upload.js` by handling edge cases, reducing timeouts, and returning user-friendly errors.

## Why
- Large images and slow networks can cause timeouts.
- Edge cases (missing boundary, non-base64 body) can lead to 400/500 errors.
- Clearer errors improve UX and support.

## Scope
- Validate and handle `event.isBase64Encoded` and non-base64 bodies.
- Enforce/maximize server-side limits defensively (size, type).
- Return actionable error messages for common cases (timeout, size, bad content-type).

## Acceptance Criteria
- Function reliably parses multipart requests in production.
- Timeouts reduced; failures return descriptive messages.
- Logs include correlation-friendly fields (sessionId, teamName, locationSlug).

## Steps
1. Input validation
   - Detect `event.isBase64Encoded` and parse accordingly.
   - Validate `Content-Type` format and presence of `boundary`.
2. Limits
   - Add guardrails for max file size (e.g., reject > 15 MB with 413).
   - Validate `image/*` mime.
3. Error mapping
   - Map Cloudinary credential errors → 500 with clear guidance.
   - Map size errors → 413 with suggestion to try a smaller photo.
   - Map timeout errors → 504-like response and recommend retry.
4. Logging
   - Log `sessionId`, `teamName`, `locationSlug`, `requestId` (from headers if any).
5. Test matrix
   - Small (500KB), medium (3MB), large (10MB) images, and non-image file.
   - Slow network simulation.

## Rollback Plan
- Revert to prior function version if regressions are found.
