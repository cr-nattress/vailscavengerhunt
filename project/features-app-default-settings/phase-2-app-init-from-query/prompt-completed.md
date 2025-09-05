Phase 2 completed.

Changes implemented
- Updated `src/App.jsx` to initialize from URL path parameters on mount and via `popstate`:
  - Use `getPathParams()`, `isValidParamSet()`, and `normalizeParams()` from `src/utils/url.ts` to parse `/location/event/team`.
  - When valid, set `locationName`, `eventName`, `teamName` and set `lockedByQuery = true`.
  - When invalid/partial/malformed or parsing throws, set `lockedByQuery = false` and leave existing values.
  - If lock engages while edit mode is open, immediately close it (`setIsEditMode(false)`).

Verification
- Navigating to a path with three non-empty segments locks the app and sets store values.
- Navigating back to a path without valid segments unlocks the app.
- Console logs show lock state transitions for debugging.
