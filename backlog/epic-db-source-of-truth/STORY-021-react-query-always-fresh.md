# STORY-021: Client: React Query always fresh for locations/progress

- Epic: DB-Only Source of Truth
- Owner: Web Client
- Status: Proposed

## Description
Configure React Query options for locations/progress to avoid stale data. Enforce refetch on mount, focus, and reconnect.

## Acceptance Criteria
- For locations/progress queries: `staleTime: 0`, `cacheTime: 0`.
- `refetchOnWindowFocus: true`, `refetchOnReconnect: true`.
- Where feasible, `refetchOnMount: 'always'`.

## Tasks
- Identify hooks: `useActiveData`, `useProgress`, `useProgressQuery`.
- Apply strict options and verify behavior.

## Testing
- E2E: Open two tabs and confirm updates appear on refocus.
