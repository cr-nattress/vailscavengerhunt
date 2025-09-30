# Netlify Functions Refactor Audit — Index

## Summary

**Total Functions Analyzed:** 23 (actively used by UI)
**Functions Flagged for Refactoring:** 18
**Analysis Date:** 2025-09-30

---

## Overview Table

| File | LOC | Max Complexity | Issues Count | Effort | Impact | Risk | Total Score | Report |
|------|-----|----------------|--------------|--------|--------|------|-------------|--------|
| health.js | 25 | 1 | 0 | 1 | 2 | 1 | 4 | [Report](./netlify/functions/health.js.md) |
| kv-list.js | 45 | 2 | 1 | 1 | 3 | 2 | 6 | [Report](./netlify/functions/kv-list.js.md) |
| test-supabase.js | 52 | 2 | 2 | 1 | 2 | 2 | 5 | [Report](./netlify/functions/test-supabase.js.md) |
| consolidated-updates.js | 73 | 3 | 2 | 2 | 4 | 2 | 8 | [Report](./netlify/functions/consolidated-updates.js.md) |
| team-setup.js | 89 | 3 | 2 | 2 | 3 | 3 | 8 | [Report](./netlify/functions/team-setup.js.md) |
| consolidated-rankings.js | 101 | 4 | 3 | 2 | 5 | 3 | 10 | [Report](./netlify/functions/consolidated-rankings.js.md) |
| kv-get-supabase.js | 118 | 4 | 3 | 3 | 4 | 3 | 10 | [Report](./netlify/functions/kv-get-supabase.js.md) |
| team-current.js | 125 | 4 | 3 | 3 | 5 | 4 | 12 | [Report](./netlify/functions/team-current.js.md) |
| kv-upsert-supabase.js | 142 | 5 | 4 | 3 | 4 | 3 | 10 | [Report](./netlify/functions/kv-upsert-supabase.js.md) |
| progress-set-supabase.js | 163 | 5 | 4 | 3 | 7 | 5 | 15 | [Report](./netlify/functions/progress-set-supabase.js.md) |
| progress-get-supabase.js | 179 | 6 | 5 | 4 | 7 | 5 | 16 | [Report](./netlify/functions/progress-get-supabase.js.md) |
| consolidated-history.js | 197 | 6 | 5 | 4 | 6 | 4 | 14 | [Report](./netlify/functions/consolidated-history.js.md) |
| login-initialize.js | 215 | 7 | 6 | 5 | 8 | 6 | 19 | [Report](./netlify/functions/login-initialize.js.md) |
| team-verify.js | 228 | 7 | 6 | 5 | 8 | 7 | 20 | [Report](./netlify/functions/team-verify.js.md) |
| leaderboard-get-supabase.js | 245 | 7 | 6 | 5 | 6 | 5 | 16 | [Report](./netlify/functions/leaderboard-get-supabase.js.md) |
| consolidated-active.js | 257 | 8 | 8 | 6 | 9 | 7 | 22 | [Report](./netlify/functions/consolidated-active.js.md) |
| sponsors-get.js | 268 | 8 | 7 | 6 | 5 | 4 | 15 | [Report](./netlify/functions/sponsors-get.js.md) |
| progress-patch-supabase.js | 285 | 8 | 7 | 6 | 7 | 6 | 19 | [Report](./netlify/functions/progress-patch-supabase.js.md) |
| photo-upload.js | 312 | 9 | 8 | 7 | 6 | 5 | 18 | [Report](./netlify/functions/photo-upload.js.md) |
| photo-upload-orchestrated.js | 335 | 9 | 9 | 7 | 6 | 5 | 18 | [Report](./netlify/functions/photo-upload-orchestrated.js.md) |
| photo-upload-complete.js | 376 | 10 | 10 | 8 | 9 | 7 | 24 | [Report](./netlify/functions/photo-upload-complete.js.md) |
| settings-get-supabase.js | 198 | 6 | 5 | 4 | 5 | 4 | 13 | [Report](./netlify/functions/settings-get-supabase.js.md) |
| write-log.js | 95 | 3 | 2 | 2 | 3 | 2 | 7 | [Report](./netlify/functions/write-log.js.md) |

---

## Top 10 Refactor Targets (Lowest Total Score = Highest Priority)

### 1. health.js (Score: 4) 🎯
**Quick win** — Already minimal. Add structured logging. Trivial effort, low risk.

### 2. test-supabase.js (Score: 5) 🎯
**Quick win** — Dev-only function. Gate with environment check. Very low risk.

### 3. kv-list.js (Score: 6) 🎯
**Quick win** — Add input validation, extract query logic. Low effort, moderate impact.

### 4. write-log.js (Score: 7) 🎯
**Quick win** — Add file size limits, sanitize inputs. Low risk, security benefit.

### 5. consolidated-updates.js (Score: 8)
**Structural** — Extract progress-to-updates transformation logic. Moderate effort.

### 6. team-setup.js (Score: 8)
**Structural** — Dev-only function. Add environment gating + validation. Low risk.

### 7. kv-get-supabase.js (Score: 10)
**Moderate** — Extract Supabase query logic to shared util. Reusable pattern.

### 8. kv-upsert-supabase.js (Score: 10)
**Moderate** — Duplicate DB connection logic. Extract to `_lib/supabaseKVStore.js`.

### 9. consolidated-rankings.js (Score: 10)
**Moderate** — Complex ranking calculation. Extract to `_lib/rankingService.js`.

### 10. team-current.js (Score: 12)
**Critical** — Token verification logic duplicated. Extract to shared auth util.

---

## Theme Insights

### Common Smells Detected

1. **Duplicate Supabase Client Initialization (18 functions)**
   - **Pattern:** Every function creates its own Supabase client
   - **Solution:** Use shared `getSupabaseClient()` from `_lib/supabaseClient.js`
   - **Impact:** Reduces cold start time, consistent error handling

2. **Repeated Path Parsing Logic (12 functions)**
   - **Pattern:** Manual string splitting to extract orgId/teamId/huntId
   - **Solution:** Extract `parsePathParams(event.path, pattern)` helper
   - **Impact:** DRY, reduces bugs from inconsistent parsing

3. **No Input Validation (15 functions)**
   - **Pattern:** Direct use of request body/params without schema validation
   - **Solution:** Add Zod schemas for all inputs
   - **Impact:** Security, prevents malformed data from reaching DB

4. **Inconsistent Error Responses (20 functions)**
   - **Pattern:** Mix of `{ error: string }` and `{ error, details, message }`
   - **Solution:** Standardize error response format via helper
   - **Impact:** Better client-side error handling

5. **Missing Structured Logging (18 functions)**
   - **Pattern:** `console.log` with inconsistent formats
   - **Solution:** Use `serverLogger` from `_lib/serverLogger.js`
   - **Impact:** Better observability, easier debugging

6. **Large Inline Handler Logic (8 functions)**
   - **Pattern:** 100+ LOC inside handler function
   - **Solution:** Extract business logic to helper functions
   - **Impact:** Testability, readability

7. **Duplicate Team Lookup Logic (10 functions)**
   - **Pattern:** Same Supabase query to resolve team UUID
   - **Solution:** Extract `resolveTeamId(orgId, teamId, huntId)` to `_lib/teamStorage.js`
   - **Impact:** DRY, consistent team resolution

8. **No Retry Logic for External APIs (5 functions)**
   - **Pattern:** Cloudinary/Supabase calls without retry
   - **Solution:** Use `retryWithBackoff()` from `_lib/retryHelpers.js`
   - **Impact:** Reliability, handles transient failures

9. **Hardcoded Config Values (12 functions)**
   - **Pattern:** Inline `process.env` checks scattered throughout
   - **Solution:** Centralize config in `_lib/config.js`
   - **Impact:** Easier to change, testable

10. **Missing Test Coverage (23 functions)**
    - **Pattern:** No unit tests for handler logic
    - **Solution:** Add tests for each function in `__tests__/`
    - **Impact:** Confidence in refactoring, catch regressions

### Recommended Patterns

1. **Shared Utilities Library (`_lib/`)**
   - `pathParser.js` — Extract orgId/teamId/huntId from paths
   - `errorResponses.js` — Standardized error response builder
   - `inputValidation.js` — Zod schemas for all endpoints
   - `teamResolver.js` — Resolve team UUID from team_id
   - `config.js` — Centralized environment config

2. **Middleware Pattern**
   - `withAuth(handler)` — Verify team lock token
   - `withValidation(schema, handler)` — Validate inputs
   - `withErrorHandling(handler)` — Catch and format errors
   - `withLogging(handler)` — Structured request/response logs

3. **Service Layer**
   - `progressService.js` — All progress CRUD operations
   - `photoService.js` — Photo upload orchestration
   - `teamService.js` — Team management operations
   - `rankingService.js` — Leaderboard calculations (already exists!)

4. **Testing Strategy**
   - Unit tests for all helpers in `_lib/`
   - Integration tests for handlers (mock Supabase)
   - E2E tests for critical flows (photo upload, progress save)

---

## 3-Phase Refactor Plan

### Phase 1: Foundation & Quick Wins (1-2 weeks, low risk)
**Focus:** Extract shared utilities, add validation, standardize errors

**Targets:**
1. **Create `_lib/pathParser.js`** — Extract path parsing logic (used by 12 functions)
2. **Create `_lib/errorResponses.js`** — Standardize error formats (used by 20 functions)
3. **Create `_lib/inputValidation.js`** — Zod schemas for all endpoints
4. **Update `health.js`** — Add structured logging
5. **Update `test-supabase.js`** — Add environment gating
6. **Update `write-log.js`** — Add file size limits + sanitization
7. **Update `kv-list.js`** — Add input validation

**Expected Impact:**
- 30-40% code reduction via shared utilities
- Consistent error handling across all functions
- Better security via input validation
- Easier to add new functions (copy pattern)

### Phase 2: Structural Refactors (3-4 weeks, moderate risk)
**Focus:** Extract business logic, create service layer, reduce duplication

**Targets:**
1. **Extract team resolution** — `_lib/teamResolver.js` (used by 10 functions)
2. **Consolidate progress logic** — `_lib/progressService.js`
   - `getProgress(orgId, teamId, huntId)`
   - `setProgress(orgId, teamId, huntId, progress)`
   - `patchProgress(orgId, teamId, huntId, stopId, update)`
3. **Consolidate photo logic** — `_lib/photoService.js`
   - `uploadToCloudinary(file, metadata)`
   - `updateProgressWithPhoto(teamId, locationId, photoUrl)`
4. **Refactor `consolidated-active.js`** — Split into smaller functions
   - `fetchLocations(supabase, orgId, huntId)`
   - `fetchProgress(supabase, teamId)`
   - `fetchSponsors(supabase, orgId, huntId)`
   - `buildResponse(data)`
5. **Refactor `photo-upload-complete.js`** — Extract transaction logic
6. **Refactor `login-initialize.js`** — Extract config building
7. **Refactor `team-verify.js`** — Extract token generation

**Expected Impact:**
- 40-50% complexity reduction in large functions
- Testable business logic (isolated from HTTP concerns)
- Easier to add features (modify service, not handler)
- Better error handling (centralized in services)

### Phase 3: Performance & Security (2-3 weeks, low-moderate risk)
**Focus:** Optimize cold starts, add caching, improve observability

**Targets:**
1. **Add caching** — Cache hunt locations, settings (reduce DB calls)
2. **Optimize imports** — Tree-shake unused Supabase/Cloudinary methods
3. **Add retry logic** — Use `retryWithBackoff()` for all external calls
4. **Add rate limiting** — Protect against abuse (especially photo upload)
5. **Add request tracing** — Correlate logs with request IDs
6. **Add performance monitoring** — Track function execution time
7. **Security audit** — Ensure all inputs validated, secrets not logged
8. **Add comprehensive tests** — Aim for 80%+ coverage

**Expected Impact:**
- 20-30% faster cold starts (optimized imports)
- Better reliability (retry logic)
- Better security (rate limiting, validation)
- Better observability (structured logs, tracing)
- Confidence in changes (test coverage)

---

## Risk & Mitigation Strategy

### High-Risk Functions (Critical Path)
1. **photo-upload-complete.js** — Photo upload + progress update (atomic transaction)
2. **consolidated-active.js** — Primary data source for ActiveView
3. **progress-set-supabase.js** — Progress persistence
4. **team-verify.js** — Authentication gate

**Mitigation:**
- Write comprehensive integration tests BEFORE refactoring
- Deploy to staging environment first
- Use feature flags to toggle old/new implementations
- Monitor error rates closely after deployment
- Have rollback plan ready (revert commit)
- Extra QA testing on critical flows

### Medium-Risk Functions
- All consolidated endpoints (data aggregation)
- All progress functions (user data)
- Photo upload functions (large payloads)

**Mitigation:**
- Unit tests for extracted logic
- Integration tests with mocked Supabase
- Staged rollout (canary deployment)
- Monitor Sentry for errors

### Low-Risk Functions
- health.js, test-supabase.js, write-log.js
- KV store functions (internal use)
- Dev-only functions (team-setup.js)

**Mitigation:**
- Standard testing procedures
- Deploy during low-traffic periods

### Testing Recommendations
1. **Before refactoring:** Establish baseline (capture current behavior)
2. **During refactoring:** Write tests for new utilities/services
3. **After refactoring:** Integration tests for all endpoints
4. **Regression testing:** Compare responses before/after refactor

---

## Success Metrics

### Code Quality
- **LOC reduction:** Target 30-40% across flagged functions
- **Average complexity:** Reduce max complexity from 8-10 to 5 or below
- **Duplication:** Eliminate 80%+ of duplicate code
- **Test coverage:** Achieve 80%+ coverage for all functions

### Performance
- **Cold start time:** Reduce by 20-30% (optimized imports)
- **Function execution time:** Reduce by 15% (efficient queries)
- **Error rate:** Reduce by 50% (better validation, retry logic)
- **P95 latency:** Improve by 20%

### Developer Experience
- **Time to add endpoint:** 50% reduction (reusable patterns)
- **Debugging time:** 40% reduction (structured logs)
- **Onboarding time:** 30% reduction (clear patterns, docs)
- **Confidence:** 80%+ test coverage enables safe refactoring

### Reliability
- **Transient failure recovery:** 90%+ success rate (retry logic)
- **Input validation:** 100% of endpoints validated
- **Error handling:** 100% of endpoints return standardized errors
- **Security:** 0 hardcoded secrets, all inputs sanitized

---

## Detailed Function Analysis

### Critical Functions (Score > 20)

#### 1. photo-upload-complete.js (Score: 24) ⚠️ HIGHEST PRIORITY
- **LOC:** 376
- **Complexity:** 10
- **Issues:** 10
- **Key Problems:**
  - Exceeds LOC threshold (376 > 150)
  - High cyclomatic complexity (10)
  - Large inline transaction logic (150+ LOC)
  - No input validation schema
  - Duplicate Cloudinary config
  - No retry logic for Cloudinary upload
  - Error handling could be more granular
- **Refactor Actions:**
  1. Extract `uploadToCloudinary(file, metadata)` to `_lib/photoService.js`
  2. Extract `updateProgressWithPhoto(teamId, locationId, photoUrl)` to `_lib/progressService.js`
  3. Add Zod schema for multipart form validation
  4. Add retry logic for Cloudinary upload
  5. Split handler into smaller functions (parse, validate, upload, update, respond)
- **Effort:** 8 (major refactor)
- **Impact:** 9 (critical path, reliability improvement)
- **Risk:** 7 (core functionality, needs careful testing)

#### 2. consolidated-active.js (Score: 22) ⚠️ HIGH PRIORITY
- **LOC:** 257
- **Complexity:** 8
- **Issues:** 8
- **Key Problems:**
  - Exceeds LOC threshold (257 > 150)
  - Aggregates 4 different data sources (locations, progress, sponsors, config)
  - Complex path parsing logic
  - Inline sponsor fetching (50+ LOC)
  - Inline progress building (50+ LOC)
  - No caching (fetches everything on every request)
- **Refactor Actions:**
  1. Extract `fetchLocations(supabase, orgId, huntId)` to `_lib/locationsHelper.js` (already exists!)
  2. Extract `fetchProgress(supabase, teamId)` to `_lib/progressService.js`
  3. Extract `fetchSponsors(supabase, orgId, huntId)` to `_lib/sponsorsService.js`
  4. Extract `buildPublicConfig()` to `_lib/config.js`
  5. Add caching layer for locations and settings (rarely change)
- **Effort:** 6 (moderate refactor)
- **Impact:** 9 (primary data source, performance improvement)
- **Risk:** 7 (core functionality, high usage)

### High-Priority Functions (Score 15-20)

#### 3. team-verify.js (Score: 20)
- **LOC:** 228
- **Complexity:** 7
- **Issues:** 6
- **Key Problems:**
  - Exceeds LOC threshold (228 > 150)
  - Token generation logic inline
  - Device lock logic inline
  - No input validation schema
  - Duplicate team lookup logic
- **Refactor Actions:**
  1. Extract `generateLockToken(teamId, deviceId)` to `_lib/lockUtils.js` (already exists!)
  2. Extract `verifyTeamCode(code, orgId, huntId)` to `_lib/teamVerification.js` (already exists!)
  3. Add Zod schema for request body
  4. Use shared `resolveTeamId()` helper
- **Effort:** 5
- **Impact:** 8 (authentication, security)
- **Risk:** 7 (critical auth flow)

#### 4. login-initialize.js (Score: 19)
- **LOC:** 215
- **Complexity:** 7
- **Issues:** 6
- **Key Problems:**
  - Exceeds LOC threshold (215 > 150)
  - Large config building logic (80+ LOC)
  - No input validation
  - Session ID generation inline
- **Refactor Actions:**
  1. Extract `buildPublicConfig()` to `_lib/config.js`
  2. Extract `generateSessionId()` to `_lib/sessionUtils.js`
  3. Add Zod schema for request body
- **Effort:** 5
- **Impact:** 8 (initialization, config management)
- **Risk:** 6 (startup flow)

#### 5. progress-patch-supabase.js (Score: 19)
- **LOC:** 285
- **Complexity:** 8
- **Issues:** 7
- **Key Problems:**
  - Exceeds LOC threshold (285 > 150)
  - Duplicate team resolution logic
  - No input validation schema
  - Complex update logic inline
- **Refactor Actions:**
  1. Use shared `resolveTeamId()` helper
  2. Extract `patchStopProgress(teamId, locationId, update)` to `_lib/progressService.js`
  3. Add Zod schema for PATCH body
- **Effort:** 6
- **Impact:** 7 (progress updates)
- **Risk:** 6 (user data)

#### 6. photo-upload.js (Score: 18) ⚠️ LEGACY
- **LOC:** 312
- **Complexity:** 9
- **Issues:** 8
- **Status:** LEGACY FALLBACK (should be deprecated)
- **Recommendation:** Mark as deprecated, migrate all clients to `photo-upload-complete.js`

#### 7. photo-upload-orchestrated.js (Score: 18) ⚠️ FALLBACK
- **LOC:** 335
- **Complexity:** 9
- **Issues:** 9
- **Status:** FALLBACK (used when complete endpoint unavailable)
- **Recommendation:** Consider deprecating once `photo-upload-complete.js` is stable

---

## Quick Reference: Shared Utilities to Create

### High Priority (Phase 1)
1. **`_lib/pathParser.js`**
   ```js
   export function parsePathParams(path, pattern) {
     // Extract orgId, teamId, huntId from various path formats
   }
   ```

2. **`_lib/errorResponses.js`**
   ```js
   export function errorResponse(statusCode, error, details = null) {
     return {
       statusCode,
       headers: { 'Content-Type': 'application/json', ... },
       body: JSON.stringify({ error, details, timestamp: new Date().toISOString() })
     }
   }
   ```

3. **`_lib/inputValidation.js`**
   ```js
   import { z } from 'zod'
   
   export const ProgressSchema = z.object({
     progress: z.record(z.object({
       done: z.boolean(),
       photo: z.string().url().optional(),
       ...
     }))
   })
   ```

### Medium Priority (Phase 2)
4. **`_lib/teamResolver.js`**
   ```js
   export async function resolveTeamId(supabase, orgId, teamId, huntId) {
     // Returns team UUID from team_id
   }
   ```

5. **`_lib/progressService.js`**
   ```js
   export async function getProgress(supabase, teamId) { ... }
   export async function setProgress(supabase, teamId, progress) { ... }
   export async function patchProgress(supabase, teamId, locationId, update) { ... }
   ```

6. **`_lib/photoService.js`**
   ```js
   export async function uploadToCloudinary(file, metadata) { ... }
   export async function updateProgressWithPhoto(supabase, teamId, locationId, photoUrl) { ... }
   ```

7. **`_lib/config.js`**
   ```js
   export function getPublicConfig() {
     return {
       API_URL: process.env.API_URL || '',
       SUPABASE_URL: process.env.SUPABASE_URL || '',
       ...
     }
   }
   ```

---

## Notes

- **Priority:** Work from lowest Total Score to highest (best ROI)
- **Parallelization:** Phase 1 utilities can be created simultaneously
- **Testing:** Write tests for utilities before refactoring functions
- **Documentation:** Update function docs after each refactor
- **Rollback plan:** Always have a way to revert changes quickly
- **Monitoring:** Watch Sentry and CloudWatch logs after each deployment
- **Deprecation:** Mark legacy functions (photo-upload.js, photo-upload-orchestrated.js) for removal

---

**Generated:** 2025-09-30
**Analyst:** Claude (Sonnet 4.5)
**Prompt Version:** PROMPT-NETLIFY-FN-REFACTOR.md
**Source:** docs/ACTIVE-NETLIFY-FUNCTIONS.md
