# Story 010: Enrich Cloudinary Metadata on Upload

## Summary
Send rich, normalized metadata to Cloudinary for every photo upload performed by the orchestrated endpoint. This metadata must include the following fields derived from our domain:

- `hunt_progress.location_id`
- `hunt_progress.completed_at`
- `hunt.name`
- `organization.name`
- `location.title`
- `settings.sessionId`
- `settings.teamName`

## Details
- Source of truth and resolution (server-side in Netlify Function):
  - Resolve `team_id`, `hunt_id`, `org_id` from the authenticated/team context used elsewhere in functions (e.g., settings and progress functions).
  - `location_id` should be provided by the client explicitly; compute `locationSlug` for asset organization only.
  - Query Supabase to fetch:
    - `hunt.name` from `hunts` by `(organization_id, id)`.
    - `organization.name` from `organizations` by `id`.
    - `location.title` from your locations source (config or table); if not centrally stored, pass the client-provided `locationTitle` as `location.title`.
  - Use current operation timestamp for `hunt_progress.completed_at` when the upload marks a completion.
  - Obtain `settings.sessionId` and `settings.teamName` from the current settings/context (e.g., the login initialize path or saved settings service) and/or client-supplied fields.

- Cloudinary payload conventions:
  - Place values in the `context` map so they are queryable and visible in the Cloudinary console.
  - Keys to use (flat, kebab-case or snake_case to avoid collisions):
    - `location_id`
    - `completed_at`
    - `hunt_name`
    - `organization_name`
    - `location_title`
    - `session_id`
    - `team_name`
  - Also include the `idempotencyKey` in `context.idempotency_key` and as a tag.
  - Tags should include: `scavenger-hunt`, `org:{org_id}`, `hunt:{hunt_id}`, `team:{team_id}`, `loc:{location_id}` (mind Cloudinary tag length limits).

- Data quality and safety:
  - Truncate any field exceeding Cloudinary context limits (recommend < 1000 chars per value; practical limit lower).
  - Sanitize characters to avoid commas/pipes if we ever use delimited context strings elsewhere.
  - Ensure timestamps are ISO-8601 (`toISOString()`).

- Orchestrated flow interaction:
  - Populate Cloudinary metadata during the same upload API call that uses the `public_id` with the `idempotencyKey`.
  - After successful upload, upsert to `hunt_progress` with `photo_url`, `done = true`, `completed_at`.
  - If the DB upsert fails (non-conflict), perform compensating `destroy(public_id)`.

- Telemetry:
  - Log the exact set of metadata fields sent to Cloudinary (keys only, with redacted/shortened values for PII/length).
  - Include `requestId`, `idempotencyKey`, and any Cloudinary request-id in logs.

## Acceptance Criteria
- [ ] Orchestrated endpoint sets Cloudinary `context` with the required fields: `location_id`, `completed_at`, `hunt_name`, `organization_name`, `location_title`, `session_id`, `team_name`, plus `idempotency_key`.
- [ ] Metadata values are sanitized, truncated where necessary, and ISO-8601 for timestamps.
- [ ] Tags include organization, hunt, team, and location identifiers for easy grouping.
- [ ] Telemetry logs show the presence of these fields without leaking PII or overlong strings.

## Tasks
- [ ] Resolve org/hunt/team context server-side (reuse existing helpers/services).
- [ ] Fetch `hunt.name` and `organization.name` from Supabase.
- [ ] Map client-provided `locationTitle` to `location_title`; pass canonical `location_id` from client.
- [ ] Add the context map and tags to Cloudinary `upload_stream` options in `photo-upload-orchestrated`.
- [ ] Add structured logging for the metadata keys and success/failure outcomes.
