# STORY-020: Client: DB-only for locations/progress (no local cache)

- Epic: DB-Only Source of Truth
- Owner: Web Client
- Status: Proposed

## Description
Remove or disable all reads/writes of locations/progress to localStorage or any persistent client cache utilities. Ensure all interactions use API endpoints that hit the database via Netlify Functions.

## Affected Files
- `src/client/LocalStorageService.js`
- `src/client/HybridStorageService.js`
- Hooks/services that read/write locations/progress

## Acceptance Criteria
- No code writes locations/progress to localStorage.
- No code reads locations/progress from localStorage or hybrid caches.
- App continues to function by reading from API.

## Tasks
- Remove usage of LocalStorageService/HybridStorageService for these domains.
- Update hooks/services to fetch via `/api/*` endpoints.
- Manual audit of references with search.

## Testing
- Unit tests to assert no localStorage calls for these domains.
- Manual/automated checks on first load and after updates.
