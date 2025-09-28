# Epic: DB-Only Source of Truth for Locations and Progress

- Owner: Platform
- Status: Proposed
- Goal: Ensure hunt locations and team progress are always read from and written to the database. Eliminate all client/local caches, in-memory servers, and blob/KV fallbacks for these entities. Add no-store caching semantics to prevent stale data.

## Problem Statement
The application currently has multiple potential sources of data for locations and progress (localStorage, Express dev server in-memory stores, legacy state endpoints). This can lead to stale reads, environment drift, and hard-to-debug behaviors. We want a single, authoritative source: the database (Supabase), accessed via Netlify Functions.

## Scope
- Client must not read/write locations or progress to localStorage or any client-side cache beyond transient React Query caching, which must be configured to always refetch.
- All reads/writes go to DB-backed endpoints (Netlify Functions) only.
- Netlify Functions return no-store headers for locations/progress to prevent browser/CDN caching.
- Legacy state endpoints are removed and client call sites are eliminated.
- Express dev server routes should not maintain in-memory state for progress; they should proxy to functions or be disabled for these resources.
- Tests and docs updated accordingly.

## Non-Goals
- Changing data models in Supabase beyond what’s necessary to standardize access.
- Refactoring unrelated feature endpoints.

## Deliverables
- Client: Local cache removal and React Query enforced refetch for locations/progress.
- Functions: DB-only logic and `Cache-Control: no-store` headers.
- Config: Remove `state-*` redirects and calls.
- Dev server: Remove in-memory progress handling; proxy to functions if needed.
- Tests: Unit and E2E to assert DB-only behavior and fresh reads.
- Docs updated.

## Acceptance Criteria
- Fresh page load reflects DB truth for locations and progress.
- No reads from localStorage for these domains; no local writes beyond ephemeral UI state.
- In Netlify Dev and production, `/api/*` returns `Cache-Control: no-store` for locations/progress endpoints.
- Express dev server cannot diverge state for progress vs DB.
- E2E passes showing no stale data after concurrent updates.

## Risks and Mitigations
- Devs may accidentally use Express dev server cache.
  - Mitigation: Proxy or disable those routes; add a console warning if base URL is improper.
- Performance concerns with frequent refetches.
  - Mitigation: Keep React Query defaults strict only for locations/progress; other domains can remain cached.

## Stories
- STORY-020: Client: Remove local storage usage for locations/progress and route all reads/writes via API
- STORY-021: Client: Enforce React Query “always fresh” config for locations/progress
- STORY-022: Client Networking: Base URL and request headers for no-store
- STORY-023: Functions: Add no-store headers and confirm DB-only paths
- STORY-024: Remove legacy `state-*` endpoints and client call sites
- STORY-025: Express Dev: Remove in-memory progress; proxy to functions
- STORY-026: Locations Helper: Verify DB-only sourcing
- STORY-027: Tests: Unit/E2E to enforce DB-only behavior and refetching
- STORY-028: Documentation updates

## Rollout Plan
1. Land client changes behind a feature flag if needed.
2. Deploy functions headers and config changes.
3. Remove legacy endpoints and update docs.
4. Enable E2E and monitoring to ensure no regressions.
