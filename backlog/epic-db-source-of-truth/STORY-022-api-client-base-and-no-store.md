# STORY-022: Client Networking: API base and no-store headers

- Epic: DB-Only Source of Truth
- Owner: Web Client
- Status: Proposed

## Description
Ensure the client uses `/api` (Netlify Dev or production) or env override to target functions locally. Add request headers for `Cache-Control: no-store` when calling locations/progress endpoints.

## Acceptance Criteria
- `VITE_USE_NETLIFY_API=true` or `VITE_API_BASE=/api` respected.
- Requests to locations/progress include `Cache-Control: no-store` (optional but recommended).

## Tasks
- Verify and document `src/services/apiClient.ts` behavior.
- Add optional header injection for sensitive endpoints.

## Testing
- Manual validation in Netlify Dev and plain dev with overrides.
