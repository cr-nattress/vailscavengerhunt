# STORY-006: Migrate Team Storage (Team Data + Code Mappings) to Supabase

## Story Details
**Epic:** EPIC-001 (Blob to Supabase Migration)
**Priority:** HIGH
**Status:** NOT STARTED
**Estimated:** 1 day
**Dependencies:** STORY-000

## Context
`netlify/functions/_lib/teamStorage.js` stores team code mappings ("table store") and team data ("blob store") in Netlify Blobs. We want to move both to Supabase to enable queries, auditing, and transactions.

Files:
- `netlify/functions/_lib/teamStorage.js`
- `netlify/functions/team-verify.js` (calls into team storage indirectly)

## User Story
**As a** developer
**I want to** persist team code mappings and team data in Supabase
**So that** we can reliably query, audit, and maintain data without blob storage

## Acceptance Criteria
- [ ] A Supabase table for team code mappings (e.g., `team_mappings`) exists with columns for `row_key`, `team_id`, `team_name`, `is_active`, and org/hunt scoping.
- [ ] A Supabase table (or JSONB column) for team data exists (e.g., `teams` or `team_data`) to store the current shape persisted by Blobs.
- [ ] `TeamStorage` reads/writes from Supabase instead of Netlify Blobs, including ETag/optimistic concurrency behavior using updated_at and conditional updates.
- [ ] All public API shapes remain the same to callers (no breaking changes to `team-verify.js`).
- [ ] No references to `@netlify/blobs` remain in `teamStorage.js`.
- [ ] Unit tests cover: create, read, update with ETag check, and code mapping lookups.

## Verification Steps
- [ ] Run Netlify dev, create a team via `team-verify` happy path; assert persisted records in Supabase.
- [ ] Update team data via an operation (e.g., progress), ensure ETag/updated_at is respected.
- [ ] Grep `teamStorage.js` for `@netlify/blobs` and confirm removal.
