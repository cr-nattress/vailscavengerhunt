[Status: Completed]
- Date: 2025-09-05
- Summary: Implemented `UploadProvider` + `useUploadMeta` context, ensured `App` wires store values (location, team, event, session). Updated `CollageUploader` to read from context with props overriding for backward-compat. Verified uploads carry expected tags/metadata; no behavior regressions.

# Phase 2 — UploadProvider and Central Store

Goal: Provide location/team/session via context and manage them in a central store.

Instructions
1) Create src/store/appStore.ts using Zustand (or a simple context+reducer if Zustand not desired):
   - State: { locationName: string; teamName: string; sessionId: string }
   - Actions: setLocationName, setTeamName, setSessionId
   - Initialize sessionId once (GUID) on first load.

2) Create src/features/upload/UploadContext.tsx:
   - Accept props { location?: string; team?: string; sessionId?: string; locationSlug?: string; teamSlug?: string }
   - Derive slugs from names if slugs not provided (reuse slugify from src/utils/slug.ts)
   - Export useUploadMeta(): { dateISO, locationSlug, teamSlug, sessionId }

3) Update App to wrap main tree with <UploadProvider> sourcing values from appStore.

4) Update src/components/CollageUploader.tsx:
   - Replace props with values from useUploadMeta().
   - Keep backward-compat: if props provided, prefer them; else use context.

Deliverables
- src/store/appStore.ts
- src/features/upload/UploadContext.tsx (with useUploadMeta)
- Updated App and CollageUploader wiring

Verification
- Change team/location settings; confirm uploads carry expected tags and folder.

## Regression safeguards (must hold true)
- `CollageUploader` continues immediate per-file uploads; no behavior regression vs prior implementation.
- Metadata parity: uploads include identical `dateISO`, tags, and context as before. If only names are provided, server-side slug inference remains a fallback.
- Props precedence: if `CollageUploader` receives explicit props, they override context. Otherwise, values come from `useUploadMeta()`.
- App renders without `UploadProvider` in isolated tests (component should not crash; show helpful error or accept props path).

## Manual verification checklist
1) Change `locationName` and `teamName` in settings; upload a photo; verify in Cloudinary:
   - Folder: `photos/YYYY/MM/DD/locationSlug/teamSlug` (root may vary by env var)
   - Tags: `day:YYYY-MM-DD`, `location:locationSlug`, `team:teamSlug`, optional `session:sessionId`
2) Repeat the same upload; confirm idempotency (same `public_id`, no duplicate asset).
3) Refresh the app; settings persist and uploads continue using the same session.

## Negative checks
- Temporarily remove `UploadProvider` wrapper and render `CollageUploader` with props → component functions (props path).
- Supply invalid names (e.g., with diacritics/spaces) → confirm slugs are derived deterministically on client, and server still accepts.

## Commands
- `npm run dev` — perform the checks above.
