# Phase 1 — URL Parsing Utility and Store Flag

Objective
- Introduce a small utility to parse and validate URL path parameters (location, event, team) from pathname like `/bhhs/vail/red`.
- Extend the app store with a transient `lockedByQuery` flag and setter (not persisted).

Scope of changes
- Add a new utility: `src/utils/url.ts`.
- Update Zustand store: `src/store/appStore.ts` to include `lockedByQuery` and `setLockedByQuery` (ensure it is not persisted).

Details
- `src/utils/url.ts`
  - Implement `getPathParams(pathname: string): { location?: string; event?: string; team?: string }`.
    - Parse `window.location.pathname` into segments (ignore leading/trailing slashes).
    - Expect exactly three segments in order: `[location, event, team]`.
    - Trim values; ignore blank strings. If fewer than three segments or any segment is blank, return an empty object `{}`.
  - Implement `isValidParamSet(params): boolean`.
    - Returns `true` only if all three keys are present and all values are non-empty after trimming.
  - Implement `normalizeParams(params)` (optional but recommended):
    - Normalizes whitespace/casing; collapse multiple spaces; trim.
    - Optionally map `location` to a known set (e.g., `BHHS`, `Vail Valley`, `Vail Village`) or to internal keys (e.g., `bhhs` → `BHHS`). Otherwise, leave as provided and let the app default later.
  - Important: If parsing throws or encounters unexpected formats, catch and return `{}` (treat as no params).

- `src/store/appStore.ts`
  - Extend state with `lockedByQuery: boolean` (default `false`).
  - Add action `setLockedByQuery(locked: boolean): void`.
  - Ensure `lockedByQuery` is EXCLUDED from `persist` via `partialize` so it is not stored.

Non-goals
- Do not modify `App.jsx` yet.
- Do not alter any UI components yet.

Acceptance criteria
- TypeScript compiles.
- `useAppStore.getState()` includes `lockedByQuery` and `setLockedByQuery`.
- Unit/spot tests of `getPathParams` and `isValidParamSet` behave with valid triple segments, partial/malformed paths (treated as none), and empty root path.
