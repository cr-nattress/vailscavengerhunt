Phase 1 — Structure and Split App.jsx

Objective
- Adopt a modular folder structure and reduce the size of App.jsx by extracting UI parts, hooks, and utilities into smaller files.

Changes
- Create directories:
  - src/features/app/
  - src/hooks/
  - src/utils/
- Split src/App.jsx into:
  - src/features/app/Header.tsx (top header + menu button)
  - src/features/app/SettingsPanel.tsx (location/team editor)
  - src/features/app/StopsList.tsx (render and orchestrate stops)
  - src/features/app/StopCard.tsx (single stop rendering and actions)
  - src/features/app/CompletedAccordion.tsx (completed list accordion)
  - src/hooks/useProgress.ts (progress persistence and derived state)
- Move helpers from App.jsx to utils/:
  - src/utils/image.ts: base64ToFile, compressImage
  - src/utils/canvas.ts: buildStorybook (pure canvas grid)
  - src/utils/id.ts: generateGuid
  - src/utils/random.ts: getRandomStops (pure; param for max stops)
  - src/utils/slug.ts: slugify (shared rules)

Non-goals
- No visual/UX changes.
- No server/function changes.

Acceptance Criteria
- App compiles and renders identically.
- All extracted helpers are imported from utils/.
- No logic changes; only relocation/splitting and light prop wiring.

Manual Verification
- Start dev server: app loads, menu works, settings show, stops render, progress gauge works, album viewer visible.
- No console errors.

Notes
- Keep types with JSDoc/TS where straightforward.
- Prefer small, focused components with minimal props.
