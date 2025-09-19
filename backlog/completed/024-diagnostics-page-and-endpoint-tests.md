# Phase 24: Diagnostics Page and API Endpoint Tests

## Summary
Create a simple diagnostics page that verifies connectivity to all critical Netlify Functions and surfaces status (green/red) with minimal payload. Useful for post-deploy validation and support.

## Why
- Quickly determine if routing, functions, and storage are wired correctly in the deployed environment.
- Reduce time to resolution on incidents.

## Scope
- A React route (e.g., `/diagnostics`) that:
  - Calls `/api/health`.
  - Tests: `/api/settings/<org>/<team>/<hunt>` (GET, POST dry run), `/api/progress/<org>/<team>/<hunt>` (GET, POST dry run), `/api/kv/list?prefix=...`, `/api/kv/upsert` (dry run key under `diagnostics/`).
  - Optionally pings `/api/photo-upload` with a tiny embedded image (toggle via UI, disabled by default).
- Show results with timestamps and request IDs (if present).

## Acceptance Criteria
- Visiting `/diagnostics` shows pass/fail for each endpoint with short details.
- Does not leak secrets or large payloads.

## Steps
1. Add `/diagnostics` React page.
2. Implement calls with timeouts (5–8s) and show per-endpoint result.
3. Add a toggle to run a tiny test upload (1x1 PNG) to `/api/photo-upload`.
4. Document how to use the page post-deploy.

## Rollback Plan
- Remove the route if it inadvertently exposes sensitive details.
