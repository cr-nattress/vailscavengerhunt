# Phase 19: Standardize KV Store Name in Netlify Functions

## Summary
Align the blob store name used by `kv-get` with the configured stores in `netlify.toml` to prevent intermittent read failures in production.

## Why
- `netlify/functions/kv-get.js` uses `process.env.NETLIFY_BLOBS_STORE_NAME || 'vail-hunt-state'` which is not defined in `netlify.toml`.
- Other KV functions (`kv-upsert.js`, `kv-list.js`) use `getStore('kv')` which matches `[[blobs]] name = "kv"` in `netlify.toml`.
- Mismatch leads to writes going to `kv` but reads attempting `vail-hunt-state` and failing.

## Scope
- Update `kv-get.js` to use `getStore({ name: 'kv' })`.
- Optional: set `NETLIFY_BLOBS_STORE_NAME=kv` in Netlify env if you prefer env-driven configuration.
- Verify end-to-end KV upsert/get/list in production.

## Acceptance Criteria
- `kv-get` reads keys written by `kv-upsert` in production deploys.
- No 404/500 from `kv-get` due to store misconfiguration.

## Steps
1. Edit `netlify/functions/kv-get.js`:
   - Replace current `getStore({...})` call with `getStore({ name: 'kv' })`.
2. Redeploy to Netlify.
3. Verify:
   - POST `/api/kv/upsert` with a test key/value.
   - GET `/api/kv/get/<key>` returns the value.
   - GET `/api/kv/list?prefix=<prefix>` lists the key.

## Rollback Plan
- Revert the file change to the previous commit if needed.
