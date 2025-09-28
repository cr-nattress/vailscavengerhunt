[NEW] Explain Console errors by using Copilot in Edge: click
         
         to explain an error. 
        Learn more
        Don't show again
ConsoleSink.ts:124 [2025-09-27T23:28:17.672Z] [INFO ] [#legacy-logger #api-client] [session:client_1] 🌐 Development mode, using local server 
  Context: {
  "component": "api-client",
  "devUrl": "http://localhost:3001/api"
}
initSentryClient.ts:33 [Sentry] Browser client initialized in offline mode (no DSN)
globalErrorHandler.js:96 [GlobalErrorHandler] Error handlers installed
App.jsx:65 [URL] No valid path params detected; app remains unlocked
App.jsx:118 🚀 Org and hunt set, settings will be initialized after team verification
App.jsx:122 📊 Session ID generated: 6fa5f7ba-f50b-4c62-ae4f-3420810c3381
App.jsx:126 🧪 Sending Sentry test log...
App.jsx:138 ✅ Sentry test log sent successfully
TeamLockWrapper.tsx:63 Existing team lock detected, initializing settings for: berrypicker
LoginService.ts:129 [LoginService] Initializing with: {orgId: 'bhhs', huntId: 'fall-2025', hasTeamCode: false, hasLockToken: true}
ConsoleSink.ts:124 [2025-09-27T23:28:17.767Z] [INFO ] [#legacy-logger #api-client] [session:client_1] Request started 
  Context: {
  "component": "api-client",
  "method": "POST",
  "url": "http://localhost:3001/api/login-initialize",
  "message": "🌐 API Request: POST http://localhost:3001/api/login-initialize"
}
ConsoleSink.ts:124 [2025-09-27T23:28:18.395Z] [INFO ] [#legacy-logger #api-client] [session:client_1] Response received 
  Context: {
  "component": "api-client",
  "message": "📥 Response: 200 OK",
  "status": 200,
  "statusText": "OK",
  "duration": 628
}
useActiveData.ts:33 [useActiveData] Fetching consolidated data...
ConsolidatedDataService.ts:34 [ConsolidatedDataService] Fetching active data for bhhs/berrypicker/fall-2025
ConsolidatedDataService.ts:80 [ConsolidatedDataService] Active data fetched successfully: {hasSettings: true, progressCount: 0, sponsorCount: 2, locationCount: 10}
useActiveData.ts:38 [useActiveData] Data loaded successfully: {hasSettings: true, progressCount: 0, sponsorCount: 2, configKeys: 15}
SponsorCard.tsx:166 [SponsorSVG] Rendering SVG for: Chalk Digital SVG length: 48833
SponsorCard.tsx:175 [SponsorSVG] Sanitized SVG: <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" zoomA...
SponsorCard.tsx:166 [SponsorSVG] Rendering SVG for: MAXA SVG length: 193686
SponsorCard.tsx:175 [SponsorSVG] Sanitized SVG: <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" zoomA...
ActiveView.tsx:116 🗺️ Loaded 10 locations from API
SponsorCard.tsx:166 [SponsorSVG] Rendering SVG for: Chalk Digital SVG length: 48833
SponsorCard.tsx:175 [SponsorSVG] Sanitized SVG: <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" zoomA...
SponsorCard.tsx:166 [SponsorSVG] Rendering SVG for: MAXA SVG length: 193686
SponsorCard.tsx:175 [SponsorSVG] Sanitized SVG: <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" zoomA...
photoFlowLogger.ts:30 [PhotoFlowLogger] INFO usePhotoUpload:upload_start {stopId: 'stop_10', stopTitle: 'Four-Legged Friends', fileType: 'file', fileSize: 1366560}
usePhotoUpload.ts:100 Using orchestrated upload endpoint (with saga/compensation)
PhotoUploadService.ts:80 📸 PhotoUploadService.uploadPhotoOrchestrated() called
SponsorCard.tsx:166 [SponsorSVG] Rendering SVG for: Chalk Digital SVG length: 48833
SponsorCard.tsx:175 [SponsorSVG] Sanitized SVG: <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" zoomA...
SponsorCard.tsx:166 [SponsorSVG] Rendering SVG for: MAXA SVG length: 193686
SponsorCard.tsx:175 [SponsorSVG] Sanitized SVG: <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" zoomA...
PhotoUploadService.ts:97 🔑 Generated idempotency key: 2a7d9936064760b8
PhotoUploadService.ts:113 📦 FormData created for orchestrated upload
PhotoUploadService.ts:116 🌐 Making orchestrated API request...
ConsoleSink.ts:124 [2025-09-27T23:28:24.837Z] [INFO ] [#legacy-logger #api-client] [session:client_1] Request started 
  Context: {
  "component": "api-client",
  "method": "POST",
  "url": "http://localhost:3001/api/photo-upload-orchestrated",
  "message": "🌐 API Request: POST http://localhost:3001/api/photo-upload-orchestrated"
}
ConsoleSink.ts:124 [2025-09-27T23:28:29.316Z] [INFO ] [#legacy-logger #api-client] [session:client_1] Response received 
  Context: {
  "component": "api-client",
  "message": "📥 Response: 200 OK",
  "status": 200,
  "statusText": "OK",
  "duration": 4478
}
PhotoUploadService.ts:123 🔍 Orchestrated response received: {photoUrl: 'https://res.cloudinary.com/dwmjbmdgq/image/upload/…-f50b-4c62-ae4f-3420810c3381_2a7d9936064760b8.jpg', publicId: 'scavenger/entries/four-legged-friends_6fa5f7ba-f50b-4c62-ae4f-3420810c3381_2a7d9936064760b8', locationSlug: 'four-legged-friends', title: 'Four-Legged Friends', uploadedAt: '2025-09-27T23:28:29.314Z', …}
PhotoUploadService.ts:128 📊 Orchestrated upload successful: {photoUrl: 'https://res.cloudinary.com/dwmjbmdgq/image/upload/…-f50b-4c62-ae4f-3420810c3381_2a7d9936064760b8.jpg', publicId: 'scavenger/entries/four-legged-friends_6fa5f7ba-f50b-4c62-ae4f-3420810c3381_2a7d9936064760b8', locationSlug: 'four-legged-friends', title: 'Four-Legged Friends', uploadedAt: '2025-09-27T23:28:29.314Z'}
photoFlowLogger.ts:30 [PhotoFlowLogger] INFO usePhotoUpload:upload_success {stopId: 'stop_10', photoUrl: 'https://res.cloudinary.com/dwmjbmdgq/image/upload/…9015707/scavenger/entries/four-legged-friends_...', responseData: {…}}
ActiveView.tsx:67 [PHOTO-FLOW] Step 1: Photo uploaded to Cloudinary for stop stop_10
ActiveView.tsx:68 [PHOTO-FLOW] Step 2: Photo URL received: https://res.cloudinary.com/dwmjbmdgq/image/upload/v1759015707/scavenger/entries/four-legged-friends_...
ActiveView.tsx:80 [PHOTO-FLOW] Step 3: Creating new progress state with photo for stop stop_10
ActiveView.tsx:81 [PHOTO-FLOW] Step 3.1: Stop progress data: {stopId: 'stop_10', done: true, hasPhoto: true, completedAt: '2025-09-27T23:28:29.318Z'}
photoFlowLogger.ts:30 [PhotoFlowLogger] INFO ActiveView:progress_updated_with_photo {stopId: 'stop_10', photoUrl: 'https://res.cloudinary.com/dwmjbmdgq/image/upload/…9015707/scavenger/entries/four-legged-friends_...', stopData: {…}, totalStopsWithPhotos: 1}
ActiveView.tsx:95 [PHOTO-FLOW] Step 4: Updating local progress state (will trigger auto-save in 1 second)
ActiveView.tsx:98 [PHOTO-FLOW] Step 5: Local state updated. Auto-save will trigger in 1 second...
SponsorCard.tsx:166 [SponsorSVG] Rendering SVG for: Chalk Digital SVG length: 48833
SponsorCard.tsx:175 [SponsorSVG] Sanitized SVG: <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" zoomA...
SponsorCard.tsx:166 [SponsorSVG] Rendering SVG for: MAXA SVG length: 193686
SponsorCard.tsx:175 [SponsorSVG] Sanitized SVG: <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" zoomA...
ProgressService.ts:69 [PHOTO-FLOW] Step 9.1: Inside ProgressService.saveProgress()
ProgressService.ts:76 [PHOTO-FLOW] Step 9.2: Validating progress data...
ProgressService.ts:77 [ProgressService] Sending progress with 1 photo URLs: [{…}]
ProgressService.ts:91 [PHOTO-FLOW] Step 9.3: Preparing POST request to: /api/progress/bhhs/berrypicker/fall-2025
ProgressService.ts:92 [PHOTO-FLOW] Step 9.4: Request body contains 1 stops, 1 with photos
photoFlowLogger.ts:30 [PhotoFlowLogger] INFO ProgressService:save_progress_request {url: '/api/progress/bhhs/berrypicker/fall-2025', method: 'POST', stopsWithPhotos: 1, totalStops: 1, requestBody: {…}}
ProgressService.ts:113 [PHOTO-FLOW] Step 9.5: Sending POST request to backend...
SponsorCard.tsx:166 [SponsorSVG] Rendering SVG for: Chalk Digital SVG length: 48833
SponsorCard.tsx:175 [SponsorSVG] Sanitized SVG: <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" zoomA...
SponsorCard.tsx:166 [SponsorSVG] Rendering SVG for: MAXA SVG length: 193686
SponsorCard.tsx:175 [SponsorSVG] Sanitized SVG: <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" zoomA...
SponsorCard.tsx:166 [SponsorSVG] Rendering SVG for: Chalk Digital SVG length: 48833
SponsorCard.tsx:175 [SponsorSVG] Sanitized SVG: <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" zoomA...
SponsorCard.tsx:166 [SponsorSVG] Rendering SVG for: MAXA SVG length: 193686
SponsorCard.tsx:175 [SponsorSVG] Sanitized SVG: <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" zoomA...
ActiveView.tsx:155 [PHOTO-FLOW] Step 6: Auto-save triggered (1 second debounce elapsed)
ActiveView.tsx:163 [PHOTO-FLOW] Step 7: Preparing to save progress to Supabase: {orgId: 'bhhs', teamId: 'berrypicker', hunt: 'fall-2025', totalStops: 1, stopsWithPhotos: 1}
ActiveView.tsx:171 [PHOTO-FLOW] Step 8: Progress data with photos: [{…}]
photoFlowLogger.ts:30 [PhotoFlowLogger] INFO ActiveView:auto_save_triggered {orgId: 'bhhs', teamId: 'berrypicker', hunt: 'fall-2025', totalStops: 1, stopsWithPhotos: 1, …}
ActiveView.tsx:194 [PHOTO-FLOW] Step 9: Calling progressService.saveProgress()...
ProgressService.ts:69 [PHOTO-FLOW] Step 9.1: Inside ProgressService.saveProgress()
ProgressService.ts:76 [PHOTO-FLOW] Step 9.2: Validating progress data...
ProgressService.ts:77 [ProgressService] Sending progress with 1 photo URLs: [{…}]
ProgressService.ts:91 [PHOTO-FLOW] Step 9.3: Preparing POST request to: /api/progress/bhhs/berrypicker/fall-2025
ProgressService.ts:92 [PHOTO-FLOW] Step 9.4: Request body contains 1 stops, 1 with photos
photoFlowLogger.ts:30 [PhotoFlowLogger] INFO ProgressService:save_progress_request {url: '/api/progress/bhhs/berrypicker/fall-2025', method: 'POST', stopsWithPhotos: 1, totalStops: 1, requestBody: {…}}
ProgressService.ts:113 [PHOTO-FLOW] Step 9.5: Sending POST request to backend...
ProgressService.ts:140 [PHOTO-FLOW] Step 9.6: Backend responded with status 200
ProgressService.ts:142 [PHOTO-FLOW] Step 9.7: Backend response data: {success: true, updatedStops: 1, timestamp: '2025-09-27T23:28:30.452Z'}
photoFlowLogger.ts:30 [PhotoFlowLogger] INFO ProgressService:save_progress_response_success {status: 200, responseData: {…}}
ProgressService.ts:149 [PHOTO-FLOW] Step 9.8: Progress saved to Supabase successfully!
ProgressService.ts:150 [ProgressService] Progress saved successfully
ProgressService.ts:140 [PHOTO-FLOW] Step 9.6: Backend responded with status 200
ProgressService.ts:142 [PHOTO-FLOW] Step 9.7: Backend response data: {success: true, updatedStops: 1, timestamp: '2025-09-27T23:28:31.012Z'}
photoFlowLogger.ts:30 [PhotoFlowLogger] INFO ProgressService:save_progress_response_success {status: 200, responseData: {…}}
ProgressService.ts:149 [PHOTO-FLOW] Step 9.8: Progress saved to Supabase successfully!
ProgressService.ts:150 [ProgressService] Progress saved successfully
ActiveView.tsx:196 [PHOTO-FLOW] Step 10: ✅ Progress successfully saved to Supabase!
ActiveView.tsx:197 ✅ Progress saved to server
photoFlowLogger.ts:30 [PhotoFlowLogger] INFO ActiveView:auto_save_success {orgId: 'bhhs', teamId: 'berrypicker', hunt: 'fall-2025', stopsWithPhotos: 1}
ProgressService.ts:47  [ProgressService] Failed to load progress: Error: Schema validation failed for progress response: stop_5.completedAt: Invalid ISO date format, stop_3.completedAt: Invalid ISO date format, stop_1.completedAt: Invalid ISO date format, stop_8.completedAt: Invalid ISO date format, stop_10.completedAt: Invalid ISO date format
    at validateSchema (schemas.ts:221:13)
    at ProgressService.getProgress (ProgressService.ts:43:22)
    at async useSWR.revalidateOnFocus (useProgress.ts:33:14)
    at async index.mjs:353:23
getProgress @ ProgressService.ts:47
await in getProgress
useSWR.revalidateOnFocus @ useProgress.ts:33
(anonymous) @ index.mjs:60
(anonymous) @ index.mjs:345
onRevalidate @ index.mjs:503
startRevalidate @ config-context-client-BoS53ST9.mjs:271
mutateByKey @ config-context-client-BoS53ST9.mjs:279
internalMutate @ config-context-client-BoS53ST9.mjs:255
(anonymous) @ index.mjs:467
(anonymous) @ useProgress.ts:77
await in (anonymous)
onSuccess @ ActiveView.tsx:97
(anonymous) @ usePhotoUpload.ts:153
await in (anonymous)
handlePhotoUpload @ ActiveView.tsx:219
handlePhotoUpload @ StopCard.tsx:37
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