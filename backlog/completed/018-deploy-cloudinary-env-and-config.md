# Phase 18: Configure Cloudinary for Production Uploads

## Summary
Set and verify required Cloudinary environment variables for production deploys on Netlify to eliminate image upload failures. Ensure function-side configuration is correct and safe.

## Why
- `netlify/functions/photo-upload.js` requires `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
- Missing credentials cause 500 errors in production and failed image uploads.

## Scope
- Netlify Site settings: add environment variables.
- Document optional `CLOUDINARY_UPLOAD_FOLDER`.
- Smoke test the `/api/photo-upload` endpoint post-deploy.

## Acceptance Criteria
- Cloudinary env vars are set in Netlify and available at runtime.
- Uploading a 3–5 MB image succeeds from production site.
- Function logs show successful Cloudinary upload with a public_id.

## Steps
1. Add Netlify env vars (Site settings → Environment):
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
   - Optional: `CLOUDINARY_UPLOAD_FOLDER` (default: `scavenger/entries`)
2. Redeploy site.
3. Validate by uploading a photo from the UI and checking function logs.

## Rollback Plan
- Revert the deploy if a secret was misconfigured.
- Clear/reissue Cloudinary credentials if compromised.
