# STORY-005: Migrate Device Locks to Supabase

## Story Details
**Epic:** EPIC-001 (Blob to Supabase Migration)
**Priority:** HIGH
**Status:** NOT STARTED
**Estimated:** 1 day
**Dependencies:** STORY-000

## Context
`netlify/functions/team-verify.js` uses Netlify Blobs store `device-locks` to issue and validate device locks during team verification.

Files:
- `netlify/functions/team-verify.js`

## User Story
**As a** system
**I want to** store device locks in Supabase with TTL/cleanup
**So that** we can query and enforce locks reliably and avoid reliance on blob storage

## Acceptance Criteria
- [ ] A Supabase table (e.g., `device_locks`) exists with indexes by `device_fingerprint` and TTL/cleanup strategy.
- [ ] `team-verify.js` reads/writes locks from Supabase instead of Netlify Blobs.
- [ ] Lock issuance and conflict detection logic remains unchanged from the caller’s perspective.
- [ ] Expired locks are ignored; old locks are cleaned up on write or via a scheduled job.
- [ ] E2E tests verify: issue, block-conflict, allow-same-team, expire-unblock.
- [ ] No references to `@netlify/blobs` remain for device locks.

## Verification Steps
- [ ] Simulate a verification flow creating a lock; assert a 200 with lock token.
- [ ] Attempt second verification from a different team/device; assert conflict response and TTL.
- [ ] Advance clock or force-expire and retry; assert success.
- [ ] Grep for `@netlify/blobs` in `team-verify.js` to confirm removal.
