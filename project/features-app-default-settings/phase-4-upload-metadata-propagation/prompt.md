# Phase 4 — Upload Metadata Propagation and Validation

Objective
- Ensure that uploads and related metadata consistently use the chosen values (URL-locked via valid full path params or user-selected).
- Optionally thread `location`, `event`, `team` into the upload request payload if needed by backend or tagging.

Scope of changes
- `src/features/upload/UploadContext.tsx`
  - Confirm `UploadProvider` receives store values from `App.jsx` (already wired) and continues to derive `locationSlug` and `teamSlug`.
- `src/App.jsx`
  - Verify the values passed to `UploadProvider` are the ones from store (which may be set by URL or user input).
- `src/client/PhotoUploadService.ts`
  - If required by server-side tagging, include `locationName`, `eventName`, `teamName` in `FormData` fields when uploading.
  - Validate that these are present when `lockedByQuery` is true; warn if empty.
- `netlify/functions/photo-upload.ts` (optional, if threading through)
  - Read the new fields and apply them to Cloudinary folder/tags if this is in scope.

Details
- Keep prior idempotency checks intact.
- Maintain schema consistency expected by any future `apiClient` layer.

Acceptance criteria
- Uploads still work in both modes (locked/unlocked).
- When locked by URL and values are present, those values appear in upload metadata (client and/or server-side, depending on scope).
- No regressions in `CollageUploader` behavior.
