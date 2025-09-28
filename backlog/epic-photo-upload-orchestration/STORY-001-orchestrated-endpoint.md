# Story 001: Create Orchestrated Upload Netlify Function

## Summary
Create a new Netlify Function `photo-upload-orchestrated` that performs server-side orchestration (Saga) for photo uploads: upload to Cloudinary, verify, upsert into Supabase `hunt_progress`, and compensate by deleting the Cloudinary asset if the DB write fails.

## Details
- Endpoint: `/.netlify/functions/photo-upload-orchestrated`
- Input: `multipart/form-data` with fields `photo`, `locationTitle`, `sessionId`, optional `teamName`, `locationName`, `eventName`, and optional `idempotencyKey`.
- Output: Same shape as `UploadResponseSchema` (`photoUrl`, `publicId`, `locationSlug`, `title`, `uploadedAt`).
- Orchestration:
  - Upload to Cloudinary using `idempotencyKey` as part of `public_id` and in `context`.
  - Verify asset existence (resource lookup) before DB write.
  - Upsert into Supabase table `hunt_progress` using `UNIQUE(team_id, location_id)` to prevent duplicates:
    - Set `photo_url` to the Cloudinary secure URL.
    - Set `done = true` and `completed_at = NOW()` when marking a stop complete via upload.
    - Preserve or merge any existing `revealed_hints`/`notes` fields as appropriate.
  - On DB failure (non-unique conflict is handled by upsert), for other DB errors delete the Cloudinary asset (compensating action) and return error.

## Acceptance Criteria
- [ ] Endpoint returns 200 with valid schema when both Cloudinary and Supabase succeed.
- [ ] On DB error (other than conflict handled by upsert), function deletes the Cloudinary asset and returns 500.
- [ ] Upsert path avoids duplicates via `UNIQUE(team_id, location_id)` and returns success.
- [ ] Logs include `requestId` and `idempotencyKey` on every invocation.
- [ ] Size and content-type validation align with current `photo-upload.js`.

## Technical Notes
- Reuse `netlify/functions/_lib/supabaseClient.js` for DB operations.
- Keep CommonJS style requires for Netlify runtime consistency.
- Mirror CORS handling from existing function.
- Determine `team_id` server-side based on current team context (from login/session) to target the correct `hunt_progress` row.

## Tasks
- [ ] Scaffold new function file with request parsing and validation.
- [ ] Implement Cloudinary upload (stream) with `public_id` based on `idempotencyKey`.
- [ ] Implement post-upload verification.
- [ ] Implement Supabase upsert into `hunt_progress` (set `photo_url`, `done`, `completed_at`) and compensation on failure.
- [ ] Add robust error mapping (400/413/500/503/504).
