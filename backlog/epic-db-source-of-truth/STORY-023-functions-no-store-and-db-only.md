# STORY-023: Functions: Add no-store headers and confirm DB-only

- Epic: DB-Only Source of Truth
- Owner: Backend (Functions)
- Status: Proposed

## Description
Ensure progress and locations functions return `Cache-Control: no-store` and only access Supabase (no KV/Blobs fallbacks for these domains).

## Affected Files
- `netlify/functions/progress-get-supabase.js`
- `netlify/functions/progress-set-supabase.js`
- `netlify/functions/consolidated-active.js`
- `netlify/functions/consolidated-history.js`
- `netlify/functions/consolidated-updates.js`

## Acceptance Criteria
- Responses include `Cache-Control: no-store`, `Pragma: no-cache`, `Expires: 0`.
- Code paths read/write DB only.

## Tasks
- Add headers.
- Quick code audit for non-DB paths.

## Testing
- Hit endpoints and verify headers and behavior.
