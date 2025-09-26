# STORY-CONSO-RANKINGS: Rankings Tab Consolidated Endpoint

- Type: Story
- Epic: EPIC-CONSO-FNS
- Status: Planned
- Owner: Backend
- Created: 2025-09-26

## Summary
Create a consolidated GET endpoint that returns all data needed by the Rankings tab in one request.

## Endpoint
- GET `/api/consolidated/rankings?orgId={orgId}&huntId={huntId}`

## Acceptance Criteria
- Returns HTTP 200 with JSON payload including:
  - `orgId`, `huntId`
  - `rankings` data (mirrors `leaderboard-get.js` output including `teams`, `rank`, and `lastUpdated`)
  - `config` with safe environment values (mirrors `public-config.js`)
- CORS headers present, supports `GET, OPTIONS`.
- No changes to existing endpoints.

## Notes
- Reuse logic from `netlify/functions/leaderboard-get.js` for computation.
- Consider org/hunt query filtering with safe defaults.
