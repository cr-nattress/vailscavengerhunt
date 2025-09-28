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

## Issue 4: Missing Photo Upload Orchestrated Endpoint (NEW - FROM api-errors-2.md)

### Problem Description
The application is failing to upload photos due to a missing backend endpoint `/api/photo-upload-orchestrated`. When users attempt to upload photos, they receive a 404 error. This endpoint was referenced in Issue 3 but doesn't actually exist on the server.

### Error Details
- **Error Type**: HTTP 404 Not Found
- **Endpoint**: POST `/api/photo-upload-orchestrated`
- **Error Message**: "Cannot POST /api/photo-upload-orchestrated"
- **Affected Feature**: Photo upload functionality in the scavenger hunt app
- **Environment**: Development (localhost:3001)
- **File Size Attempted**: 1.37MB (1366560 bytes)
- **Stop**: stop_4 - "Public Art / Sculpture"

### Technical Details
- **Frontend URL**: http://localhost:5175/
- **Backend URL**: http://localhost:3001/api
- **Request Method**: POST
- **Content Type**: multipart/form-data; boundary=----WebKitFormBoundaryCKCsd45B563zvHHQ
- **Content Length**: 1367720
- **Idempotency Key Generated**: 79d6160783e353e8

### Error Stack Trace
```
POST http://localhost:3001/api/photo-upload-orchestrated 404 (Not Found)
    at ApiClient.createApiError (apiClient.ts:113:19)
    at ApiClient.request (apiClient.ts:219:22)
    at async PhotoUploadService.uploadPhotoOrchestrated (PhotoUploadService.ts:118:27)
    at async usePhotoUpload.ts:101:20
    at async handlePhotoUpload (ActiveView.tsx:264:5)
    at async handlePhotoUpload (StopCard.tsx:41:7)
```

### Affected Files
- `src/services/PhotoUploadService.ts` - Line 118: Makes the API call to the missing endpoint
- `src/components/ActiveView.tsx` - Line 264: Handles photo upload
- `src/components/StopCard.tsx` - Line 41: Initiates upload
- `src/hooks/usePhotoUpload.ts` - Line 101: Uses orchestrated upload
- **MISSING**: `src/server/server.ts` - Needs the `/api/photo-upload-orchestrated` route

### Root Cause
The backend server at `src/server/server.ts` is missing the `/api/photo-upload-orchestrated` route handler. The frontend is attempting to use an orchestrated upload pattern (with saga/compensation for reliability) but the endpoint doesn't exist on the server.

### Implementation Fix

**File: `src/server/server.ts`**

Add the missing endpoint to handle orchestrated photo uploads:

```typescript
// Add this route to handle orchestrated photo uploads
app.post('/api/photo-upload-orchestrated', upload.single('photo'), async (req, res) => {
  try {
    // Extract metadata from the request
    const { org, team, hunt, stopId, stopTitle } = req.body
    const idempotencyKey = req.body.idempotencyKey || req.headers['idempotency-key']

    // Check for duplicate requests using idempotency key
    if (idempotencyKey) {
      // Check if this request was already processed
      // (implement idempotency check logic here)
    }

    // Validate multipart data
    if (!req.file) {
      return res.status(400).json({
        error: 'No photo file provided',
        requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      })
    }

    // Process the photo upload
    const photoUrl = await uploadToStorage(req.file, {
      org,
      team,
      hunt,
      stopId,
      stopTitle
    })

    // Return success response
    res.json({
      success: true,
      photoUrl,
      stopId,
      timestamp: new Date().toISOString(),
      idempotencyKey
    })

  } catch (error) {
    console.error('Photo upload orchestrated error:', error)
    res.status(500).json({
      error: 'Failed to upload photo',
      requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    })
  }
})
```

### Steps to Reproduce
1. Open the application at http://localhost:5175/
2. Navigate to a stop (e.g., "Public Art / Sculpture" - stop_4)
3. Attempt to upload a photo
4. Observe 404 error in console

### Console Logs (Full Error Sequence)
```
photoFlowLogger.ts:30 [PhotoFlowLogger] INFO usePhotoUpload:upload_start {stopId: 'stop_4', stopTitle: 'Public Art / Sculpture', fileType: 'file', fileSize: 1366560}
usePhotoUpload.ts:100 Using orchestrated upload endpoint (with saga/compensation)
PhotoUploadService.ts:80 📸 PhotoUploadService.uploadPhotoOrchestrated() called
PhotoUploadService.ts:97 🔑 Generated idempotency key: 79d6160783e353e8
PhotoUploadService.ts:113 📦 FormData created for orchestrated upload
PhotoUploadService.ts:116 🌐 Making orchestrated API request...
ConsoleSink.ts:124 [2025-09-28T05:11:01.149Z] [INFO ] [#legacy-logger #api-client] [session:client_1] Request started
  Context: {
  "component": "api-client",
  "method": "POST",
  "url": "http://localhost:3001/api/photo-upload-orchestrated",
  "message": "🌐 API Request: POST http://localhost:3001/api/photo-upload-orchestrated"
}
globalErrorHandler.js:49   POST http://localhost:3001/api/photo-upload-orchestrated 404 (Not Found)
ConsoleSink.ts:124 [2025-09-28T05:11:01.161Z] [INFO ] [#legacy-logger #api-client] [session:client_1] Response received
  Context: {
  "component": "api-client",
  "message": "📥 Response: 404 Not Found",
  "status": 404,
  "statusText": "Not Found",
  "duration": 12
}
ConsoleSink.ts:130  [2025-09-28T05:11:01.162Z] [ERROR] [#legacy-logger #api-client] [session:client_1] Non-OK response: 404 Not Found
  Context: {
  "component": "api-client",
  "status": 404,
  "statusText": "Not Found",
  "responseBody": "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<title>Error</title>\n</head>\n<body>\n<pre>Cannot POST /api/photo-upload-orchestrated</pre>\n</body>\n</html>\n"
}
PhotoUploadService.ts:133  💥 Orchestrated upload error: ApiError: HTTP 404: Not Found
usePhotoUpload.ts:158  Photo upload failed: ApiError: HTTP 404: Not Found
ActiveView.tsx:145  Failed to upload photo for stop stop_4: ApiError: HTTP 404: Not Found
```

### Network Request Details
```
Request URL: http://localhost:3001/api/photo-upload-orchestrated
Request Method: POST
Status Code: 404 Not Found
Remote Address: [::1]:3001
Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryCKCsd45B563zvHHQ
Content-Length: 1367720
Origin: http://localhost:5175
Referer: http://localhost:5175/
User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/140.0.0.0
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
7. Test photo upload with orchestrated endpoint implementation

---

## Full Console Logs from api-errors-2.md

```
Download the React DevTools for a better development experience: https://reactjs.org/link/react-devtools
ConsoleSink.ts:124 [2025-09-28T05:08:52.139Z] [INFO ] [#legacy-logger #api-client] [session:client_1] 🌐 Development mode, using local server
  Context: {
  "component": "api-client",
  "devUrl": "http://localhost:3001/api"
}
initSentryClient.ts:33 [Sentry] Browser client initialized in offline mode (no DSN)
globalErrorHandler.js:96 [GlobalErrorHandler] Error handlers installed
App.jsx:65 [URL] No valid path params detected; app remains unlocked
App.jsx:118 🚀 Org and hunt set, settings will be initialized after team verification
App.jsx:122 📊 Session ID generated: 7df48585-d7ae-46f9-816a-ec7164d62575
App.jsx:126 🧪 Sending Sentry test log...
App.jsx:138 ✅ Sentry test log sent successfully
TeamLockWrapper.tsx:63 Existing team lock detected, initializing settings for: simba
LoginService.ts:137 [LoginService] Initializing with: Object
ConsoleSink.ts:124 [2025-09-28T05:08:52.189Z] [INFO ] [#legacy-logger #api-client] [session:client_1] Request started
  Context: {
  "component": "api-client",
  "method": "POST",
  "url": "http://localhost:3001/api/login-initialize",
  "message": "🌐 API Request: POST http://localhost:3001/api/login-initialize"
}
ConsoleSink.ts:124 [2025-09-28T05:08:52.604Z] [INFO ] [#legacy-logger #api-client] [session:client_1] Response received
  Context: {
  "component": "api-client",
  "message": "📥 Response: 200 OK",
  "status": 200,
  "statusText": "OK",
  "duration": 414
}
useActiveData.ts:33 [useActiveData] Fetching consolidated data...
ConsolidatedDataService.ts:34 [ConsolidatedDataService] Fetching active data for bhhs/simba/fall-2025
ConsolidatedDataService.ts:80 [ConsolidatedDataService] Active data fetched successfully: Object
useActiveData.ts:38 [useActiveData] Data loaded successfully: Object
SponsorCard.tsx:166 [SponsorSVG] Rendering SVG for: Chalk Digital SVG length: 48833
SponsorCard.tsx:175 [SponsorSVG] Sanitized SVG: <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" zoomA...
SponsorCard.tsx:166 [SponsorSVG] Rendering SVG for: MAXA SVG length: 193686
SponsorCard.tsx:175 [SponsorSVG] Sanitized SVG: <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" zoomA...
ActiveView.tsx:152 🗺️ Loaded 10 locations from API
SponsorCard.tsx:166 [SponsorSVG] Rendering SVG for: Chalk Digital SVG length: 48833
SponsorCard.tsx:175 [SponsorSVG] Sanitized SVG: <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" zoomA...
SponsorCard.tsx:166 [SponsorSVG] Rendering SVG for: MAXA SVG length: 193686
SponsorCard.tsx:175 [SponsorSVG] Sanitized SVG: <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" zoomA...
[NEW] Explain Console errors by using Copilot in Edge: click

         to explain an error.
        Learn more
        Don't show again
photoFlowLogger.ts:30 [PhotoFlowLogger] INFO usePhotoUpload:upload_start {stopId: 'stop_4', stopTitle: 'Public Art / Sculpture', fileType: 'file', fileSize: 1366560}
usePhotoUpload.ts:100 Using orchestrated upload endpoint (with saga/compensation)
PhotoUploadService.ts:80 📸 PhotoUploadService.uploadPhotoOrchestrated() called
SponsorCard.tsx:166 [SponsorSVG] Rendering SVG for: Chalk Digital SVG length: 48833
SponsorCard.tsx:175 [SponsorSVG] Sanitized SVG: <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" zoomA...
SponsorCard.tsx:166 [SponsorSVG] Rendering SVG for: MAXA SVG length: 193686
SponsorCard.tsx:175 [SponsorSVG] Sanitized SVG: <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" zoomA...
PhotoUploadService.ts:97 🔑 Generated idempotency key: 79d6160783e353e8
PhotoUploadService.ts:113 📦 FormData created for orchestrated upload
PhotoUploadService.ts:116 🌐 Making orchestrated API request...
ConsoleSink.ts:124 [2025-09-28T05:11:01.149Z] [INFO ] [#legacy-logger #api-client] [session:client_1] Request started
  Context: {
  "component": "api-client",
  "method": "POST",
  "url": "http://localhost:3001/api/photo-upload-orchestrated",
  "message": "🌐 API Request: POST http://localhost:3001/api/photo-upload-orchestrated"
}
globalErrorHandler.js:49   POST http://localhost:3001/api/photo-upload-orchestrated 404 (Not Found)
window.fetch @ globalErrorHandler.js:49
request @ apiClient.ts:178
requestFormData @ apiClient.ts:297
uploadPhotoOrchestrated @ PhotoUploadService.ts:118
await in uploadPhotoOrchestrated
(anonymous) @ usePhotoUpload.ts:101
handlePhotoUpload @ ActiveView.tsx:264
handlePhotoUpload @ StopCard.tsx:41
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
ConsoleSink.ts:124 [2025-09-28T05:11:01.161Z] [INFO ] [#legacy-logger #api-client] [session:client_1] Response received
  Context: {
  "component": "api-client",
  "message": "📥 Response: 404 Not Found",
  "status": 404,
  "statusText": "Not Found",
  "duration": 12
}
ConsoleSink.ts:130  [2025-09-28T05:11:01.162Z] [ERROR] [#legacy-logger #api-client] [session:client_1] Non-OK response: 404 Not Found
  Context: {
  "component": "api-client",
  "status": 404,
  "statusText": "Not Found",
  "responseBody": "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<title>Error</title>\n</head>\n<body>\n<pre>Cannot POST /api/photo-upload-orchestrated</pre>\n</body>\n</html>\n"
}
  Error: Error: Non-OK response: 404 Not Found
    at ApiClient.request (apiClient.ts:205:91)
    at async PhotoUploadService.uploadPhotoOrchestrated (PhotoUploadService.ts:118:27)
    at async usePhotoUpload.ts:101:20
    at async handlePhotoUpload (ActiveView.tsx:264:5)
    at async handlePhotoUpload (StopCard.tsx:41:7)
writeToConsole @ ConsoleSink.ts:130
write @ ConsoleSink.ts:23
(anonymous) @ MultiSinkLogger.ts:91
writeToSinks @ MultiSinkLogger.ts:89
log @ MultiSinkLogger.ts:74
error @ MultiSinkLogger.ts:55
error @ legacyLogger.ts:108
request @ apiClient.ts:205
await in request
requestFormData @ apiClient.ts:297
uploadPhotoOrchestrated @ PhotoUploadService.ts:118
await in uploadPhotoOrchestrated
(anonymous) @ usePhotoUpload.ts:101
handlePhotoUpload @ ActiveView.tsx:264
handlePhotoUpload @ StopCard.tsx:41
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
ConsoleSink.ts:130  [2025-09-28T05:11:01.166Z] [ERROR] [#legacy-logger #api-client] [session:client_1] API Error: 404 Not Found
  Context: {
  "component": "api-client",
  "url": "http://localhost:3001/api/photo-upload-orchestrated",
  "status": 404,
  "statusText": "Not Found",
  "responseBody": "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<title>Error</title>\n</head>\n<body>\n<pre>Cannot POST /api/photo-upload-orchestrated</pre>\n</body>\n</html>\n",
  "headers": {
    "content-length": "169",
    "content-type": "text/html; charset=utf-8"
  }
}
  Error: Error: API Error: 404 Not Found
    at ApiClient.createApiError (apiClient.ts:104:79)
    at ApiClient.request (apiClient.ts:219:22)
    at async PhotoUploadService.uploadPhotoOrchestrated (PhotoUploadService.ts:118:27)
    at async usePhotoUpload.ts:101:20
    at async handlePhotoUpload (ActiveView.tsx:264:5)
    at async handlePhotoUpload (StopCard.tsx:41:7)
writeToConsole @ ConsoleSink.ts:130
write @ ConsoleSink.ts:23
(anonymous) @ MultiSinkLogger.ts:91
writeToSinks @ MultiSinkLogger.ts:89
log @ MultiSinkLogger.ts:74
error @ MultiSinkLogger.ts:55
error @ legacyLogger.ts:108
createApiError @ apiClient.ts:104
request @ apiClient.ts:219
await in request
requestFormData @ apiClient.ts:297
uploadPhotoOrchestrated @ PhotoUploadService.ts:118
await in uploadPhotoOrchestrated
(anonymous) @ usePhotoUpload.ts:101
handlePhotoUpload @ ActiveView.tsx:264
handlePhotoUpload @ StopCard.tsx:41
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
ConsoleSink.ts:130  [2025-09-28T05:11:01.166Z] [ERROR] [#legacy-logger #api-client] [session:client_1] Request attempt failed
  Context: {
  "component": "api-client",
  "attempt": 1,
  "errorType": "Error",
  "url": "http://localhost:3001/api/photo-upload-orchestrated"
}
  Error: ApiError: HTTP 404: Not Found
    at ApiClient.createApiError (apiClient.ts:113:19)
    at ApiClient.request (apiClient.ts:219:22)
    at async PhotoUploadService.uploadPhotoOrchestrated (PhotoUploadService.ts:118:27)
    at async usePhotoUpload.ts:101:20
    at async handlePhotoUpload (ActiveView.tsx:264:5)
    at async handlePhotoUpload (StopCard.tsx:41:7)
writeToConsole @ ConsoleSink.ts:130
write @ ConsoleSink.ts:23
(anonymous) @ MultiSinkLogger.ts:91
writeToSinks @ MultiSinkLogger.ts:89
log @ MultiSinkLogger.ts:74
error @ MultiSinkLogger.ts:55
error @ legacyLogger.ts:108
request @ apiClient.ts:237
await in request
requestFormData @ apiClient.ts:297
uploadPhotoOrchestrated @ PhotoUploadService.ts:118
await in uploadPhotoOrchestrated
(anonymous) @ usePhotoUpload.ts:101
handlePhotoUpload @ ActiveView.tsx:264
handlePhotoUpload @ StopCard.tsx:41
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
PhotoUploadService.ts:133  💥 Orchestrated upload error: ApiError: HTTP 404: Not Found
    at ApiClient.createApiError (apiClient.ts:113:19)
    at ApiClient.request (apiClient.ts:219:22)
    at async PhotoUploadService.uploadPhotoOrchestrated (PhotoUploadService.ts:118:27)
    at async usePhotoUpload.ts:101:20
    at async handlePhotoUpload (ActiveView.tsx:264:5)
    at async handlePhotoUpload (StopCard.tsx:41:7)
uploadPhotoOrchestrated @ PhotoUploadService.ts:133
await in uploadPhotoOrchestrated
(anonymous) @ usePhotoUpload.ts:101
handlePhotoUpload @ ActiveView.tsx:264
handlePhotoUpload @ StopCard.tsx:41
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
usePhotoUpload.ts:158  Photo upload failed: ApiError: HTTP 404: Not Found
    at ApiClient.createApiError (apiClient.ts:113:19)
    at ApiClient.request (apiClient.ts:219:22)
    at async PhotoUploadService.uploadPhotoOrchestrated (PhotoUploadService.ts:118:27)
    at async usePhotoUpload.ts:101:20
    at async handlePhotoUpload (ActiveView.tsx:264:5)
    at async handlePhotoUpload (StopCard.tsx:41:7)
(anonymous) @ usePhotoUpload.ts:158
await in (anonymous)
handlePhotoUpload @ ActiveView.tsx:264
handlePhotoUpload @ StopCard.tsx:41
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
ActiveView.tsx:145  Failed to upload photo for stop stop_4: ApiError: HTTP 404: Not Found
    at ApiClient.createApiError (apiClient.ts:113:19)
    at ApiClient.request (apiClient.ts:219:22)
    at async PhotoUploadService.uploadPhotoOrchestrated (PhotoUploadService.ts:118:27)
    at async usePhotoUpload.ts:101:20
    at async handlePhotoUpload (ActiveView.tsx:264:5)
    at async handlePhotoUpload (StopCard.tsx:41:7)
onError @ ActiveView.tsx:145
(anonymous) @ usePhotoUpload.ts:170
await in (anonymous)
handlePhotoUpload @ ActiveView.tsx:264
handlePhotoUpload @ StopCard.tsx:41
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430

[Additional logs showing multiple ProgressService saves and SponsorCard renders...]

Network Tab Details:
photo-upload-orchestrated
write-log
fall-2025 (multiple instances)
13 / 14 requests
5.5 kB / 5.5 kB transferred

Request Headers:
Request URL: http://localhost:3001/api/photo-upload-orchestrated
Request Method: POST
Status Code: 404 Not Found
Remote Address: [::1]:3001
Referrer Policy: strict-origin-when-cross-origin
accept: application/json
accept-encoding: gzip, deflate, br, zstd
accept-language: en-US,en;q=0.9
connection: keep-alive
content-length: 1367720
content-type: multipart/form-data; boundary=----WebKitFormBoundaryCKCsd45B563zvHHQ
host: localhost:3001
origin: http://localhost:5175
referer: http://localhost:5175/
sec-fetch-dest: empty
sec-fetch-mode: cors
sec-fetch-site: same-site
user-agent: Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/140.0.0.0
```