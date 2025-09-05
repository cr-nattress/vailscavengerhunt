# Phase 7 — Server/Functions Parity and Shared Contracts

Goal: Unify server and function logic and share validation/types.

Instructions
1) Create src/server/utils/ with:
   - slug.ts (slugify)
   - cloudinaryMeta.ts (buildCloudinaryMeta)
   - uploadIdempotent.ts (deterministic public_id + explicit upsert on conflict)

2) Create src/types/shared.ts and src/types/schemas.ts (zod):
   - UploadMeta, UploadResponse, CollageFromIdsResponse

3) Update Express routes and Netlify Functions to import from server/utils and types/schemas to avoid divergence.

4) If not present, add netlify/functions/upload-photo.ts and collage-from-ids.ts with CORS handling similar to kv-upsert.ts, supporting JSON base64 uploads.

## Parity checks (Express vs Functions)
- Upload the same image with the same metadata via:
  1) Express endpoint `/api/upload-photo`
  2) Functions endpoint `/.netlify/functions/upload-photo`
- Normalize responses and assert equality for:
  - `public_id`, `secure_url` (or equivalent), `folder`, `tags[]`, `context{}`
- Duplicate upload yields identical `public_id` in both environments (idempotency).
- `POST /collage/from-ids` produces identical transformation URL from both backends.

## Integration tests (optional but recommended)
- Add a small script (Node or Vitest integration) to:
  - POST to Express and Functions with the same base64 payload and metadata.
  - Compare normalized JSON responses and print a diff if they diverge.

## Manual verification checklist
1) Run `netlify dev` (port 8888). Point client to Functions by ensuring `apiClient` resolves to `/.netlify/functions`.
2) Upload an image twice; confirm idempotency and metadata in Cloudinary.
3) Create a collage from existing IDs; confirm URL identical to Express result.
4) Deploy to Netlify and repeat the same checks on the production URL.

## Commands
- `netlify dev` — single-origin development.
- `npm run dev` — app against Functions under port 8888.
- Deploy and test: `netlify deploy --prod` (if configured) then validate endpoints.

Verification
- netlify dev: UI works fully against functions. Deployed site behaves identically.
