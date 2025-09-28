# STORY-026: Locations Helper: Verify DB-only sourcing

- Epic: DB-Only Source of Truth
- Owner: Backend (Functions)
- Status: Proposed

## Description
Confirm `netlify/functions/_lib/locationsHelper.js` reads locations exclusively from Supabase `kv_store` and returns no mock/file-based data. Add headers in the functions that serve this data.

## Acceptance Criteria
- Only DB paths used.
- Response headers set via calling function.

## Tasks
- Audit helper and calling functions.
- Ensure proper error handling and no fallback data.

## Testing
- Simulate empty DB and verify empty results, not fallback data.
