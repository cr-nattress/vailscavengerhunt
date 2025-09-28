# Bug Fix Prompt: Orchestrated Photo Upload returns 404 (Cannot POST /api/photo-upload-orchestrated)

## Metadata
- **Title:** Orchestrated photo upload 404 via local Express runner
- **Date Discovered:** 2025-09-27
- **Reporter:** BLUE
- **Owners:** Cascade
- **Status:** investigating
- **Severity:** blocker
- **Priority:** P0
- **Area/Component:** frontend | express API | netlify function
- **Environment:** dev  
  - **URL:** http://localhost:3001/api/photo-upload-orchestrated  
  - **Branch/Commit:** unknown  
  - **Deploy ID:** n/a (local)  
  - **Sentry Release/Env:** Sentry offline (no DSN)  
- **Affected Org/Hunt/Team (if applicable):** bhhs / fall-2025 / simba

---

## Summary
Uploading a photo using the orchestrated endpoint fails in local development with HTTP 404 Not Found. The Express server responds with an HTML error "Cannot POST /api/photo-upload-orchestrated", indicating the request never reaches the local Netlify function handler (`photo-upload-orchestrated`).

## Context / Background
- We recently added a local Express-based Netlify functions runner in `src/server/server.ts` so development can run without `netlify dev`.
- The orchestrated photo upload function lives at `netlify/functions/photo-upload-orchestrated.js` (CommonJS `exports.handler`).
- We attempted to handle `/api/photo-upload-orchestrated` by rewriting the request to `/.netlify/functions/photo-upload-orchestrated` inside Express middleware and then calling `next()` so our functions route could handle it.
- Logs show the earlier ERR_CONNECTION_RESET is now replaced by a 404 Not Found, confirming the connection is no longer being reset but the route is still not being handled.

## Steps to Reproduce
1. Start local dev using `npm run start:all` (Vite UI + Express API) on a clean terminal.
2. Load the app (e.g., http://localhost:5173) and ensure org/hunt/team context is set (bhhs/simba/fall-2025).
3. Take or select a photo for a stop (e.g., stop_4) which triggers orchestrated upload.
4. Observe the Network panel and server logs.

## Expected Behavior
- `POST /api/photo-upload-orchestrated` is accepted and processed by the local functions runner.
- The underlying Netlify function `photo-upload-orchestrated` stores the image to Cloudinary and upserts `hunt_progress` in Supabase.
- The endpoint responds 200 with a JSON body containing `photoUrl`, `publicId`, `locationSlug`, `title`, and `uploadedAt`.

## Actual Behavior
- The browser receives `404 Not Found` with response HTML: `Cannot POST /api/photo-upload-orchestrated`.
- The function code does not execute (no function-level logs observed).

## Impact Assessment
- **Who is affected:** All users in local dev attempting orchestrated upload.
- **Scope/Blast Radius:** Photo upload flow (orchestrated path) is blocked. Follow-on PATCH to progress does not occur.
- **Frequency:** Always (in current dev setup without Netlify Dev).

---

## Evidence: Logs, Traces, Screenshots
- **Browser Console + Network (full paste from `backlog/api-errors-2.md`):**

```
<BEGIN LOGS>
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
PhotoUploadService.ts:133  💥 Orchestrated upload error: ApiError: HTTP 404: Not Found
    at ApiClient.createApiError (apiClient.ts:113:19)
    at ApiClient.request (apiClient.ts:219:22)
    at async PhotoUploadService.uploadPhotoOrchestrated (PhotoUploadService.ts:118:27)
    at async usePhotoUpload.ts:101:20
    at async handlePhotoUpload (ActiveView.tsx:264:5)
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
SponsorCard.tsx:166 [SponsorSVG] Rendering SVG for: Chalk Digital SVG length: 48833
SponsorCard.tsx:175 [SponsorSVG] Sanitized SVG: <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" zoomA...
SponsorCard.tsx:166 [SponsorSVG] Rendering SVG for: MAXA SVG length: 193686
SponsorCard.tsx:175 [SponsorSVG] Sanitized SVG: <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" zoomA...
SponsorCard.tsx:166 [SponsorSVG] Rendering SVG for: Chalk Digital SVG length: 48833
SponsorCard.tsx:175 [SponsorSVG] Sanitized SVG: <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" zoomA...
SponsorCard.tsx:166 [SponsorSVG] Rendering SVG for: MAXA SVG length: 193686
SponsorCard.tsx:175 [SponsorSVG] Sanitized SVG: <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" zoomA...
ProgressService.ts:69 [PHOTO-FLOW] Step 9.1: Inside ProgressService.saveProgress()
ProgressService.ts:76 [PHOTO-FLOW] Step 9.2: Validating progress data...
ProgressService.ts:77 [ProgressService] Sending progress with 0 photo URLs: []
ProgressService.ts:91 [PHOTO-FLOW] Step 9.3: Preparing POST request to: /api/progress/bhhs/simba/fall-2025
ProgressService.ts:92 [PHOTO-FLOW] Step 9.4: Request body contains 1 stops, 0 with photos
photoFlowLogger.ts:30 [PhotoFlowLogger] INFO ProgressService:save_progress_request {url: '/api/progress/bhhs/simba/fall-2025', method: 'POST', stopsWithPhotos: 0, totalStops: 1, requestBody: {…}}
ProgressService.ts:113 [PHOTO-FLOW] Step 9.5: Sending POST request to backend...
ProgressService.ts:140 [PHOTO-FLOW] Step 9.6: Backend responded with status 200
ProgressService.ts:142 [PHOTO-FLOW] Step 9.7: Backend response data: {success: true, updatedStops: 1, timestamp: '2025-09-28T05:11:24.656Z'}
photoFlowLogger.ts:30 [PhotoFlowLogger] INFO ProgressService:save_progress_response_success {status: 200, responseData: {…}}
ProgressService.ts:149 [PHOTO-FLOW] Step 9.8: Progress saved to Supabase successfully!
ProgressService.ts:150 [ProgressService] Progress saved successfully
ProgressService.ts:44 [ProgressService] Progress loaded successfully (validated)
SponsorCard.tsx:166 [SponsorSVG] Rendering SVG for: Chalk Digital SVG length: 48833
SponsorCard.tsx:175 [SponsorSVG] Sanitized SVG: <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" zoomA...
SponsorCard.tsx:166 [SponsorSVG] Rendering SVG for: MAXA SVG length: 193686
SponsorCard.tsx:175 [SponsorSVG] Sanitized SVG: <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" zoomA...
ProgressService.ts:69 [PHOTO-FLOW] Step 9.1: Inside ProgressService.saveProgress()
ProgressService.ts:76 [PHOTO-FLOW] Step 9.2: Validating progress data...
ProgressService.ts:77 [ProgressService] Sending progress with 0 photo URLs: []
ProgressService.ts:91 [PHOTO-FLOW] Step 9.3: Preparing POST request to: /api/progress/bhhs/simba/fall-2025
ProgressService.ts:92 [PHOTO-FLOW] Step 9.4: Request body contains 1 stops, 0 with photos
photoFlowLogger.ts:30 [PhotoFlowLogger] INFO ProgressService:save_progress_request {url: '/api/progress/bhhs/simba/fall-2025', method: 'POST', stopsWithPhotos: 0, totalStops: 1, requestBody: {…}}
ProgressService.ts:113 [PHOTO-FLOW] Step 9.5: Sending POST request to backend...
ProgressService.ts:140 [PHOTO-FLOW] Step 9.6: Backend responded with status 200
ProgressService.ts:142 [PHOTO-FLOW] Step 9.7: Backend response data: {success: true, updatedStops: 1, timestamp: '2025-09-28T05:11:25.364Z'}
photoFlowLogger.ts:30 [PhotoFlowLogger] INFO ProgressService:save_progress_response_success {status: 200, responseData: {…}}
ProgressService.ts:149 [PHOTO-FLOW] Step 9.8: Progress saved to Supabase successfully!
ProgressService.ts:150 [ProgressService] Progress saved successfully
ProgressService.ts:44 [ProgressService] Progress loaded successfully (validated)
SponsorCard.tsx:166 [SponsorSVG] Rendering SVG for: Chalk Digital SVG length: 48833
SponsorCard.tsx:175 [SponsorSVG] Sanitized SVG: <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" zoomA...
SponsorCard.tsx:166 [SponsorSVG] Rendering SVG for: MAXA SVG length: 193686
SponsorCard.tsx:175 [SponsorSVG] Sanitized SVG: <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" zoomA...
ProgressService.ts:69 [PHOTO-FLOW] Step 9.1: Inside ProgressService.saveProgress()
ProgressService.ts:76 [PHOTO-FLOW] Step 9.2: Validating progress data...
ProgressService.ts:77 [ProgressService] Sending progress with 0 photo URLs: []
ProgressService.ts:91 [PHOTO-FLOW] Step 9.3: Preparing POST request to: /api/progress/bhhs/simba/fall-2025
ProgressService.ts:92 [PHOTO-FLOW] Step 9.4: Request body contains 1 stops, 0 with photos
photoFlowLogger.ts:30 [PhotoFlowLogger] INFO ProgressService:save_progress_request {url: '/api/progress/bhhs/simba/fall-2025', method: 'POST', stopsWithPhotos: 0, totalStops: 1, requestBody: {…}}
ProgressService.ts:113 [PHOTO-FLOW] Step 9.5: Sending POST request to backend...
ProgressService.ts:140 [PHOTO-FLOW] Step 9.6: Backend responded with status 200
ProgressService.ts:142 [PHOTO-FLOW] Step 9.7: Backend response data: {success: true, updatedStops: 1, timestamp: '2025-09-28T05:11:26.156Z'}
photoFlowLogger.ts:30 [PhotoFlowLogger] INFO ProgressService:save_progress_response_success {status: 200, responseData: {…}}
ProgressService.ts:149 [PHOTO-FLOW] Step 9.8: Progress saved to Supabase successfully!
ProgressService.ts:150 [ProgressService] Progress saved successfully
ProgressService.ts:44 [ProgressService] Progress loaded successfully (validated)
SponsorCard.tsx:166 [SponsorSVG] Rendering SVG for: Chalk Digital SVG length: 48833
SponsorCard.tsx:175 [SponsorSVG] Sanitized SVG: <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" zoomA...
SponsorCard.tsx:166 [SponsorSVG] Rendering SVG for: MAXA SVG length: 193686
SponsorCard.tsx:175 [SponsorSVG] Sanitized SVG: <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" zoomA...
ProgressService.ts:69 [PHOTO-FLOW] Step 9.1: Inside ProgressService.saveProgress()
ProgressService.ts:76 [PHOTO-FLOW] Step 9.2: Validating progress data...
ProgressService.ts:77 [ProgressService] Sending progress with 0 photo URLs: []
ProgressService.ts:91 [PHOTO-FLOW] Step 9.3: Preparing POST request to: /api/progress/bhhs/simba/fall-2025
ProgressService.ts:92 [PHOTO-FLOW] Step 9.4: Request body contains 1 stops, 0 with photos
photoFlowLogger.ts:30 [PhotoFlowLogger] INFO ProgressService:save_progress_request {url: '/api/progress/bhhs/simba/fall-2025', method: 'POST', stopsWithPhotos: 0, totalStops: 1, requestBody: {…}}
ProgressService.ts:113 [PHOTO-FLOW] Step 9.5: Sending POST request to backend...
ProgressService.ts:140 [PHOTO-FLOW] Step 9.6: Backend responded with status 200
ProgressService.ts:142 [PHOTO-FLOW] Step 9.7: Backend response data: {success: true, updatedStops: 1, timestamp: '2025-09-28T05:11:27.879Z'}
photoFlowLogger.ts:30 [PhotoFlowLogger] INFO ProgressService:save_progress_response_success {status: 200, responseData: {…}}
ProgressService.ts:149 [PHOTO-FLOW] Step 9.8: Progress saved to Supabase successfully!
ProgressService.ts:150 [ProgressService] Progress saved successfully
ProgressService.ts:44 [ProgressService] Progress loaded successfully (validated)
SponsorCard.tsx:166 [SponsorSVG] Rendering SVG for: Chalk Digital SVG length: 48833
SponsorCard.tsx:175 [SponsorSVG] Sanitized SVG: <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" zoomA...
SponsorCard.tsx:166 [SponsorSVG] Rendering SVG for: MAXA SVG length: 193686
SponsorCard.tsx:175 [SponsorSVG] Sanitized SVG: <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" zoomA...
ProgressService.ts:69 [PHOTO-FLOW] Step 9.1: Inside ProgressService.saveProgress()
ProgressService.ts:76 [PHOTO-FLOW] Step 9.2: Validating progress data...
ProgressService.ts:77 [ProgressService] Sending progress with 0 photo URLs: []
ProgressService.ts:91 [PHOTO-FLOW] Step 9.3: Preparing POST request to: /api/progress/bhhs/simba/fall-2025
ProgressService.ts:92 [PHOTO-FLOW] Step 9.4: Request body contains 1 stops, 0 with photos
photoFlowLogger.ts:30 [PhotoFlowLogger] INFO ProgressService:save_progress_request {url: '/api/progress/bhhs/simba/fall-2025', method: 'POST', stopsWithPhotos: 0, totalStops: 1, requestBody: {…}}
ProgressService.ts:113 [PHOTO-FLOW] Step 9.5: Sending POST request to backend...
ProgressService.ts:140 [PHOTO-FLOW] Step 9.6: Backend responded with status 200
ProgressService.ts:142 [PHOTO-FLOW] Step 9.7: Backend response data: {success: true, updatedStops: 1, timestamp: '2025-09-28T05:11:37.134Z'}
photoFlowLogger.ts:30 [PhotoFlowLogger] INFO ProgressService:save_progress_response_success {status: 200, responseData: {…}}
ProgressService.ts:149 [PHOTO-FLOW] Step 9.8: Progress saved to Supabase successfully!
ProgressService.ts:150 [ProgressService] Progress saved successfully
ProgressService.ts:44 [ProgressService] Progress loaded successfully (validated)
SponsorCard.tsx:166 [SponsorSVG] Rendering SVG for: Chalk Digital SVG length: 48833
SponsorCard.tsx:175 [SponsorSVG] Sanitized SVG: <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" zoomA...
SponsorCard.tsx:166 [SponsorSVG] Rendering SVG for: MAXA SVG length: 193686
SponsorCard.tsx:175 [SponsorSVG] Sanitized SVG: <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" zoomA...

photo-upload-orchestrated
write-log
fall-2025
fall-2025
fall-2025
fall-2025
fall-2025
fall-2025
fall-2025
fall-2025
fall-2025
write-log
fall-2025
13 / 14 requests
5.5 kB / 5.5 kB transferred
Request URL
http://localhost:3001/api/photo-upload-orchestrated
Request Method
POST
Status Code
404 Not Found
Remote Address
[::1]:3001
Referrer Policy
strict-origin-when-cross-origin
accept
application/json
accept-encoding
gzip, deflate, br, zstd
accept-language
en-US,en;q=0.9
connection
keep-alive
content-length
1367720
content-type
multipart/form-data; boundary=----WebKitFormBoundaryCKCsd45B563zvHHQ
host
localhost:3001
origin
http://localhost:5175
referer
http://localhost:5175/
sec-fetch-dest
empty
sec-fetch-mode
cors
sec-fetch-site
same-site
user-agent
Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/140.0.0.0
<END LOGS>
```

---

## Quick Diagnostics Checklist
- [x] **Endpoint mapping correct** for GET/POST/PATCH in `netlify.toml`; local dev relies on Express runner for functions
- [x] **SPA fallback not intercepting** (404 body indicates Express default HTML, not SPA fallback)
- [x] **Allowed methods configured** (function allows POST/OPTIONS)
- [x] **CORS headers present** (function sets CORS; local server handles OPTIONS)
- [x] **Accept header** is application/json; still got HTML error which strongly implies Express 404, not function-level error
- [x] **Direct function URL works** in theory (`/.netlify/functions/photo-upload-orchestrated`) via local runner
- [ ] **Env vars present** (Cloudinary/Supabase) — still to verify locally
- [x] **Function throws handled** (runner returns JSON on error; but we didn't reach function)
- [ ] **Sentry errors captured** — Sentry disabled in browser (offline), server may log

---

## Hypotheses
- The Express middleware at `src/server/server.ts` for `app.use('/api/photo-upload-orchestrated', ...)` rewrites `req.url` to `/.netlify/functions/photo-upload-orchestrated` and calls `next()`, but Express path resolution does not re-dispatch the request to match the later route `app.all('/.netlify/functions/:functionName*', ...)`. As a result, the request falls through and returns the default Express 404 HTML ("Cannot POST /api/photo-upload-orchestrated").
- Mutating `req.url` mid-stack is brittle; Express uses internal mount path mechanics which can prevent new absolute paths from being matched in subsequent handlers.
- Secondary: Even if properly routed, missing Cloudinary env vars would cause a later 500, but the current failure is purely routing (404 before function code executes).

## Experiments / Tests Run
- Verified the 404 body is HTML with "Cannot POST /api/photo-upload-orchestrated" — confirms Express 404, not function error JSON.
- Confirmed `src/server/server.ts` has a dedicated functions runner for `/.netlify/functions/:functionName*`, and that CommonJS `exports.handler` functions (like `write-log.js`) work locally — indicates the runner is functional.

## Findings
- The local rewrite approach for `/api/photo-upload-orchestrated` is not handing off to the functions runner. We need to call the function directly instead of relying on path rewrite.

## Root Cause
The local Express server attempts to rewrite `/api/photo-upload-orchestrated` to `/.netlify/functions/photo-upload-orchestrated` by mutating `req.url` and then calling `next()`. Express does not re-route the request as intended, so the request bypasses the functions runner and ends with the default 404 HTML.

## Fix Plan
- **Code/Config Changes:**
  - In `src/server/server.ts`, replace the rewrite middleware with a direct invocation of the Netlify function:
    - Implement a handler at `app.post('/api/photo-upload-orchestrated', async (req, res) => { ... })`.
    - Build a Lambda-style `event` with `body` set to `req.rawBody` as base64 + `isBase64Encoded: true`.
    - Dynamically import `../../netlify/functions/photo-upload-orchestrated.js` and call `exports.handler(event)`.
    - Copy response headers and send `statusCode` + `body` back to the client.
  - Keep `app.options('/api/photo-upload-orchestrated')` for CORS preflight as-is.
  - Verify Cloudinary and Supabase env vars in `.env` for local (CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET, SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY).
- **Risk:** Low for dev. No production impact.
- **Rollback Plan:** Revert `server.ts` changes to previous middleware if needed.
- **Owners:** Cascade

## Validation Plan
- **Test Cases:**
  - POST `/api/photo-upload-orchestrated` with a small image (FormData) returns 200 JSON.
  - Browser upload flows through and logs: "Uploading to Cloudinary...", "Orchestrated upload completed successfully".
  - Follow-on progress POST/PATCH still succeed.
- **Environments:** dev
- **Monitoring:** Watch server logs; ensure no 404 HTML responses; confirm network response headers and body are JSON from function.

## Follow-ups / Tech Debt
- Add an integration test for `/.netlify/functions/photo-upload-orchestrated` under the local runner using a sample multipart payload buffer.
- Consider a generic adapter that maps `/api/<fn>` to function calls without path rewrites.

## Timeline (optional)
- 2025-09-27 22:15: Saw ERR_CONNECTION_RESET initially.
- 2025-09-27 22:50: After changes, route now returns 404 Not Found.
- Next: Implement direct function invocation for `/api/photo-upload-orchestrated`.

## References
- Related code: `src/server/server.ts`, `netlify/functions/photo-upload-orchestrated.js`
- Redirect config: `netlify.toml`
- Diagnostic template used: `bugs/BUG_DIAGNOSTIC_TEMPLATE.md`
