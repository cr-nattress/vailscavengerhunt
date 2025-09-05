# Phase 2 — Initialize App From Path Parameters

Objective
- On app mount, parse the URL pathname and decide whether to lock settings using path parameters (`/location/event/team`).
- When fully provided and valid, set store values accordingly and mark `lockedByQuery = true`. Otherwise, leave app unlocked.
 - This lock will be used in Phase 3 to hide the gear icon and prevent opening the edit page.

Scope of changes
- Update `src/App.jsx` with a `useEffect` that:
  - Parses `window.location.pathname` using `getPathParams()` and `isValidParamSet()` from `src/utils/url.ts`.
  - If valid: call `setLocationName(location)`, `setEventName(event)`, `setTeamName(team)`, and `setLockedByQuery(true)`.
  - If invalid/partial/missing or parsing throws: call `setLockedByQuery(false)` and do not set values from the URL (fall back to default behavior).
  - Add a `popstate` listener to handle runtime URL changes, re-applying the same rules on back/forward navigation.
  - If the app transitions to locked mode while the edit panel is open, immediately reset/close edit mode (e.g., `setIsEditMode(false)`).

Details
- Be careful to not clobber existing persisted values unless parameters are valid (all three present and non-empty).
- Log a concise console message when the app enters/exits "URL-locked" mode for debugging.
- Keep the rest of the initialization logic (sessions, saved settings) unchanged.

Non-goals
- Do not alter the gear button rendering yet.
- Do not modify the Settings panel yet.

Acceptance criteria
- With `/bhhs/SummerFest/TheFoxes` (example), store reflects these values and `lockedByQuery === true`.
- With partial or no params, `lockedByQuery === false` and store values remain as before.
- Navigating via history (adding/removing params) updates `lockedByQuery` accordingly.
 - If `lockedByQuery` becomes true, any open edit panel is closed. Gear icon visibility changes will be handled in Phase 3.
