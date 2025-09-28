# Story 005: Telemetry and Observability

## Summary
Add correlation IDs and external request IDs to logs for production verification and incident debugging. Capture context around the `hunt_progress` upsert, including which fields were targeted (e.g., `photo_url`, `done`, `completed_at`).

## Details
- Always log `requestId` and `idempotencyKey`.
- Capture Cloudinary request id if available; include in logs.
- Ensure errors sanitize sensitive config details.
- Surface `requestId` back to client on failures for support.
 - Log the target `team_id` and `location_id` used for the `hunt_progress` upsert (do not log PII).

## Acceptance Criteria
- [ ] All server logs for uploads include `requestId` and `idempotencyKey`.
- [ ] Client receives `requestId` on error responses.
- [ ] No secrets appear in logs.
 - [ ] Logs indicate `hunt_progress` upsert targets and whether `photo_url`, `done`, and `completed_at` were updated.

## Tasks
- [ ] Add structured logging objects at key steps.
- [ ] Map error types to HTTP codes consistently.
- [ ] Add basic log sampling if verbosity is high.
 - [ ] Include summarized `hunt_progress` upsert outcome (updated vs inserted) without exposing raw row data.
