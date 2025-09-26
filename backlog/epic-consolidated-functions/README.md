# Epic: Consolidated Netlify Functions

- ID: EPIC-CONSO-FNS
- Owner: Platform / Backend
- Status: Planned
- Created: 2025-09-26

## Goal
Create consolidated GET endpoints (Netlify Functions) that return all data required for each UI tab in a single request. This improves performance, reduces network chatter, and centralizes server-side data composition.

## Scope
Do not remove or modify existing endpoints. Add new consolidated endpoints to be wired into the UI later.

## Endpoints
- GET `/api/consolidated/active/{orgId}/{teamId}/{huntId}`
- GET `/api/consolidated/history/{orgId}/{teamId}/{huntId}`
- GET `/api/consolidated/rankings?orgId=...&huntId=...`
- GET `/api/consolidated/updates/{orgId}/{teamId}/{huntId}`

## Functional Requirements
- Return JSON payloads including all necessary settings/config and domain data for each tab.
- Read from existing data sources (Supabase, environment) using the shared libs under `netlify/functions/_lib/`.
- CORS enabled, methods: GET, OPTIONS.
- Do not break or replace existing endpoints.

## Non-Functional Requirements
- Follow existing function patterns (headers, error handling, logging).
- Keep responses backward-compatible for future gradual UI adoption.
- Add redirects to `netlify.toml` without altering existing ones.

## Stories
- STORY-CONSO-ACTIVE: Active tab consolidated endpoint
- STORY-CONSO-HISTORY: History tab consolidated endpoint
- STORY-CONSO-RANKINGS: Rankings tab consolidated endpoint
- STORY-CONSO-UPDATES: Updates tab consolidated endpoint

## Acceptance Criteria
- Four new functions exist and deploy under `/.netlify/functions/*`.
- `netlify.toml` contains redirects for the four new endpoints.
- Each function returns a 200 response with a well-structured JSON body including relevant settings/config.
- No changes to existing endpoints.
