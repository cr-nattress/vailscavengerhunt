# STORY-004: Migrate Settings Storage to Supabase

## Story Details
**Epic:** EPIC-001 (Blob to Supabase Migration)
**Priority:** HIGH
**Status:** NOT STARTED
**Estimated:** 1 day
**Dependencies:** STORY-000

## Context
Settings are currently stored in Netlify Blobs by `netlify/functions/settings-set.js` and read by `netlify/functions/settings-get.js`. In dev, the UI now targets the Netlify Functions endpoints directly via `ServerSettingsService` when `import.meta.env.DEV` is true.

Files:
- `netlify/functions/settings-set.js`
- `netlify/functions/settings-get.js`
- `src/services/ServerSettingsService.ts`

## User Story
**As a** developer
**I want to** store team settings in Supabase instead of Netlify Blobs
**So that** settings are queryable, auditable, and consistent with the rest of our data

## Acceptance Criteria
- [ ] `settings-set.js` writes to a Supabase `team_settings` table (or JSONB column) instead of Blobs.
- [ ] `settings-get.js` reads from Supabase instead of Blobs.
- [ ] Endpoint shapes remain backward compatible (paths and JSON payloads unchanged).
- [ ] Development client (`ServerSettingsService`) continues to function without code changes to callers.
- [ ] Graceful handling of missing records (404 on GET when not found).
- [ ] E2E tests cover write then read flow and validate unchanged behavior.
- [ ] No Blob writes remain in these functions (verify via grep for `@netlify/blobs` and `setJSON|set`).

## Verification Steps
- [ ] Run `npm run start:netlify` and POST to `/.netlify/functions/settings-set/{orgId}/{teamId}/{huntId}`; expect 200.
- [ ] GET `/.netlify/functions/settings-get/{orgId}/{teamId}/{huntId}`; expect previously stored JSON.
- [ ] Turn on/off dev mode; ensure `ServerSettingsService` works in both dev and prod paths.
- [ ] Search codebase for `@netlify/blobs` references in settings functions and confirm removal.
