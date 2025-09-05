Phase 5 — Testing Setup

Objective
- Establish unit and component testing with Vitest + React Testing Library.

Changes
- Add dev deps: vitest, @testing-library/react, @testing-library/user-event, jsdom (or happy-dom).
- Configure vitest in package.json or vitest.config.ts.
- Write initial tests:
  - src/utils/slug.test.ts
  - src/utils/image.test.ts
  - src/utils/canvas.test.ts (mock canvas)
  - src/hooks/useProgress.test.ts
  - src/services/CollageService.test.ts (mock fetch)
  - src/features/app/StopCard.test.tsx

Acceptance Criteria
- npm run test passes locally and in CI.
- Critical pure helpers and a key component have coverage.

Manual Verification
- Run tests and review coverage for utils/hooks/services.
