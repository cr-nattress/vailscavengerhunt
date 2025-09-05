# Phase 3 — UI Locking: Gear Icon and Settings Panel

Objective
- Reflect the URL-locking state in the UI (based on valid full path parameters).
  - Hide or disable the gear icon when `lockedByQuery` is true.
  - When locked, either skip rendering `SettingsPanel` or render a read-only view with a brief explanation.

Scope of changes
- `src/App.jsx`
  - Read `lockedByQuery` from the store.
  - Conditionally render the gear/settings button only when `lockedByQuery === false`.
  - Optionally show a small badge next to the location (e.g., "URL locked") when locked.
  - Ensure `isEditMode` is forced false if the app becomes locked while the panel is open.
- `src/features/app/SettingsPanel.tsx`
  - Option A (simple): Do not render the panel at all when locked (gear is hidden anyway).
  - Option B (informative): Add a `locked` prop; when true, show read-only inputs and a short note: "Settings are controlled by the link you used to open the app." Hide Save/Cancel buttons.

Details
- Provide accessible labels/titles for any new badge or tooltip indicating locked state.
- Keep styling consistent with existing theme variables.

Non-goals
- No changes to upload behavior yet.

Acceptance criteria
- With valid full path params, the gear is not visible and users cannot open settings.
- Without params, gear is visible and settings behave as before.
- If opting for the read-only panel, inputs are disabled and save actions are disabled in locked mode.
