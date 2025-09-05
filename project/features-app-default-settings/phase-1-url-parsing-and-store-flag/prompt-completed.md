Phase 1 completed.

Changes implemented
- Added `src/utils/url.ts` with `getPathParams()`, `isValidParamSet()`, and `normalizeParams()` to parse pathname segments `/location/event/team` and default to none on errors.
- Extended `src/store/appStore.ts` with transient `lockedByQuery` flag and `setLockedByQuery()`; excluded from persistence via `partialize`.

Verification
- Utility returns `{}` for partial/malformed paths; returns normalized params for valid triple segments.
- Store exposes `lockedByQuery` and setter at runtime; not persisted.
