# STORY-CONSO-UPDATES: Updates Tab Consolidated Endpoint

- Type: Story
- Epic: EPIC-CONSO-FNS
- Status: Planned
- Owner: Backend
- Created: 2025-09-26

## Summary
Create a consolidated GET endpoint that returns all data needed by the Updates tab in one request.

## Endpoint
- GET `/api/consolidated/updates/{orgId}/{teamId}/{huntId}`

## Acceptance Criteria
- Returns HTTP 200 with JSON payload including:
  - `orgId`, `teamId`, `huntId`
  - `settings` (from Supabase `hunt_settings.settings`)
  - `updates` list summarizing recent activity (derived from `hunt_progress` entries with timestamps and photos)
  - `config` with safe environment values (mirrors `public-config.js`)
- CORS headers present, supports `GET, OPTIONS`.
- No changes to existing endpoints.

## Notes
- Start with recent completions from `hunt_progress` as activity signals. Extend later to include admin notices or system messages if available.
