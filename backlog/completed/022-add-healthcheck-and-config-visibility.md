# Phase 22: Health Check and Configuration Visibility

## Summary
Add a lightweight health check endpoint and a minimal public page to verify backend availability and critical configuration presence without exposing secrets.

## Why
- Quickly validate production environment after deploys.
- Reduce time to diagnose misconfigurations (e.g., missing Cloudinary vars) without revealing sensitive values.

## Scope
- Serverless function `/api/health` returns `{ status: 'ok' }` and booleans for presence of critical env vars (not values).
- Optional minimal UI page (e.g., `/health`) that calls `/api/health` and displays green/red indicators for:
  - Cloudinary config present
  - Netlify Blobs stores accessible
  - Settings/progress endpoints reachable

## Acceptance Criteria
- Navigating to `/health` shows green checks for all configured services when healthy.
- `/api/health` never returns secret values.

## Steps
1. Create Netlify Function `health.js`:
   - Check presence of `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (booleans only).
   - Attempt a quick `getStore({ name: 'kv' })` and `getStore({ name: 'hunt-data' })` access.
   - Return JSON summary `{ status: 'ok', cloudinary: { cloudName: true, apiKey: true, apiSecret: true }, blobs: { kv: true, huntData: true } }`.
2. Add redirect in `netlify.toml` for `/api/health` if needed.
3. Optional: Add `/health` React page that fetches `/api/health` and displays results.

## Rollback Plan
- Remove the health page/function if it reveals any unintended details.
