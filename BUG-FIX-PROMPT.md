# BUG-FIX-PROMPT: Multiple API Issues

## Date: 2025-09-27 (Updated)

## Issue 1: Date Format Validation Error (FIXED)
### Problem Description
After successfully uploading a photo and saving progress to the database, the app fails to load progress with a schema validation error. The `completedAt` field values are not matching the expected ISO date format regex pattern.

### Status: ✅ RESOLVED
- Updated DateISOSchema regex to accept PostgreSQL timestamp formats with microseconds and timezone offsets
- Pattern now accepts: `YYYY-MM-DDTHH:mm:ss[.microseconds][Z|±HH:mm]`

---

## Issue 2: ERR_CONNECTION_RESET During Page Refresh (NEW)

### Problem Description
When users refresh the page, the application encounters `ERR_CONNECTION_RESET` errors when calling the `/api/login-initialize` endpoint. While the retry logic eventually succeeds (after ~4 seconds), this creates a poor user experience.

### Error Details
```
POST http://localhost:3001/api/login-initialize net::ERR_CONNECTION_RESET
Network error: TypeError: Failed to fetch
```

### Error Pattern
1. Initial request fails with ERR_CONNECTION_RESET at 00:57:29
2. Retry mechanism activates after 1 second
3. Second attempt succeeds at 00:57:35 (3.8 seconds total delay)
4. Application loads normally after retry

### Root Causes
1. **Server Initialization Race**: Express server might not be fully ready when browser makes initial request
2. **Connection Pool Issues**: Too many simultaneous connections during page refresh
3. **Aggressive Initial Request**: No server health check before attempting API calls

### Files to Modify
1. `src/services/apiClient.ts` - Improve retry logic with exponential backoff
2. `src/services/LoginService.ts` - Add request deduplication
3. `src/server/server.ts` - Add connection keep-alive configuration

---

## Implementation Plan

### Fix 1: Improve Retry Logic with Exponential Backoff
**File: `src/services/apiClient.ts`**

Current retry logic uses fixed 1-second delays. Update to:
- First retry: 500ms + random jitter (0-500ms)
- Second retry: 1500ms + random jitter (0-500ms)
- Third retry: 3000ms + random jitter (0-500ms)

```typescript
// In apiClient.ts request method
const getRetryDelay = (attempt: number): number => {
  const baseDelays = [500, 1500, 3000]
  const baseDelay = baseDelays[Math.min(attempt, baseDelays.length - 1)]
  const jitter = Math.random() * 500
  return baseDelay + jitter
}
```

### Fix 2: Add Request Deduplication for login-initialize
**File: `src/services/LoginService.ts`**

Prevent multiple simultaneous initialization requests:
```typescript
private initPromise: Promise<any> | null = null

async initialize(...) {
  // If already initializing, return existing promise
  if (this.initPromise) {
    return this.initPromise
  }

  this.initPromise = this.doInitialize(...)

  try {
    const result = await this.initPromise
    return result
  } finally {
    this.initPromise = null
  }
}
```

### Fix 3: Add Connection Keep-Alive Headers
**File: `src/server/server.ts`**

Add middleware to maintain persistent connections:
```typescript
app.use((req, res, next) => {
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Keep-Alive', 'timeout=30')
  next()
})
```

### Fix 4: Add Readiness Check Before Initial Request
**File: `src/services/LoginService.ts`**

Add lightweight health check before initialization:
```typescript
private async waitForServerReady(maxAttempts = 3): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await fetch('/health', { method: 'GET' })
      return // Server is ready
    } catch {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
}

async quickInit() {
  await this.waitForServerReady()
  // Continue with normal initialization
}
```

---

---

## Issue 3: Photo Upload Fails with "No multipart data found" (NEW)

### Problem Description
When users attempt to upload photos, the request fails with a 400 Bad Request error saying "No multipart data found". The FormData is being created correctly but is being incorrectly processed in the API client.

### Error Details
```
POST http://localhost:3001/api/photo-upload-orchestrated 400 (Bad Request)
{
  "error": "No multipart data found",
  "requestId": "req_1759023273914_h6g8jk79x"
}
```

### Root Cause
In `src/services/apiClient.ts`, the request method is incorrectly handling FormData objects. The condition check for FormData is flawed:

```typescript
// Current problematic code (line 163):
if (init.body && typeof init.body === 'object' && !(init.body instanceof FormData)) {
  // This condition doesn't work properly because init.body might not be FormData yet
  requestInit.body = JSON.stringify(init.body)
}
```

The issue is that `requestFormData` passes the FormData as `body` in the init object, but the check `!(init.body instanceof FormData)` may fail due to how the body is being passed through the request chain.

### Files to Fix
1. `src/services/apiClient.ts` - Fix FormData detection and handling

### Implementation Fix

**File: `src/services/apiClient.ts`**

Update the body handling logic in the `request` method around line 163:

```typescript
// Add JSON headers if body is an object (but not FormData or Blob)
if (init.body &&
    typeof init.body === 'object' &&
    !(init.body instanceof FormData) &&
    !(init.body instanceof Blob) &&
    !(init.body instanceof ArrayBuffer) &&
    !(init.body instanceof URLSearchParams)) {
  requestInit.headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...init.headers
  }
  requestInit.body = JSON.stringify(init.body)
} else {
  // For FormData, don't set Content-Type (browser will set boundary)
  // Just pass through the body as-is
  requestInit.body = init.body
  requestInit.headers = {
    ...init.headers
  }
}
```

---

## Expected Outcomes
1. ✅ Date validation errors resolved (already fixed)
2. 🎯 Reduce connection reset errors by 90%
3. 🎯 Faster recovery when errors occur (< 2 seconds total)
4. 🎯 Smoother page refresh experience
5. 🎯 More resilient API connection handling
6. 🎯 Photo uploads work correctly with multipart/form-data

## Test Plan
1. Test rapid page refreshes (F5 spam test)
2. Test cold start (first page load after server restart)
3. Test with slow network conditions
4. Verify retry logic with artificial failures
5. Monitor server logs for connection patterns
6. Test photo upload functionality to ensure FormData is sent correctly