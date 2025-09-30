# Active Netlify Functions Used by UI

This document lists all Netlify functions that are actively called by the frontend UI, based on code analysis.

## ✅ Actively Used Functions

### Core Data & Progress

1. **`consolidated-active.js`**
   - **Route:** `/api/consolidated/active/:orgId/:teamId/:huntId`
   - **Method:** GET
   - **Used by:** `ConsolidatedDataService.ts`, `ActiveView.tsx`
   - **Purpose:** Fetches all active hunt data (stops, progress, settings) in one call
   - **Status:** ✅ ACTIVE - Primary data source

2. **`consolidated-history.js`**
   - **Route:** `/api/consolidated/history/:orgId/:teamId/:huntId`
   - **Method:** GET
   - **Used by:** `HistoryView.tsx` (via React Query)
   - **Purpose:** Fetches completed stops with photos
   - **Status:** ✅ ACTIVE

3. **`consolidated-updates.js`**
   - **Route:** `/api/consolidated/updates/:orgId/:teamId/:huntId`
   - **Method:** GET
   - **Used by:** `UpdatesView.tsx` (via React Query)
   - **Purpose:** Fetches hunt updates/announcements
   - **Status:** ✅ ACTIVE

4. **`consolidated-rankings.js`**
   - **Route:** `/api/consolidated/rankings`
   - **Method:** GET
   - **Used by:** `RankingsView.tsx` (via React Query)
   - **Purpose:** Fetches leaderboard/rankings
   - **Status:** ✅ ACTIVE

5. **`progress-get-supabase.js`**
   - **Route:** `/api/progress/:orgId/:teamId/:huntId`
   - **Method:** GET (also proxies POST to progress-set-supabase)
   - **Used by:** `ProgressService.ts`
   - **Purpose:** Gets team progress from Supabase
   - **Status:** ✅ ACTIVE - Updated to proxy POST requests

6. **`progress-set-supabase.js`**
   - **Route:** `/api/progress/:orgId/:teamId/:huntId`
   - **Method:** POST
   - **Used by:** `ProgressService.ts` (via progress-get-supabase proxy)
   - **Purpose:** Saves team progress to Supabase
   - **Status:** ✅ ACTIVE

7. **`progress-patch-supabase.js`**
   - **Route:** `/api/progress/:orgId/:teamId/:huntId/stop/:stopId`
   - **Method:** PATCH
   - **Used by:** `ProgressService.ts`
   - **Purpose:** Updates single stop progress
   - **Status:** ✅ ACTIVE

### Photo Upload

8. **`photo-upload-complete.js`**
   - **Route:** `/api/photo-upload-complete`
   - **Method:** POST
   - **Used by:** `PhotoUploadService.ts` (via `uploadPhotoComplete`)
   - **Purpose:** Atomic photo upload + progress update to Cloudinary & Supabase
   - **Status:** ✅ ACTIVE - Primary upload method

9. **`photo-upload-orchestrated.js`**
   - **Route:** `/api/photo-upload-orchestrated`
   - **Method:** POST
   - **Used by:** `PhotoUploadService.ts` (fallback)
   - **Purpose:** Orchestrated photo upload with signed URL
   - **Status:** ⚠️ FALLBACK - Used when complete endpoint unavailable

10. **`photo-upload.js`**
    - **Route:** `/api/photo-upload`
    - **Method:** POST
    - **Used by:** `PhotoUploadService.ts` (legacy fallback)
    - **Purpose:** Basic photo upload
    - **Status:** ⚠️ LEGACY FALLBACK

### Authentication & Team Management

11. **`login-initialize.js`**
    - **Route:** `/api/login-initialize`
    - **Method:** POST
    - **Used by:** `LoginService.ts`
    - **Purpose:** Initializes session, returns config
    - **Status:** ✅ ACTIVE

12. **`team-verify.js`**
    - **Route:** `/api/team-verify`
    - **Method:** POST
    - **Used by:** `TeamAuthService.ts`, team routes
    - **Purpose:** Verifies team code, issues lock token
    - **Status:** ✅ ACTIVE

13. **`team-current.js`**
    - **Route:** `/api/team-current`
    - **Method:** GET
    - **Used by:** `TeamAuthService.ts`, team routes
    - **Purpose:** Gets current team from lock token
    - **Status:** ✅ ACTIVE

14. **`team-setup.js`**
    - **Route:** `/api/team-setup`
    - **Method:** POST
    - **Used by:** Development/testing only
    - **Purpose:** Creates test team mappings
    - **Status:** ⚠️ DEV ONLY

### Leaderboard & Rankings

15. **`leaderboard-get-supabase.js`**
    - **Route:** `/api/leaderboard/:orgId/:huntId`
    - **Method:** GET
    - **Used by:** `useProgressQuery.ts`, `RankingsView.tsx`
    - **Purpose:** Fetches leaderboard data
    - **Status:** ✅ ACTIVE

### Settings & Configuration

16. **`settings-get-supabase.js`**
    - **Route:** `/api/settings/*` (via `_redirects`)
    - **Method:** GET
    - **Used by:** `ServerSettingsService.ts`
    - **Purpose:** Fetches hunt settings
    - **Status:** ✅ ACTIVE (via consolidated-active primarily)

### Sponsors

17. **`sponsors-get.js`**
    - **Route:** `/api/sponsors`
    - **Method:** POST
    - **Used by:** `SponsorsService.ts`
    - **Purpose:** Fetches sponsor data
    - **Status:** ✅ ACTIVE

### Logging & Debugging

18. **`write-log.js`**
    - **Route:** `/api/write-log`
    - **Method:** POST
    - **Used by:** `photoFlowLogger.ts`
    - **Purpose:** Writes debug logs to server
    - **Status:** ✅ ACTIVE - Debug/monitoring

19. **`health.js`**
    - **Route:** `/api/health`
    - **Method:** GET
    - **Used by:** Health checks, monitoring
    - **Purpose:** Health check endpoint
    - **Status:** ✅ ACTIVE

### Key-Value Store

20. **`kv-get-supabase.js`**
    - **Route:** `/api/kv/get`
    - **Method:** GET
    - **Used by:** Internal state management
    - **Purpose:** Gets KV store values
    - **Status:** ⚠️ INTERNAL USE

21. **`kv-upsert-supabase.js`**
    - **Route:** `/api/kv/upsert`
    - **Method:** POST
    - **Used by:** Internal state management
    - **Purpose:** Upserts KV store values
    - **Status:** ⚠️ INTERNAL USE

22. **`kv-list.js`**
    - **Route:** `/api/kv/list`
    - **Method:** GET
    - **Used by:** Internal state management
    - **Purpose:** Lists KV store keys
    - **Status:** ⚠️ INTERNAL USE

### Testing & Development

23. **`test-supabase.js`**
    - **Route:** `/api/test-supabase`
    - **Method:** GET
    - **Used by:** Testing/debugging
    - **Purpose:** Tests Supabase connection
    - **Status:** ⚠️ DEV/TEST ONLY

---

## ❌ Unused/Deprecated Functions

### Potentially Unused

1. **`leaderboard-get-supabase-v2.js`**
   - **Status:** ❌ NOT FOUND IN UI CODE
   - **Reason:** Likely superseded by v1 or consolidated-rankings

2. **`settings-set-supabase.js`**
   - **Status:** ❌ NOT FOUND IN UI CODE
   - **Reason:** Settings are read-only from UI perspective

3. **`test-error.js`**
   - **Status:** ❌ DEV/TEST ONLY
   - **Reason:** Error testing utility

---

## Summary Statistics

- **Total Active Functions:** 23
- **Core Data Functions:** 7
- **Photo Upload Functions:** 3
- **Auth/Team Functions:** 4
- **Leaderboard Functions:** 1
- **Settings Functions:** 1
- **Sponsors Functions:** 1
- **Logging Functions:** 2
- **KV Store Functions:** 3
- **Test/Dev Functions:** 2

---

## Notes

1. **Consolidated endpoints** (`consolidated-*`) are the primary data sources and should be prioritized for optimization.
2. **Photo upload** has 3 implementations with `photo-upload-complete` being the preferred method.
3. **Progress functions** are critical path - any issues here block user progress.
4. **KV store functions** are used internally by other functions, not directly by UI.
5. **Test functions** should not be deployed to production or should be gated by environment checks.

---

## Refactor Recommendations

1. **Consolidate photo upload** - Remove legacy `photo-upload.js` and `photo-upload-orchestrated.js` once `photo-upload-complete.js` is stable.
2. **Remove unused v2 leaderboard** - Delete `leaderboard-get-supabase-v2.js` if not in use.
3. **Gate test functions** - Ensure `test-supabase.js` and `test-error.js` are not accessible in production.
4. **Document KV usage** - Clarify which functions use KV store internally.

---

**Last Updated:** 2025-09-30
**Generated by:** Code analysis of `src/` directory API calls
