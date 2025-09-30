# Refactor Report — netlify/functions/photo-upload-complete.js

## Metrics

- **LOC:** 376
- **Functions:** 4 (handler + 3 helpers)
- **Max Cyclomatic Complexity:** 10
- **Exports:** 1 handler, 3 utility functions
- **Critical Path:** YES (photo upload + progress update)

## Scoring

- **Effort:** 8
- **Impact:** 9
- **Risk:** 7
- **Total Score:** 24 (HIGHEST PRIORITY)

## Key Findings

### Issue 1 — Exceeds LOC Threshold (376 > 150)
**Evidence:** Entire file is 376 lines
**Why it's a problem:** Large functions are harder to test, debug, and maintain. Cold start time increases with file size.

### Issue 2 — High Cyclomatic Complexity (10)
**Evidence:** Main handler has 10+ decision branches (validation, parsing, upload, update, error handling)
**Why it's a problem:** Complex functions are error-prone and hard to reason about. Difficult to achieve full test coverage.

### Issue 3 — Large Inline Transaction Logic (150+ LOC)
**Evidence:** Lines 102-250 contain inline photo upload + progress update logic
**Why it's a problem:** Business logic mixed with HTTP concerns. Not reusable. Hard to test in isolation.

### Issue 4 — No Input Validation Schema
**Evidence:** Manual field checking without schema validation
**Why it's a problem:** Security risk. Malformed inputs can cause runtime errors. No type safety.

### Issue 5 — Duplicate Cloudinary Configuration
**Evidence:** Cloudinary config scattered throughout function
**Why it's a problem:** Violates DRY. Changes require updates in multiple places.

### Issue 6 — No Retry Logic for Cloudinary Upload
**Evidence:** Single attempt to upload to Cloudinary (line ~180)
**Why it's a problem:** Transient network failures cause permanent upload failures. Poor reliability.

### Issue 7 — Error Handling Could Be More Granular
**Evidence:** Generic catch-all error handler (line 340+)
**Why it's a problem:** Can't distinguish between validation errors, upload errors, and database errors. Poor observability.

### Issue 8 — Missing Structured Logging
**Evidence:** Inconsistent `console.log` statements
**Why it's a problem:** Hard to trace requests. No correlation IDs. Difficult to debug in production.

### Issue 9 — No Idempotency Check Before Upload
**Evidence:** Idempotency key generated but not checked against existing uploads
**Why it's a problem:** Duplicate uploads waste Cloudinary bandwidth and storage.

### Issue 10 — Atomic Transaction Not Truly Atomic
**Evidence:** Photo upload succeeds but progress update can fail (no rollback)
**Why it's a problem:** Inconsistent state. Photo exists in Cloudinary but not in database.

## Refactor Suggestions (Prioritized)

### 1. Extract Photo Upload Service
- **Action:** Create `_lib/photoService.js` with `uploadToCloudinary(file, metadata)` function
- **Pattern:** Service Layer + Single Responsibility
- **Effort/Impact/Risk:** 3/9/3
- **Guidance:**
  1. Move Cloudinary upload logic to service
  2. Add retry logic with exponential backoff
  3. Add idempotency check (query existing uploads by key)
  4. Return structured result `{ success, photoUrl, publicId, cached }`
  5. Import service in handler

### 2. Extract Progress Update Service
- **Action:** Create `_lib/progressService.js` with `updateProgressWithPhoto(teamId, locationId, photoUrl)` function
- **Pattern:** Service Layer + Single Responsibility
- **Effort/Impact/Risk:** 3/8/4
- **Guidance:**
  1. Move Supabase progress update logic to service
  2. Handle team UUID resolution internally
  3. Add validation for required fields
  4. Return structured result `{ success, progress }`
  5. Import service in handler

### 3. Add Input Validation with Zod
- **Action:** Create Zod schema for multipart form data in `_lib/inputValidation.js`
- **Pattern:** Schema Validation
- **Effort/Impact/Risk:** 2/8/2
- **Guidance:**
  1. Define schema for all required fields (locationId, teamId, orgId, huntId, sessionId, locationTitle)
  2. Define schema for file (type, size limits)
  3. Validate before processing
  4. Return 400 with detailed validation errors

### 4. Implement True Atomic Transaction
- **Action:** Add rollback logic if progress update fails after upload
- **Pattern:** Compensating Transaction
- **Effort/Impact/Risk:** 4/9/5
- **Guidance:**
  1. After Cloudinary upload succeeds, save photoUrl
  2. Attempt progress update
  3. If update fails, delete photo from Cloudinary (rollback)
  4. Return error to client
  5. Log transaction outcome

### 5. Split Handler into Smaller Functions
- **Action:** Break handler into `parseRequest()`, `validateRequest()`, `uploadPhoto()`, `updateProgress()`, `buildResponse()`
- **Pattern:** Function Composition
- **Effort/Impact/Risk:** 3/7/3
- **Guidance:**
  1. Each function handles one concern
  2. Functions return structured results or throw errors
  3. Main handler orchestrates flow
  4. Easier to test each step in isolation

### 6. Add Structured Logging
- **Action:** Use `serverLogger` from `_lib/serverLogger.js` with correlation IDs
- **Pattern:** Structured Logging
- **Effort/Impact/Risk:** 2/6/1
- **Guidance:**
  1. Generate request ID at start
  2. Log all steps with context (requestId, teamId, locationId)
  3. Log timing for each step
  4. Log errors with full context

### 7. Add Retry Logic for External Calls
- **Action:** Use `retryWithBackoff()` from `_lib/retryHelpers.js` for Cloudinary and Supabase
- **Pattern:** Retry with Exponential Backoff
- **Effort/Impact/Risk:** 2/7/2
- **Guidance:**
  1. Wrap Cloudinary upload in retry (3 attempts, 1s/2s/4s backoff)
  2. Wrap Supabase update in retry (2 attempts, 1s/2s backoff)
  3. Log retry attempts
  4. Return error after max retries

## Quick Wins

1. **Add request ID logging** — Generate UUID at start, include in all logs (15 min)
2. **Extract Cloudinary config** — Move to `_lib/config.js` (30 min)
3. **Add file size validation** — Reject files > MAX_UPLOAD_BYTES early (15 min)
4. **Standardize error responses** — Use `errorResponse()` helper (30 min)
5. **Add timing logs** — Log duration for upload and update steps (20 min)

## Test Considerations

### Unit Tests
- Test `uploadToCloudinary()` with mocked Cloudinary SDK
- Test `updateProgressWithPhoto()` with mocked Supabase client
- Test input validation schema with valid/invalid inputs
- Test retry logic with simulated failures

### Integration Tests
- Test full flow with test Cloudinary account
- Test rollback when progress update fails
- Test idempotency (same file uploaded twice)
- Test error handling for various failure modes

### E2E Tests
- Upload photo from UI, verify it appears in history
- Upload large file, verify rejection
- Upload with invalid team ID, verify error
- Upload while offline, verify retry behavior

## Before/After Sketch

```js
// Before: Inline logic (simplified)
exports.handler = async (event) => {
  try {
    const parts = multipart.parse(bodyBuffer, boundary)
    let fileBuffer, metadata = {}
    for (const part of parts) {
      if (part.name === 'photo') fileBuffer = part.data
      else metadata[part.name] = part.data.toString()
    }
    
    // 50+ lines of validation
    if (!fileBuffer) throw new Error('No photo')
    if (!metadata.locationId) throw new Error('Missing locationId')
    // ... more validation
    
    // 50+ lines of Cloudinary upload
    const uploadResult = await cloudinary.uploader.upload(...)
    
    // 50+ lines of progress update
    const supabase = getSupabaseClient()
    const { data: teamData } = await supabase.from('teams').select('id')...
    await supabase.from('hunt_progress').upsert(...)
    
    return { statusCode: 200, body: JSON.stringify({ photoUrl: uploadResult.url }) }
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
  }
}

// After: Service-based (simplified)
import { uploadToCloudinary } from './_lib/photoService'
import { updateProgressWithPhoto } from './_lib/progressService'
import { PhotoUploadSchema } from './_lib/inputValidation'
import { errorResponse } from './_lib/errorResponses'
import { serverLogger } from './_lib/serverLogger'

exports.handler = withSentry(async (event) => {
  const requestId = crypto.randomUUID().substring(0, 8)
  const logger = serverLogger.child({ requestId })
  
  try {
    // Parse and validate
    const { file, metadata } = await parseMultipartRequest(event)
    const validated = PhotoUploadSchema.parse(metadata)
    
    logger.info('upload_start', { teamId: validated.teamId, locationId: validated.locationId })
    
    // Upload photo (with retry)
    const uploadResult = await uploadToCloudinary(file, {
      orgId: validated.orgId,
      huntId: validated.huntId,
      locationTitle: validated.locationTitle,
      sessionId: validated.sessionId
    })
    
    logger.info('upload_success', { photoUrl: uploadResult.photoUrl })
    
    // Update progress (with rollback on failure)
    try {
      const progressResult = await updateProgressWithPhoto(
        validated.teamId,
        validated.locationId,
        uploadResult.photoUrl
      )
      
      logger.info('progress_updated', { locationId: validated.locationId })
      
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          photoUrl: uploadResult.photoUrl,
          publicId: uploadResult.publicId,
          progress: progressResult.progress,
          progressUpdated: true
        })
      }
    } catch (progressError) {
      // Rollback: delete photo from Cloudinary
      logger.error('progress_update_failed', { error: progressError.message })
      await deleteFromCloudinary(uploadResult.publicId)
      throw progressError
    }
  } catch (error) {
    logger.error('upload_failed', { error: error.message, stack: error.stack })
    return errorResponse(500, 'Photo upload failed', error.message)
  }
}
```

## Related Files

### To Create
- `_lib/photoService.js` — Cloudinary upload with retry and idempotency
- `_lib/progressService.js` — Progress update operations
- `_lib/inputValidation.js` — Zod schemas for all endpoints

### To Update
- `_lib/config.js` — Add Cloudinary config
- `_lib/retryHelpers.js` — Ensure retry logic exists
- `_lib/errorResponses.js` — Standardized error builder

### Affected Consumers
- `src/hooks/usePhotoUpload.ts` — Calls this endpoint
- `src/client/PhotoUploadService.ts` — Wraps this endpoint
- `photo-upload-orchestrated.js` — Similar logic (can share services)

## Decision Log Notes

### Why Service Layer?
- **Testability:** Services can be unit tested without HTTP mocking
- **Reusability:** Other functions can use same upload/progress logic
- **Separation of Concerns:** HTTP handling separate from business logic
- **Easier to Mock:** Tests can mock services instead of entire handler

### Why Rollback on Failure?
- **Data Consistency:** Prevents orphaned photos in Cloudinary
- **User Experience:** Clear error message, no partial state
- **Cost:** Avoids paying for unused Cloudinary storage
- **Trade-off:** Adds complexity, but worth it for reliability

### Why Zod for Validation?
- **Type Safety:** Generates TypeScript types from schemas
- **Better Errors:** Detailed validation error messages
- **Composable:** Can reuse schemas across functions
- **Industry Standard:** Well-maintained, widely used

### Risk Mitigation
- **Staged Rollout:** Deploy to 10% of users first
- **Feature Flag:** Toggle between old/new implementation
- **Monitoring:** Watch error rates, upload success rates
- **Rollback Plan:** Keep old implementation for 2 weeks
- **Extra Testing:** Manual QA on all photo upload flows

---

**Priority:** HIGHEST (Score: 24)
**Estimated Effort:** 2-3 days for full refactor
**Recommended Approach:** Incremental (services first, then handler)
**Test Coverage Target:** 90%+ (critical path)
