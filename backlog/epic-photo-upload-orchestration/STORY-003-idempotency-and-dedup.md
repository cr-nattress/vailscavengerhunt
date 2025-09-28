# Story 003: Idempotency and Deduplication

## Summary
Ensure uploads are idempotent across client and server retries by combining a stable client key with server-side upsert into `hunt_progress`.

## Details
- Client computes `idempotencyKey` from SHA-256(file bytes + sessionId + locationTitle), or falls back to `crypto.randomUUID()`; include in request for logging and Cloudinary `public_id` stability.
- Server trusts provided key or computes a fallback if missing.
- Cloudinary uses `public_id` containing the key and sets context `idempotencyKey`.
- Supabase deduplication: upsert `hunt_progress` on `(team_id, location_id)` uniqueness so repeated retries update the same row instead of inserting duplicates.

## Acceptance Criteria
- [ ] Duplicate client retries with the same file and metadata do not create duplicate `hunt_progress` rows or Cloudinary assets.
- [ ] Server logs show the same `idempotencyKey` across retries.
- [ ] Upsert path returns 200 with the same response shape.

## Tasks
- [ ] Client: add key computation helper and include in FormData to orchestrated endpoint.
- [ ] Server: enforce/compute key and apply to Cloudinary `public_id`; use Supabase upsert on `(team_id, location_id)`.
- [ ] Ensure response is stable across retries.
