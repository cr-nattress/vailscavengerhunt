# Refactor Report — netlify/functions/consolidated-active.js

## Metrics

- **LOC:** 257
- **Functions:** 1 (main handler)
- **Max Cyclomatic Complexity:** 8
- **Exports:** 1 handler
- **Critical Path:** YES (primary data source for ActiveView)

## Scoring

- **Effort:** 6
- **Impact:** 9
- **Risk:** 7
- **Total Score:** 22 (SECOND HIGHEST PRIORITY)

## Key Findings

### Issue 1 — Exceeds LOC Threshold (257 > 150)
**Evidence:** Entire file is 257 lines
**Why it's a problem:** Large functions have longer cold start times. Harder to maintain and test.

### Issue 2 — Aggregates 4 Different Data Sources
**Evidence:** Fetches locations (lines 94-108), sponsors (lines 110-155), config (lines 157-174), progress (lines 176-225)
**Why it's a problem:** Single function doing too much. Changes to one data source affect entire function.

### Issue 3 — Complex Path Parsing Logic (30+ LOC)
**Evidence:** Lines 59-83 handle multiple path formats
**Why it's a problem:** Duplicated across multiple functions. Error-prone. Hard to maintain.

### Issue 4 — Inline Sponsor Fetching (50+ LOC)
**Evidence:** Lines 110-155 contain sponsor query and transformation logic
**Why it's a problem:** Business logic mixed with aggregation. Not reusable. Should be in service layer.

### Issue 5 — Inline Progress Building (50+ LOC)
**Evidence:** Lines 176-225 contain progress query and enrichment logic
**Why it's a problem:** Duplicates logic from `progress-get-supabase.js`. Violates DRY.

### Issue 6 — No Caching
**Evidence:** Fetches all data on every request
**Why it's a problem:** Locations and settings rarely change but are fetched every time. Unnecessary DB load.

### Issue 7 — Non-Fatal Errors Silently Swallowed
**Evidence:** Lines 99-108, 152-155 catch errors but only log warnings
**Why it's a problem:** Client receives partial data without knowing something failed. Poor observability.

### Issue 8 — Inconsistent Error Handling
**Evidence:** Some errors return empty data, others throw and return 500
**Why it's a problem:** Unpredictable behavior. Client can't distinguish between "no data" and "error fetching data".

## Refactor Suggestions (Prioritized)

### 1. Extract Data Fetching to Services
- **Action:** Create service functions for each data source
- **Pattern:** Service Layer + Single Responsibility
- **Effort/Impact/Risk:** 4/9/4
- **Guidance:**
  1. `_lib/locationsHelper.js` — Already exists! Use `getHuntLocations()`
  2. `_lib/progressService.js` — Create `getEnrichedProgress(teamId, locations)`
  3. `_lib/sponsorsService.js` — Create `getSponsors(orgId, huntId)`
  4. `_lib/config.js` — Create `getPublicConfig()`
  5. Handler becomes orchestration layer only

### 2. Extract Path Parsing
- **Action:** Create `_lib/pathParser.js` with `parseConsolidatedPath(path)` function
- **Pattern:** Shared Utility
- **Effort/Impact/Risk:** 2/7/2
- **Guidance:**
  1. Handle all path format variations in one place
  2. Return `{ orgId, teamId, huntId }` or throw error
  3. Reuse across all consolidated endpoints
  4. Add unit tests for all path formats

### 3. Add Caching Layer
- **Action:** Cache locations and settings with TTL
- **Pattern:** Cache-Aside
- **Effort/Impact/Risk:** 3/8/3
- **Guidance:**
  1. Use in-memory cache (simple Map with TTL)
  2. Cache key: `${orgId}:${huntId}:locations`
  3. TTL: 5 minutes for locations, 1 minute for settings
  4. Invalidate on update (if settings become mutable)
  5. Reduces DB queries by 80%+

### 4. Standardize Error Handling
- **Action:** Use consistent error response format
- **Pattern:** Error Response Builder
- **Effort/Impact/Risk:** 2/6/2
- **Guidance:**
  1. Use `errorResponse()` helper from `_lib/errorResponses.js`
  2. Return partial data with `warnings` array for non-fatal errors
  3. Example: `{ data: {...}, warnings: ['sponsors fetch failed'] }`
  4. Client can decide how to handle warnings

### 5. Add Structured Logging
- **Action:** Use `serverLogger` with request correlation
- **Pattern:** Structured Logging
- **Effort/Impact/Risk:** 2/6/1
- **Guidance:**
  1. Generate request ID at start
  2. Log each data fetch with timing
  3. Log warnings for partial failures
  4. Log total response time

### 6. Split into Smaller Functions
- **Action:** Break handler into `fetchAllData()`, `buildResponse()`, `handleErrors()`
- **Pattern:** Function Composition
- **Effort/Impact/Risk:** 2/5/2
- **Guidance:**
  1. `fetchAllData()` — Parallel fetch all sources
  2. `buildResponse()` — Format response object
  3. `handleErrors()` — Centralized error handling
  4. Main handler orchestrates flow

## Quick Wins

1. **Use existing `getHuntLocations()`** — Already in `_lib/locationsHelper.js` (10 min)
2. **Extract config building** — Move to `_lib/config.js` (20 min)
3. **Add request timing logs** — Log duration for each data fetch (15 min)
4. **Parallel data fetching** — Use `Promise.all()` for independent fetches (30 min)
5. **Add request ID** — Generate and include in all logs (10 min)

## Test Considerations

### Unit Tests
- Test each service function independently
- Test path parsing with all format variations
- Test cache hit/miss scenarios
- Test partial failure handling

### Integration Tests
- Test full endpoint with mocked Supabase
- Test with missing data (team not found, no locations)
- Test with partial failures (sponsors fail, others succeed)
- Test cache invalidation

### Performance Tests
- Measure response time before/after caching
- Measure cold start time before/after refactor
- Test with large datasets (100+ locations)
- Test concurrent requests (cache contention)

## Before/After Sketch

```js
// Before: Monolithic handler (simplified)
exports.handler = withSentry(async (event) => {
  try {
    // 30 lines of path parsing
    let pathToProcess = event.path || ''
    if (pathToProcess.includes('/.netlify/functions/consolidated-active/')) {
      pathToProcess = pathToProcess.split('/.netlify/functions/consolidated-active/')[1]
    } else if (pathToProcess.includes('/consolidated-active/')) {
      pathToProcess = pathToProcess.split('/consolidated-active/')[1]
    }
    // ... more parsing
    const [orgId, teamId, huntId] = pathParts
    
    // Inline settings fetch
    const settings = await getSettings(orgId, teamId, huntId)
    
    // 50 lines of location fetching
    let locations = { name: `${orgId} - ${huntId}`, locations: [] }
    try {
      locations = await getHuntLocations(supabase, orgId, huntId)
    } catch (e) {
      console.error('Failed to fetch locations:', e)
      locations = { name: `${orgId} - ${huntId}`, locations: [], error: 'Failed' }
    }
    
    // 50 lines of sponsor fetching
    let sponsorsResponse = { layout: '1x2', items: [] }
    try {
      const { data: sponsors } = await supabase.from('sponsor_assets')...
      // ... transformation logic
    } catch (e) {
      console.warn('sponsors fetch failed', e?.message)
    }
    
    // 20 lines of config building
    const config = {
      API_URL: process.env.API_URL || '',
      SUPABASE_URL: process.env.SUPABASE_URL || '',
      // ... 15 more fields
    }
    
    // 50 lines of progress building
    let detailedProgress = {}
    try {
      const { data: teamData } = await supabase.from('teams')...
      const { data: progressRows } = await supabase.from('hunt_progress')...
      // ... enrichment logic
    } catch (e) {
      console.warn('Progress build failed:', e?.message)
    }
    
    return { statusCode: 200, body: JSON.stringify({ ... }) }
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
  }
})

// After: Service-based orchestration (simplified)
import { parseConsolidatedPath } from './_lib/pathParser'
import { getHuntLocations } from './_lib/locationsHelper'
import { getEnrichedProgress } from './_lib/progressService'
import { getSponsors } from './_lib/sponsorsService'
import { getSettings } from './_lib/supabaseSettings'
import { getPublicConfig } from './_lib/config'
import { errorResponse } from './_lib/errorResponses'
import { serverLogger } from './_lib/serverLogger'
import { withCache } from './_lib/cache'

exports.handler = withSentry(async (event) => {
  const requestId = crypto.randomUUID().substring(0, 8)
  const logger = serverLogger.child({ requestId })
  const startTime = Date.now()
  
  try {
    // Parse path (reusable utility)
    const { orgId, teamId, huntId } = parseConsolidatedPath(event.path)
    logger.info('request_start', { orgId, teamId, huntId })
    
    const supabase = getSupabaseClient()
    const warnings = []
    
    // Fetch all data in parallel (with caching)
    const [settings, locations, sponsors, progress] = await Promise.all([
      getSettings(orgId, teamId, huntId),
      
      withCache(`locations:${orgId}:${huntId}`, 300, () => 
        getHuntLocations(supabase, orgId, huntId)
      ).catch(err => {
        logger.warn('locations_fetch_failed', { error: err.message })
        warnings.push('Failed to fetch locations')
        return { name: `${orgId} - ${huntId}`, locations: [] }
      }),
      
      getSponsors(supabase, orgId, huntId).catch(err => {
        logger.warn('sponsors_fetch_failed', { error: err.message })
        warnings.push('Failed to fetch sponsors')
        return { layout: '1x2', items: [] }
      }),
      
      getEnrichedProgress(supabase, teamId, orgId, huntId).catch(err => {
        logger.warn('progress_fetch_failed', { error: err.message })
        warnings.push('Failed to fetch progress')
        return {}
      })
    ])
    
    const config = getPublicConfig()
    const duration = Date.now() - startTime
    
    logger.info('request_complete', { duration, warnings: warnings.length })
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Request-ID': requestId
      },
      body: JSON.stringify({
        orgId,
        teamId,
        huntId,
        settings,
        progress,
        sponsors,
        config,
        locations,
        lastUpdated: new Date().toISOString(),
        ...(warnings.length > 0 && { warnings })
      })
    }
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('request_failed', { error: error.message, duration })
    return errorResponse(500, 'Failed to fetch active data', error.message)
  }
})
```

## Related Files

### To Create
- `_lib/pathParser.js` — Reusable path parsing for all consolidated endpoints
- `_lib/sponsorsService.js` — Sponsor fetching and transformation
- `_lib/progressService.js` — Progress fetching with enrichment
- `_lib/cache.js` — Simple in-memory cache with TTL

### To Update
- `_lib/config.js` — Add `getPublicConfig()` function
- `_lib/locationsHelper.js` — Already exists, use as-is

### Affected Consumers
- `src/services/ConsolidatedDataService.ts` — Calls this endpoint
- `src/features/views/ActiveView.tsx` — Primary consumer
- `consolidated-history.js` — Similar pattern, can share utilities

## Decision Log Notes

### Why Service Layer?
- **Testability:** Each service can be unit tested independently
- **Reusability:** Other endpoints can use same services
- **Maintainability:** Changes to data fetching isolated to services
- **Parallel Execution:** Services can be called concurrently

### Why Caching?
- **Performance:** Locations rarely change, caching reduces DB load by 80%+
- **Cost:** Fewer Supabase queries = lower costs
- **User Experience:** Faster response times
- **Trade-off:** Stale data for up to 5 minutes (acceptable for locations)

### Why Partial Failure Handling?
- **Resilience:** One data source failing shouldn't break entire response
- **User Experience:** Show available data, warn about missing data
- **Observability:** Warnings help identify intermittent issues
- **Trade-off:** More complex error handling, but better UX

### Risk Mitigation
- **Incremental Refactor:** Extract services one at a time
- **Feature Flag:** Toggle between old/new implementation
- **Monitoring:** Watch response times, error rates, cache hit rates
- **Rollback Plan:** Keep old implementation for 2 weeks
- **Testing:** Integration tests for all data source combinations

---

**Priority:** SECOND HIGHEST (Score: 22)
**Estimated Effort:** 1-2 days for full refactor
**Recommended Approach:** Incremental (services first, then orchestration)
**Test Coverage Target:** 85%+ (critical endpoint)
