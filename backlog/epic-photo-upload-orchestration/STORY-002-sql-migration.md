# Story 002: Validate/Adjust hunt_progress Schema

## Summary
Ensure the existing `hunt_progress` table supports attaching uploaded images and marking completion. No new `photos` table will be created.

## Details
- Table: `hunt_progress` (already exists per `scripts/sql/supabase-schema-safe.sql`)
- Required columns and constraints (verify and add if missing):
  - `photo_url` TEXT (stores Cloudinary secure URL)
  - `done` BOOLEAN (mark stop completion)
  - `completed_at` TIMESTAMPTZ (set when upload marks completion)
  - `UNIQUE(team_id, location_id)` for deduplication
  - Indexes on `(team_id)` and `(location_id)` for query performance (already present in safe schema)
- Optional indexes (add if needed):
  - Partial index on `done` to speed up completion queries

## Acceptance Criteria
- [ ] A migration file exists that is a no-op if schema already matches (idempotent).
- [ ] Running the script ensures `photo_url`, `done`, `completed_at`, and constraints/indexes are present.
- [ ] Re-running the script is safe.

## Tasks
- [ ] Create `scripts/sql/ensure-hunt-progress-for-uploads.sql` to add missing columns/indexes IF NOT EXISTS.
- [ ] Document how to run this migration in `docs/`.
