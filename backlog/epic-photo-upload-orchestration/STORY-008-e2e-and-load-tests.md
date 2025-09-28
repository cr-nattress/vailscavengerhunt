# Story 008: E2E and Load Tests

## Summary
Add tests to validate the orchestration end-to-end and its behavior under retries and partial failures.

## Details
- E2E test uploads a small image and asserts a `hunt_progress` row exists for the target `(team_id, location_id)` and a Cloudinary asset exists.
- Simulate DB failure to assert compensation deletes the Cloudinary asset.
- Idempotency test: retry same request; ensure upsert updates the same `hunt_progress` row without duplicates.
- Load smoke test: small burst to confirm breaker behavior and no memory leaks.

## Acceptance Criteria
- [ ] E2E happy-path test passes in CI and verifies `hunt_progress.photo_url` is set, `done = true`, and `completed_at` is populated.
- [ ] Compensation test passes.
- [ ] Idempotency test passes and confirms only one `hunt_progress` row for `(team_id, location_id)`.
- [ ] Load smoke test executes without errors.

## Tasks
- [ ] Add tests under `tests/e2e/netlify-functions/`.
- [ ] Add a mock or toggle to induce Supabase failure for testing.
- [ ] Document how to run locally.
