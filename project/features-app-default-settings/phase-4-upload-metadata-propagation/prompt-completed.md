Phase 4 completed.

Changes implemented
- `src/client/PhotoUploadService.ts`: accepts optional `teamName`, `locationName`, and `eventName` in both `uploadPhoto` and `uploadPhotoWithResize` and appends them to `FormData` if present.
- `src/App.jsx`: passes `eventName` (along with `teamName` and `locationName`) into `uploadPhotoWithResize` so the server receives full context for tagging/folders.

Verification
- Upload requests include optional metadata fields when available.
- Server function `netlify/functions/photo-upload.ts` already tolerates/uses these fields for tags/context.
