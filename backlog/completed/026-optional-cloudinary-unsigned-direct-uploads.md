# Phase 26 (Optional): Cloudinary Unsigned Direct Uploads

## Summary
Explore switching to (or adding a fallback for) direct unsigned uploads to Cloudinary from the browser using a locked-down upload preset. This can reduce server function load and avoid Netlify request size/time limits for very large images.

## Why
- Offloads file transfer directly to Cloudinary’s CDN.
- Mitigates Netlify function timeouts and body size limits.
- Can simplify server function responsibilities to metadata recording only.

## Scope
- Create a Cloudinary Upload Preset (unsigned) with strict restrictions:
  - Allowed formats: images only
  - Max file size (e.g., 10–15 MB)
  - Restricted folder, optional moderation
- Client: add a code path to POST file directly to Cloudinary unsigned endpoint.
- Server: optionally validate and record upload metadata (public_id, secure_url) via an API call to `/api/kv/upsert` or a dedicated endpoint.

## Acceptance Criteria
- When enabled by feature flag, uploads bypass Netlify function and go directly to Cloudinary.
- Successful uploads return `public_id` and `secure_url` and are recorded in app state as today.
- Feature can be toggled by env flag without code changes.

## Steps
1. Cloudinary Dashboard → Settings → Upload → Add unsigned Upload Preset:
   - Restrict to images, set max size, set target folder (e.g., `scavenger/entries`)
   - Note the preset name (e.g., `unsigned_scavenger_upload`)
2. Add env flags in Netlify/`.env`:
   - `VITE_CLOUDINARY_UNSIGNED_PRESET=<preset_name>`
   - `VITE_ENABLE_UNSIGNED_UPLOADS=false` (default)
3. Client changes:
   - Add `PhotoUploadService.uploadPhotoUnsigned(file, meta)` which:
     - Builds a `FormData` with `file`, `upload_preset`, and metadata (context/tags when applicable)
     - POSTs to `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`
   - In UI, if `VITE_ENABLE_UNSIGNED_UPLOADS==='true'`, call `uploadPhotoUnsigned` instead of the Netlify function.
4. Server/Storage:
   - After client gets `public_id` and `secure_url`, call `/api/kv/upsert` (or a dedicated endpoint) to persist a small record referencing the image.
5. QA:
   - Verify direct upload works on mobile and desktop.
   - Confirm limits are enforced by preset.

## Rollback Plan
- Set `VITE_ENABLE_UNSIGNED_UPLOADS=false` to revert to function-based upload.
