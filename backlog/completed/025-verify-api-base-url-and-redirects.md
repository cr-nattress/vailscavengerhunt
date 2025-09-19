# Phase 25: Verify API Base URL and Netlify Redirects

## Summary
Ensure the client resolves `/api` correctly in production and all Netlify redirects map to the intended functions, preventing intermittent 404/405.

## Why
- `src/services/apiClient.ts` uses `/api` in production. Misconfigured redirects can break function calls.
- Clear verification steps reduce post-deploy surprises.

## Scope
- Confirm `VITE_API_URL` is unset (or `/api`) in production.
- Audit `netlify.toml` redirects ordering and patterns.
- Validate all endpoints in a quick checklist.

## Acceptance Criteria
- Production calls use `/api` and reach functions (`200/404` as expected by route).
- No SPA fallback (`/* -> /index.html`) intercepts API requests.

## Steps
1. Check `src/services/apiClient.ts` → `resolveApiBase()` and production behavior.
2. In `netlify.toml`, verify these exist before SPA fallback:
   - `/api/photo-upload` → `/.netlify/functions/photo-upload`
   - `/api/settings/*` → `/.netlify/functions/settings-get`/`settings-set`
   - `/api/progress/*` → `/.netlify/functions/progress-get`/`progress-set`
   - `/api/kv/*` → `/.netlify/functions/kv-*`
3. Deploy to a preview and test each endpoint with curl or the diagnostics page.

## Rollback Plan
- If needed, set `VITE_API_URL=/api` explicitly in Netlify env and redeploy.
