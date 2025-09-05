Phase 7 — Server/Functions Parity and Shared Contracts

Objective
- Keep client and server in sync, share helpers, and ensure single-origin dev parity.

Changes
- src/server/utils/: extract slugify, buildCloudinaryMeta, idempotent upload helpers for reuse across Express and Netlify Functions.
- src/types/: colocate shared request/response interfaces and zod schemas.
- Ensure Netlify Functions equivalents exist for /upload-photo and /collage/from-ids using same helpers.

Acceptance Criteria
- Client works identically against Express or Netlify Functions under netlify dev (no CORS issues).
- Shared code eliminates drift and duplication.

Manual Verification
- Run netlify dev; verify uploads/collage from the UI. Check Cloudinary assets and tags.
