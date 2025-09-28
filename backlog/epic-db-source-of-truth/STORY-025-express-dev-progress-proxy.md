# STORY-025: Express Dev: Remove in-memory progress; proxy to functions

- Epic: DB-Only Source of Truth
- Owner: Backend (Dev server)
- Status: Proposed

## Description
Eliminate any in-memory progress storage/routes in the Express dev server. Either disable these routes or proxy them to the Netlify functions.

## Affected Files
- `src/server/progressRoute.ts`

## Acceptance Criteria
- No in-memory stores or divergent writes.
- Dev server behavior matches production (via functions) or is disabled.

## Tasks
- Replace handlers with proxies or remove them.
- Add a startup warning if dev server is used for progress.

## Testing
- Local runs use Netlify Dev, or requests proxy to functions consistently.
