[PhotoFlowLogger] INFO usePhotoUpload:upload_start {stopId: 'stop_4', stopTitle: 'Public Art / Sculpture', fileType: 'file', fileSize: 1353012}
usePhotoUpload.ts:100 Using orchestrated upload endpoint (with saga/compensation)
PhotoUploadService.ts:80 📸 PhotoUploadService.uploadPhotoOrchestrated() called
SponsorCard.tsx:166 [SponsorSVG] Rendering SVG for: Chalk Digital SVG length: 48833
SponsorCard.tsx:175 [SponsorSVG] Sanitized SVG: <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" zoomA...
SponsorCard.tsx:166 [SponsorSVG] Rendering SVG for: MAXA SVG length: 193686
SponsorCard.tsx:175 [SponsorSVG] Sanitized SVG: <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" zoomA...
PhotoUploadService.ts:97 🔑 Generated idempotency key: 5caab38fdc4bf7e2
PhotoUploadService.ts:113 📦 FormData created for orchestrated upload
PhotoUploadService.ts:116 🌐 Making orchestrated API request...
ConsoleSink.ts:124 [2025-09-28T02:29:23.178Z] [INFO ] [#legacy-logger #api-client] [session:client_1] Request started 
  Context: {
  "component": "api-client",
  "method": "POST",
  "url": "http://localhost:3001/api/photo-upload-orchestrated",
  "message": "🌐 API Request: POST http://localhost:3001/api/photo-upload-orchestrated"
}
globalErrorHandler.js:49   POST http://localhost:3001/api/photo-upload-orchestrated net::ERR_CONNECTION_RESET
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
globalErrorHandler.js:78  Network error: TypeError: Failed to fetch
    at window.fetch (globalErrorHandler.js:49:44)
    at ApiClient.request (apiClient.ts:178:32)
    at ApiClient.requestFormData (apiClient.ts:297:17)
    at PhotoUploadService.uploadPhotoOrchestrated (PhotoUploadService.ts:118:43)
    at async usePhotoUpload.ts:101:20
    at async handlePhotoUpload (ActiveView.tsx:264:5)
    at async handlePhotoUpload (StopCard.tsx:41:7)
window.fetch @ globalErrorHandler.js:78
await in window.fetch
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
[NEW] Explain Console errors by using Copilot in Edge: click
         
         to explain an error. 
        Learn more
        Don't show again
ConsoleSink.ts:130  [2025-09-28T02:29:23.576Z] [ERROR] [#legacy-logger #api-client] [session:client_1] Request attempt failed 
  Context: {
  "component": "api-client",
  "attempt": 1,
  "errorType": "TypeError",
  "url": "http://localhost:3001/api/photo-upload-orchestrated"
} 
  Error: TypeError: Failed to fetch
    at window.fetch (globalErrorHandler.js:49:44)
    at ApiClient.request (apiClient.ts:178:32)
    at ApiClient.requestFormData (apiClient.ts:297:17)
    at PhotoUploadService.uploadPhotoOrchestrated (PhotoUploadService.ts:118:43)
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
ConsoleSink.ts:127  [2025-09-28T02:29:23.578Z] [WARN ] [#legacy-logger #api-client] [session:client_1] Request failed, retrying 
  Context: {
  "component": "api-client",
  "message": "❌ Request failed (attempt 1)",
  "attempt": 1,
  "error": "Failed to fetch"
}
writeToConsole @ ConsoleSink.ts:127
write @ ConsoleSink.ts:23
(anonymous) @ MultiSinkLogger.ts:91
writeToSinks @ MultiSinkLogger.ts:89
log @ MultiSinkLogger.ts:74
warn @ MultiSinkLogger.ts:51
warn @ legacyLogger.ts:92
request @ apiClient.ts:273
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
ConsoleSink.ts:127  [2025-09-28T02:29:23.579Z] [WARN ] [#legacy-logger #api-client] [session:client_1] Request retry 
  Context: {
  "component": "api-client",
  "message": "🔄 Retry attempt 1/1",
  "attempt": 1,
  "maxAttempts": 1,
  "delayMs": 873
}
writeToConsole @ ConsoleSink.ts:127
write @ ConsoleSink.ts:23
(anonymous) @ MultiSinkLogger.ts:91
writeToSinks @ MultiSinkLogger.ts:89
log @ MultiSinkLogger.ts:74
warn @ MultiSinkLogger.ts:51
warn @ legacyLogger.ts:92
request @ apiClient.ts:145
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
ConsoleSink.ts:124 [2025-09-28T02:29:32.060Z] [INFO ] [#legacy-logger #api-client] [session:client_1] Response received 
  Context: {
  "component": "api-client",
  "message": "📥 Response: 200 OK",
  "status": 200,
  "statusText": "OK",
  "duration": 7601
}
PhotoUploadService.ts:123 🔍 Orchestrated response received: {photoUrl: 'https://res.cloudinary.com/dwmjbmdgq/image/upload/…-651b-4a1f-88d6-3a2a490dba06_5caab38fdc4bf7e2.jpg', publicId: 'scavenger/entries/public-art-sculpture_a1f5da47-651b-4a1f-88d6-3a2a490dba06_5caab38fdc4bf7e2', locationSlug: 'public-art-sculpture', title: 'Public Art / Sculpture', uploadedAt: '2025-09-28T02:29:32.054Z', …}
PhotoUploadService.ts:128 📊 Orchestrated upload successful: {photoUrl: 'https://res.cloudinary.com/dwmjbmdgq/image/upload/…-651b-4a1f-88d6-3a2a490dba06_5caab38fdc4bf7e2.jpg', publicId: 'scavenger/entries/public-art-sculpture_a1f5da47-651b-4a1f-88d6-3a2a490dba06_5caab38fdc4bf7e2', locationSlug: 'public-art-sculpture', title: 'Public Art / Sculpture', uploadedAt: '2025-09-28T02:29:32.054Z'}
photoFlowLogger.ts:30 [PhotoFlowLogger] INFO usePhotoUpload:upload_success {stopId: 'stop_4', photoUrl: 'https://res.cloudinary.com/dwmjbmdgq/image/upload/…9026569/scavenger/entries/public-art-sculpture...', responseData: {…}}
ActiveView.tsx:72 [PHOTO-FLOW] Step 1: Photo uploaded to Cloudinary for stop stop_4
ActiveView.tsx:73 [PHOTO-FLOW] Step 2: Photo URL received: https://res.cloudinary.com/dwmjbmdgq/image/upload/v1759026569/scavenger/entries/public-art-sculpture...
ActiveView.tsx:79 [PHOTO-FLOW] Step 3: Persisting stop stop_4 to server via updateStopProgress
SponsorCard.tsx:166 [SponsorSVG] Rendering SVG for: Chalk Digital SVG length: 48833
SponsorCard.tsx:175 [SponsorSVG] Sanitized SVG: <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" zoomA...
SponsorCard.tsx:166 [SponsorSVG] Rendering SVG for: MAXA SVG length: 193686
SponsorCard.tsx:175 [SponsorSVG] Sanitized SVG: <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" zoomA...
globalErrorHandler.js:49   PATCH http://localhost:5173/api/progress/bhhs/berrypicker/fall-2025/stop/stop_4 500 (Internal Server Error)
window.fetch @ globalErrorHandler.js:49
updateStopProgress @ ProgressService.ts:183
ActiveView.usePhotoUpload.onSuccess @ ActiveView.tsx:85
(anonymous) @ usePhotoUpload.ts:153
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
globalErrorHandler.js:56  Server error detected: Error: Server error: 500 Internal Server Error at /api/progress/bhhs/berrypicker/fall-2025/stop/stop_4
    at window.fetch (globalErrorHandler.js:54:23)
    at async ProgressService.updateStopProgress (ProgressService.ts:183:24)
    at async ActiveView.usePhotoUpload.onSuccess (ActiveView.tsx:85:20)
window.fetch @ globalErrorHandler.js:56
await in window.fetch
updateStopProgress @ ProgressService.ts:183
ActiveView.usePhotoUpload.onSuccess @ ActiveView.tsx:85
(anonymous) @ usePhotoUpload.ts:153
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
ProgressService.ts:205  [ProgressService] Failed to update stop: Error: Failed to update stop progress: Internal Server Error
    at ProgressService.updateStopProgress (ProgressService.ts:199:15)
    at async ActiveView.usePhotoUpload.onSuccess (ActiveView.tsx:85:20)
updateStopProgress @ ProgressService.ts:205
await in updateStopProgress
ActiveView.usePhotoUpload.onSuccess @ ActiveView.tsx:85
(anonymous) @ usePhotoUpload.ts:153
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
ActiveView.tsx:135  [PHOTO-FLOW] Save to server failed for stop stop_4: Error: Failed to save progress to server
    at ActiveView.usePhotoUpload.onSuccess (ActiveView.tsx:92:17)
ActiveView.usePhotoUpload.onSuccess @ ActiveView.tsx:135
await in ActiveView.usePhotoUpload.onSuccess
(anonymous) @ usePhotoUpload.ts:153
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
globalErrorHandler.js:49   POST http://localhost:5173/api/write-log net::ERR_ABORTED 500 (Internal Server Error)
window.fetch @ globalErrorHandler.js:49
flushLogs @ photoFlowLogger.ts:65
(anonymous) @ photoFlowLogger.ts:101
globalErrorHandler.js:56  Server error detected: Error: Server error: 500 Internal Server Error at /api/write-log
    at window.fetch (globalErrorHandler.js:54:23)
    at async PhotoFlowLogger.flushLogs (photoFlowLogger.ts:65:7)
window.fetch @ globalErrorHandler.js:56
await in window.fetch
flushLogs @ photoFlowLogger.ts:65
(anonymous) @ photoFlowLogger.ts:101