# Documentation Index

This index tracks documentation coverage and provides quick links and checklists aligned with `knowledge/CODE_COMMENTS.md`.

## Scope Overview

- `src/components/`
- `src/features/` (views, app, navigation, notifications, sponsors, upload)
- `src/hooks/`
- `src/services/`
- `src/server/`
- `netlify/functions/`
- `src/client/`
- `src/types/`
- `src/utils/`
- `tests/`, `test/`
- `docs/`, `knowledge/`

## Coverage Status (High Priority Targets)

- [ ] `src/features/views/ActiveView.tsx`
- [ ] `src/features/app/StopsList.tsx`
- [ ] `src/features/app/StopCard.tsx`
- [ ] `src/hooks/usePhotoUpload.ts`
- [ ] `src/client/PhotoUploadService.ts`
- [ ] `src/services/ProgressService.ts`
- [ ] `src/server/progressRoute.ts`
- [ ] `netlify/functions/` (all relevant upload/consolidated functions)
- [ ] `src/hooks/useActiveData.ts`
- [ ] `src/utils/photoFlowLogger.ts`
- [ ] `src/features/views/HistoryView.tsx`
- [ ] `src/features/navigation/navigationStore.ts`
- [ ] `src/types/schemas.ts`

Use this list as the sprint checklist. Expand to cover the full repository as sprints progress.

## Per-File Checklist (from CODE_COMMENTS.md)

- [ ] File header with `@file`, `@module`, `@description`
- [ ] JSDoc on all exported functions/classes with examples
- [ ] Inline comments for complex logic
- [ ] Use markers where relevant:
  - ASSUMPTION, SECURITY, PERF, GOTCHA, PATTERN, HACK, BRITTLE, CRITICAL, SIDE EFFECT, RACE CONDITION
- [ ] API routes documented with methods, auth, request/response schemas, error codes, curl examples
- [ ] Types/interfaces documented at property level with constraints and examples
- [ ] Tests have scenario summaries and traceability

## Quick Links

- Standards: `knowledge/CODE_COMMENTS.md`
- E2E tests: `tests/e2e/`
- Functions: `netlify/functions/`
- Services: `src/services/`
- Hooks: `src/hooks/`
- Views: `src/features/views/`
- Types: `src/types/`

## How to Contribute Documentation

1. Add or update comments following `knowledge/CODE_COMMENTS.md`.
2. Ensure all exported members have JSDoc.
3. Add SECURITY/PERF/GOTCHA markers where appropriate.
4. Update this index: check off the file you completed and add a short note.
5. Ensure PR includes the Documentation Checklist (see PR template).

## Notes & Decisions

Record notable documentation-related decisions here (format: date - note):

- YYYY-MM-DD - Initial index created; focus on upload and progress paths first.
