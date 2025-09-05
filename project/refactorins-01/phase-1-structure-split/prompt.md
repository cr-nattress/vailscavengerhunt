# Phase 1 — Structure and Split App.jsx

Goal: Break down src/App.jsx into smaller components, hooks, and utils without changing runtime behavior.

Instructions
1) Create folders:
   - src/features/app/
   - src/hooks/
   - src/utils/

2) Extract from src/App.jsx into files:
   - src/features/app/Header.tsx
     - Props: { isMenuOpen: boolean; onToggleMenu: () => void; completeCount: number; totalStops: number; percent: number; onReset: () => void; onToggleTips: () => void }
     - Renders the existing header markup and menu with actions wired via props.
   - src/features/app/SettingsPanel.tsx
     - Props: { locationName: string; teamName: string; onChangeLocation: (v:string)=>void; onChangeTeam:(v:string)=>void; onSave:()=>void; onCancel:()=>void }
     - Render existing edit mode card.
   - src/features/app/StopCard.tsx
     - Props: { stop, progress, onUpload, onToggleExpanded, expanded: boolean }
     - Encapsulate per-stop UI.
   - src/features/app/StopsList.tsx
     - Props: { stops, progress, transitioningStops, completedSectionExpanded, onToggleCompletedSection }
     - Composes StopCard list and completed accordion.
   - src/features/app/CompletedAccordion.tsx
     - Props: { completedStops }
     - Presentational accordion wrapper.
   - src/hooks/useProgress.ts
     - Extract the existing useProgress implementation unchanged, export { progress, setProgress, completeCount, percent }.

3) Extract utils (pure functions):
   - src/utils/image.ts: export base64ToFile, compressImage (moved verbatim)
   - src/utils/canvas.ts: export buildStorybook (moved verbatim, ensure explicit canvas typing)
   - src/utils/id.ts: export generateGuid
   - src/utils/random.ts: export getRandomStops(data, maxStops?) as pure function
   - src/utils/slug.ts: export slugify(lowercase, strip diacritics, hyphenize)

4) Update imports in App.jsx to use the new components/hooks/utils. Ensure unchanged behavior.

Constraints
- No UI/UX changes.
- No dependency changes.
- Keep component styles and classes exactly as before.

Deliverables
- Modified src/App.jsx (thin composition).
- New files under src/features/app, src/hooks, src/utils as above.

Verification
- Build and run: no TypeScript/JS errors.
- Manual test main flows (menu, settings, stops, progress gauge, album viewer).

## Regression safeguards (do not proceed unless all pass)
- Preserve existing behavior in `src/App.jsx` after split:
  - Menu toggle works and closes on outside click.
  - Settings panel Save/Cancel flow updates state and persists via `DualWriteService`.
  - ProgressGauge displays correct `percent`, `completeCount`, and `totalStops`.
  - `AlbumViewer` renders and updates when `collageUrl`/`fullSizeImageUrl` change.
  - Stops list ordering: incomplete first; completed are in the Completed accordion; transitioning stops retained visually.
- No network calls added or removed in this phase; only imports/exports and props wiring are changed.

## Manual verification checklist
1) Start dev server and load the app.
2) Header/menu
   - Toggle menu open/close; click outside to close; ensure ARIA attributes remain.
3) Settings panel
   - Change Team and Location; Save.
   - Reload page; confirm values persist (LocalStorage/DualWriteService).
4) Progress
   - Mark one stop as completed (or simulate); verify percent and counts update.
5) Album
   - Trigger storybook/collage preview if available; confirm it renders and updates.
6) Console
   - Ensure no new warnings or errors were introduced.

## Quick DOM checks
- Header SVG/logo present.
- Menu button has accessible name (aria-label).
- Completed accordion shows correct count when completed stops exist.

## Commands
- `npm run dev` — load app and perform the checks above.
