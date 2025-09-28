# Epic: Server-side Photo Upload Orchestration (Saga + Idempotency)

## Overview
Implement a robust, server-side orchestrated photo upload pipeline that eliminates partial failures, ensures idempotency, and provides observability. The system will:

- Upload photos to Cloudinary.
- Mark the appropriate dates (e.g., set `completed_at` and `done = true` when an upload marks a stop complete).
- Use a Saga with a compensating action to remove the Cloudinary asset if the `hunt_progress` write fails.
- Be idempotent across retries using a stable key.
- Include retries with exponential backoff and a lightweight circuit breaker.
- Expose a new Netlify Function endpoint and wire it to the existing UI.

## Current State (as of this epic)
- Client posts multipart/form-data directly to `/.netlify/functions/photo-upload` via `PhotoUploadService.uploadPhoto()`.
- Server uploads to Cloudinary and returns success. There is no `hunt_progress` write or compensation.
- Supabase utilities exist in `netlify/functions/_lib/supabaseClient.js` with retry helpers.

## Goals
- Single orchestrated endpoint with Saga semantics.
- Idempotent uploads using a stable key propagated through Cloudinary, deduplicated at `hunt_progress` via upsert on `UNIQUE(team_id, location_id)`.
- Safe retries and resilient behavior during transient provider issues.
- Stronger telemetry for production verification and incident debugging.

## Scope
- Server-side orchestration in a new Netlify Function that uploads to Cloudinary, verifies the asset, then upserts `hunt_progress` with `photo_url`, `done`, and `completed_at`. On DB failure, compensates by deleting the Cloudinary asset.
- Idempotency via a client-generated `idempotencyKey` used in Cloudinary `public_id`; deduplication at Supabase by upsert on `(team_id, location_id)`.
- Resilience: retries with exponential backoff and a lightweight circuit breaker around Cloudinary and Supabase segments.
- Telemetry: structured logs including `requestId`, `idempotencyKey`, and `hunt_progress` targets; sanitized error reporting.
- Cloudinary metadata enrichment: send `location_id`, `completed_at`, `hunt_name`, `organization_name`, `location_title`, `session_id`, `team_name` and include `idempotency_key` in context and tags.

## Out of Scope
- Creating a new `photos` table (we will use `hunt_progress`).
- Webhook-based direct-to-Cloudinary flow (can be revisited in a separate epic/story).

## Success Metrics
- 0 orphaned Cloudinary assets after failures (verified by periodic audits).
- Duplicate prevention: repeated retries do not create duplicate `hunt_progress` rows.
- P95 upload success rate improved during transient incidents due to retries.

## Related Files/Areas
- Client: `src/client/PhotoUploadService.ts`
- Server: `netlify/functions/`
- Supabase SQL: `scripts/sql/` (e.g., `supabase-schema-safe.sql` defines `hunt_progress`)
- Netlify config: `netlify.toml`

## Stories in this Epic
- [STORY-001-orchestrated-endpoint.md] Orchestrated Netlify Function: Cloudinary upload → verify → upsert `hunt_progress` (set `photo_url`, `done`, `completed_at`) → compensate on failure.
- [STORY-002-sql-migration.md] Ensure `hunt_progress` has required columns/indexes (idempotent migration script if needed).
- [STORY-003-idempotency-and-dedup.md] Client idempotency key; upsert on `(team_id, location_id)` for deduplication.
- [STORY-004-retries-and-circuit-breaker.md] Retries with backoff and circuit breaker for Cloudinary and Supabase segments.
- [STORY-005-telemetry-and-observability.md] Structured logs and correlation IDs; record which `hunt_progress` fields were updated.
- [STORY-008-e2e-and-load-tests.md] E2E happy path, compensation path, idempotency, and load smoke tests.
- [STORY-009-rollout-and-ops.md] Canary plan and operations runbook.
- [STORY-010-cloudinary-metadata.md] Enrich Cloudinary metadata/context with hunt/location/session/team details.
