# STORY-CONSO-ACTIVE: Active Tab Consolidated Endpoint

- Type: Story
- Epic: EPIC-CONSO-FNS
- Status: Planned
- Owner: Backend
- Created: 2025-09-26

## Summary
Create a consolidated GET endpoint that returns all data needed by the Active tab in one request.

## Endpoint
- GET `/api/consolidated/active/{orgId}/{teamId}/{huntId}`

## Acceptance Criteria
- Returns HTTP 200 with JSON payload including:
  - `orgId`, `teamId`, `huntId`
  - `settings` (from Supabase `hunt_settings.settings`)
  - `progress` (from Supabase `hunt_progress` via `SupabaseTeamStorage`)
  - `sponsors` array and `layout` (from Supabase `sponsor_assets` and config)
  - `config` with safe environment values (mirrors `public-config.js`)
- CORS headers present, supports `GET, OPTIONS`.
- No changes to existing endpoints.

## Notes
- Use shared libs under `netlify/functions/_lib/`.
- Follow patterns in `settings-get.js`, `progress-get.js`, and `sponsors-get.js` for parsing and data access.
