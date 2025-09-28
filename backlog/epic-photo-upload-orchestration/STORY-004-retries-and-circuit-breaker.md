# Story 004: Retries and Circuit Breaker

## Summary
Add resilient behavior for external calls with retries and a lightweight circuit breaker.

## Details
- Retries with exponential backoff:
  - Cloudinary upload: up to 3 attempts with 500ms, 1000ms, 2000ms delays.
  - Cloudinary verify resource: up to 3 attempts.
  - Supabase upsert to `hunt_progress`: use existing `executeWithRetry` helper.
- Circuit breaker:
  - Track failures per provider in a 60s window. If >= 5, open for 30s.
  - Log OPEN/HALF_OPEN/CLOSED transitions.
  - When open, return 503 with retry-after.

## Acceptance Criteria
- [ ] Transient network failures are automatically retried.
- [ ] When providers are flaking, the circuit opens and subsequent requests fail fast.
- [ ] Logs clearly indicate retry attempts and breaker state changes.

## Tasks
- [ ] Implement a small breaker module inside the function.
- [ ] Wrap Cloudinary segments and the `hunt_progress` upsert with breaker checks and retry helpers.
- [ ] Add structured logs for attempts and states.
