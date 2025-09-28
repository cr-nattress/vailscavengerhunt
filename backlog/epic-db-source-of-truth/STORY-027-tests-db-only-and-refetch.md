# STORY-027: Tests: Enforce DB-only and always-fresh behavior

- Epic: DB-Only Source of Truth
- Owner: QA/Engineering
- Status: Proposed

## Description
Add unit tests to assert no localStorage usage for locations/progress. Add E2E tests to verify refetch behavior and immediate reflection of DB changes across clients.

## Acceptance Criteria
- Unit tests fail if localStorage is accessed for these domains.
- E2E shows latest DB state after tab refocus and concurrent updates.

## Tasks
- Write unit tests for storage guards.
- Add E2E flows for updates and refocus.

## Testing
- Run `npm run test` and E2E runner.
