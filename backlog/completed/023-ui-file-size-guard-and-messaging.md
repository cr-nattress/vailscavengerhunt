# Phase 23: UI File Size Guard and User Messaging

## Summary
Add client-side validation to prevent overly large uploads and provide clear, actionable feedback to users before submitting to the server.

## Why
- Large images can cause slow uploads or server timeouts.
- Early validation improves UX and success rates.

## Scope
- Check file size and type before upload.
- Display friendly messaging and suggest using a smaller image if necessary.
- Allow override for admins via env flag for testing.

## Acceptance Criteria
- Files exceeding a configurable limit (e.g., 10 MB) are blocked with a clear message.
- Users receive immediate feedback without hitting the server.

## Steps
1. In `src/features/views/ActiveView.tsx` (or the upload component):
   - Before calling the upload service, validate `file.size` and `file.type`.
   - If `file.size > MAX_SIZE_BYTES`, show toast: `Image is too large. Please choose a smaller photo.`
2. Make `MAX_SIZE_BYTES` configurable via `VITE_MAX_UPLOAD_BYTES` (default 10MB).
3. Add an admin override env flag `VITE_ALLOW_LARGE_UPLOADS=true` to bypass for debugging.
4. Update tests and add manual QA checklist.

## Rollback Plan
- Disable the guard by setting `VITE_ALLOW_LARGE_UPLOADS=true` in `.env`.
