# Phase 20: Resize Images Client-Side Before Upload

## Summary
Use `PhotoUploadService.uploadPhotoWithResize()` in the UI to reduce payload size, avoid Netlify function timeouts, and improve upload reliability on mobile networks.

## Why
- Large phone photos can exceed request limits or cause timeouts.
- We already implemented `uploadPhotoWithResize()` which compresses on-device.

## Scope
- Replace calls to `uploadPhoto()` with `uploadPhotoWithResize()` in upload flows.
- Keep an escape hatch to skip resize for debugging (feature flag).

## Acceptance Criteria
- All user-initiated uploads use the resizing path by default.
- Typical image payloads reduced by >50% compared to originals.
- Upload success rate improves in production.

## Steps
1. Update `src/features/views/ActiveView.tsx` to call:
   - `PhotoUploadService.uploadPhotoWithResize(file, locationTitle, sessionId, 1600, 0.8, teamName, locationName, eventName)`
2. Optionally add an env flag `VITE_DISABLE_CLIENT_RESIZE` to force raw upload during debugging.
3. Test on mobile and desktop with large images (5–10 MB originals).

## Rollback Plan
- Switch calls back to `uploadPhoto()` if any regressions appear.
