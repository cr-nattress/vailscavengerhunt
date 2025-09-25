# STORY-007: Migrate Leaderboard to Supabase

## Story Details
**Epic:** EPIC-001 (Blob to Supabase Migration)
**Priority:** HIGH
**Status:** NOT STARTED
**Estimated:** 1 day
**Dependencies:** STORY-000

## Context
`netlify/functions/leaderboard-get.js` reads team progress from Netlify Blobs (`vail-hunt-state`) to compute rankings. Progress is now available in Supabase (`hunt_progress`, `teams`). We should source leaderboard data from Supabase to remove blob dependency and enable richer queries.

Files:
- `netlify/functions/leaderboard-get.js`

## User Story
**As a** user
**I want to** see the leaderboard computed from Supabase data
**So that** it’s accurate, queryable, and not dependent on blob storage

## Acceptance Criteria
- [ ] Leaderboard data is computed from Supabase tables (e.g., `teams`, `hunt_progress`).
- [ ] Query supports filtering by `orgId` and `huntId` (same request parameters as today).
- [ ] API response shape remains unchanged for the caller (ranked team list with percent complete and latest activity).
- [ ] Performance is acceptable (≤ 250ms locally; add appropriate indexes if needed).
- [ ] No reads from Netlify Blobs remain in this function.
- [ ] Unit/E2E tests validate the same scenarios used today.

## Verification Steps
- [ ] Call `/.netlify/functions/leaderboard-get?orgId=bhhs&huntId=fall-2025` and verify data matches expectations when compared to the current blob-based output.
- [ ] Grep for `@netlify/blobs` in `leaderboard-get.js` to confirm removal.
