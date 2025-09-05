# Phase 5 — Testing Setup

Goal: Add a robust test harness and seed core tests.

Instructions
1) Add dev dependencies: vitest, @testing-library/react, @testing-library/user-event, jsdom (or happy-dom).
2) Create vitest.config.ts with jsdom/happy-dom environment and TypeScript support.
3) Add npm scripts: "test", "test:watch".
4) Write tests for:
   - src/utils/slug.ts — edge-case slugging
   - src/utils/image.ts — base64ToFile and compressImage (mock canvas)
   - src/utils/canvas.ts — buildStorybook (mock draw calls)
   - src/hooks/useProgress.ts — localStorage read/write and derived percent
   - src/services/CollageService.ts — mock fetch and assert request/response handling
   - src/features/app/StopCard.tsx — render and interaction snapshot

Verification
- All tests green locally. Integrate with CI if available.

## Test harness setup
- Create `test/setup.ts` and configure in `vitest.config.ts` to run before tests.
- In `test/setup.ts`:
  - `global.URL.createObjectURL = vi.fn(() => 'blob:mock')`
  - Mock `HTMLCanvasElement.prototype.getContext` to return stubs for `drawImage`, `clearRect`, `fillRect`, `toDataURL`.
  - Set `global.fetch = vi.fn()` by default; individual tests can override.

## Coverage goals
- utils: ≥ 80%
- services: ≥ 70%
- at least one component interaction test (e.g., `StopCard`) to guard regressions.

## CI integration
- Add a CI workflow step that runs `npm ci`, `npm run lint` (Phase 6), and `npm run test`.

## Commands
- `npm run test` — run once
- `npm run test:watch` — iterative local development
