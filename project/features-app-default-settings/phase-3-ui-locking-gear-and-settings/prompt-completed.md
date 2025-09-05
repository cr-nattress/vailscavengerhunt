Phase 3 completed.

Changes implemented
- `src/App.jsx`: Gear icon is conditionally rendered only when `lockedByQuery === false`, effectively hiding settings when a valid assignment is specified via path parameters.
- If the app becomes locked while edit mode is open, the panel is immediately closed to prevent editing.

Notes
- We chose the simple Option A from the prompt (do not render the panel in locked mode, as the gear is hidden). If desired, we can later add a read-only panel variant.
