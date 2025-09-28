[NEW] Explain Console errors by using Copilot in Edge: click
         
         to explain an error. 
        Learn more
        Don't show again
index-D5aA-qaW.js:92 [2025-09-28T08:16:34.338Z] [INFO ] [#legacy-logger #api-client] [session:client_1] 🌐 Production mode, using /api URLs 
  Context: {
  "component": "api-client"
}
index-D5aA-qaW.js:92 [Sentry] Browser client initialized in offline mode (no DSN)
index-D5aA-qaW.js:92 [GlobalErrorHandler] Error handlers installed
index-D5aA-qaW.js:92 [URL] No valid path params detected; app remains unlocked
index-D5aA-qaW.js:92 🚀 Org and hunt set, settings will be initialized after team verification
index-D5aA-qaW.js:92 📊 Session ID generated: 3b48b136-da3b-4a5a-b8f1-6490cc59fcb7
index-D5aA-qaW.js:92 🧪 Sending Sentry test log...
index-D5aA-qaW.js:92 ✅ Sentry test log sent successfully
index-D5aA-qaW.js:92 Existing team lock detected, initializing settings for: berrypicker
index-D5aA-qaW.js:92 [LoginService] Initializing with: {orgId: 'bhhs', huntId: 'fall-2025', hasTeamCode: false, hasLockToken: true}
index-D5aA-qaW.js:92 [2025-09-28T08:16:34.367Z] [INFO ] [#legacy-logger #api-client] [session:client_1] Request started 
  Context: {
  "component": "api-client",
  "method": "POST",
  "url": "/api/login-initialize",
  "message": "🌐 API Request: POST /api/login-initialize"
}
index-D5aA-qaW.js:92 [2025-09-28T08:16:34.629Z] [INFO ] [#legacy-logger #api-client] [session:client_1] Response received 
  Context: {
  "component": "api-client",
  "message": "📥 Response: 200 ",
  "status": 200,
  "statusText": "",
  "duration": 262
}
ActiveView-BuxWUIqH.js:10 [useActiveData] Fetching consolidated data...
index-D5aA-qaW.js:90 [ConsolidatedDataService] Fetching active data for bhhs/berrypicker/fall-2025
index-D5aA-qaW.js:90 [ConsolidatedDataService] Active data fetched successfully: {hasSettings: true, progressCount: 9, sponsorCount: 2, locationCount: 10}
ActiveView-BuxWUIqH.js:10 [useActiveData] Data loaded successfully: {hasSettings: true, progressCount: 9, sponsorCount: 2, configKeys: 15}
ActiveView-BuxWUIqH.js:10 [SponsorSVG] Rendering SVG for: Chalk Digital SVG length: 48833
ActiveView-BuxWUIqH.js:10 [SponsorSVG] Sanitized SVG: <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" zoomA...
ActiveView-BuxWUIqH.js:10 [SponsorSVG] Rendering SVG for: MAXA SVG length: 193686
ActiveView-BuxWUIqH.js:10 [SponsorSVG] Sanitized SVG: <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" zoomA...
ActiveView-BuxWUIqH.js:10 🗺️ Loaded 10 locations from API
ActiveView-BuxWUIqH.js:10 [SponsorSVG] Rendering SVG for: Chalk Digital SVG length: 48833
ActiveView-BuxWUIqH.js:10 [SponsorSVG] Sanitized SVG: <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" zoomA...
ActiveView-BuxWUIqH.js:10 [SponsorSVG] Rendering SVG for: MAXA SVG length: 193686
ActiveView-BuxWUIqH.js:10 [SponsorSVG] Sanitized SVG: <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" zoomA...
ActiveView-BuxWUIqH.js:10 [SponsorSVG] Rendering SVG for: Chalk Digital SVG length: 48833
ActiveView-BuxWUIqH.js:10 [SponsorSVG] Sanitized SVG: <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" zoomA...
ActiveView-BuxWUIqH.js:10 [SponsorSVG] Rendering SVG for: MAXA SVG length: 193686
ActiveView-BuxWUIqH.js:10 [SponsorSVG] Sanitized SVG: <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" zoomA...
ActiveView-BuxWUIqH.js:1 [PHOTO-FLOW] Step 9.1: Inside ProgressService.saveProgress()
ActiveView-BuxWUIqH.js:1 [PHOTO-FLOW] Step 9.2: Validating progress data...
ActiveView-BuxWUIqH.js:1 [ProgressService] Sending progress with 9 photo URLs: (9) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
ActiveView-BuxWUIqH.js:1 [PHOTO-FLOW] Step 9.3: Preparing POST request to: /api/progress/bhhs/berrypicker/fall-2025
ActiveView-BuxWUIqH.js:1 [PHOTO-FLOW] Step 9.4: Request body contains 9 stops, 9 with photos
ActiveView-BuxWUIqH.js:1 [PhotoFlowLogger] INFO ProgressService:save_progress_request {url: '/api/progress/bhhs/berrypicker/fall-2025', method: 'POST', stopsWithPhotos: 9, totalStops: 9, requestBody: {…}}
ActiveView-BuxWUIqH.js:1 [PHOTO-FLOW] Step 9.5: Sending POST request to backend...
index-D5aA-qaW.js:92   POST https://findr.quest/api/progress/bhhs/berrypicker/fall-2025 404 (Not Found)
window.fetch @ index-D5aA-qaW.js:92
saveProgress @ ActiveView-BuxWUIqH.js:1
(anonymous) @ ActiveView-BuxWUIqH.js:10
await in (anonymous)
(anonymous) @ ActiveView-BuxWUIqH.js:10
wl @ index-D5aA-qaW.js:41
Go @ index-D5aA-qaW.js:41
(anonymous) @ index-D5aA-qaW.js:41
k @ index-D5aA-qaW.js:26
U @ index-D5aA-qaW.js:26
ActiveView-BuxWUIqH.js:1  [PHOTO-FLOW] Step 9.6: ERROR - Failed to save to Supabase: {status: 404, statusText: '', errorText: '<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <met…  </p>\n      </div>\n    </div>\n  </body>\n</html>\n'}
saveProgress @ ActiveView-BuxWUIqH.js:1
await in saveProgress
(anonymous) @ ActiveView-BuxWUIqH.js:10
await in (anonymous)
(anonymous) @ ActiveView-BuxWUIqH.js:10
wl @ index-D5aA-qaW.js:41
Go @ index-D5aA-qaW.js:41
(anonymous) @ index-D5aA-qaW.js:41
k @ index-D5aA-qaW.js:26
U @ index-D5aA-qaW.js:26
ActiveView-BuxWUIqH.js:1 [PhotoFlowLogger] ERROR ProgressService:save_progress_response_error {status: 404, statusText: '', errorText: '<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <met…  </p>\n      </div>\n    </div>\n  </body>\n</html>\n'}
ActiveView-BuxWUIqH.js:1  [ProgressService] Failed to save progress: Error: Failed to save progress: 
    at Et.saveProgress (ActiveView-BuxWUIqH.js:1:4027)
    at async ActiveView-BuxWUIqH.js:10:10937
saveProgress @ ActiveView-BuxWUIqH.js:1
await in saveProgress
(anonymous) @ ActiveView-BuxWUIqH.js:10
await in (anonymous)
(anonymous) @ ActiveView-BuxWUIqH.js:10
wl @ index-D5aA-qaW.js:41
Go @ index-D5aA-qaW.js:41
(anonymous) @ index-D5aA-qaW.js:41
k @ index-D5aA-qaW.js:26
U @ index-D5aA-qaW.js:26
ActiveView-BuxWUIqH.js:1 [PhotoFlowLogger] ERROR ProgressService:save_progress_error {error: 'Failed to save progress: '}
ActiveView-BuxWUIqH.js:10  [useProgress] Failed to save progress to server
(anonymous) @ ActiveView-BuxWUIqH.js:10
await in (anonymous)
(anonymous) @ ActiveView-BuxWUIqH.js:10
wl @ index-D5aA-qaW.js:41
Go @ index-D5aA-qaW.js:41
(anonymous) @ index-D5aA-qaW.js:41
k @ index-D5aA-qaW.js:26
U @ index-D5aA-qaW.js:26
ActiveView-BuxWUIqH.js:10 [PHOTO-FLOW] Step 6: Auto-save triggered (1 second debounce elapsed)
ActiveView-BuxWUIqH.js:10 [PHOTO-FLOW] Step 7: Preparing to save progress to Supabase: {orgId: 'bhhs', teamId: 'berrypicker', hunt: 'fall-2025', totalStops: 9, stopsWithPhotos: 9}
ActiveView-BuxWUIqH.js:10 [PHOTO-FLOW] Step 8: Progress data with photos: (9) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
ActiveView-BuxWUIqH.js:1 [PhotoFlowLogger] INFO ActiveView:auto_save_triggered {orgId: 'bhhs', teamId: 'berrypicker', hunt: 'fall-2025', totalStops: 9, stopsWithPhotos: 9, …}
ActiveView-BuxWUIqH.js:10 [PHOTO-FLOW] Step 9: Calling progressService.saveProgress()...
ActiveView-BuxWUIqH.js:1 [PHOTO-FLOW] Step 9.1: Inside ProgressService.saveProgress()
ActiveView-BuxWUIqH.js:1 [PHOTO-FLOW] Step 9.2: Validating progress data...
ActiveView-BuxWUIqH.js:1 [ProgressService] Sending progress with 9 photo URLs: (9) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
ActiveView-BuxWUIqH.js:1 [PHOTO-FLOW] Step 9.3: Preparing POST request to: /api/progress/bhhs/berrypicker/fall-2025
ActiveView-BuxWUIqH.js:1 [PHOTO-FLOW] Step 9.4: Request body contains 9 stops, 9 with photos
ActiveView-BuxWUIqH.js:1 [PhotoFlowLogger] INFO ProgressService:save_progress_request {url: '/api/progress/bhhs/berrypicker/fall-2025', method: 'POST', stopsWithPhotos: 9, totalStops: 9, requestBody: {…}}
ActiveView-BuxWUIqH.js:1 [PHOTO-FLOW] Step 9.5: Sending POST request to backend...
index-D5aA-qaW.js:92   POST https://findr.quest/api/progress/bhhs/berrypicker/fall-2025 404 (Not Found)
window.fetch @ index-D5aA-qaW.js:92
saveProgress @ ActiveView-BuxWUIqH.js:1
(anonymous) @ ActiveView-BuxWUIqH.js:10
setTimeout
(anonymous) @ ActiveView-BuxWUIqH.js:10
wl @ index-D5aA-qaW.js:41
Go @ index-D5aA-qaW.js:41
BT @ index-D5aA-qaW.js:41
$r @ index-D5aA-qaW.js:41
Am @ index-D5aA-qaW.js:41
Cr @ index-D5aA-qaW.js:39
Go @ index-D5aA-qaW.js:41
(anonymous) @ index-D5aA-qaW.js:41
k @ index-D5aA-qaW.js:26
U @ index-D5aA-qaW.js:26
ActiveView-BuxWUIqH.js:1  [PHOTO-FLOW] Step 9.6: ERROR - Failed to save to Supabase: {status: 404, statusText: '', errorText: '<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <met…  </p>\n      </div>\n    </div>\n  </body>\n</html>\n'}
saveProgress @ ActiveView-BuxWUIqH.js:1
await in saveProgress
(anonymous) @ ActiveView-BuxWUIqH.js:10
setTimeout
(anonymous) @ ActiveView-BuxWUIqH.js:10
wl @ index-D5aA-qaW.js:41
Go @ index-D5aA-qaW.js:41
BT @ index-D5aA-qaW.js:41
$r @ index-D5aA-qaW.js:41
Am @ index-D5aA-qaW.js:41
Cr @ index-D5aA-qaW.js:39
Go @ index-D5aA-qaW.js:41
(anonymous) @ index-D5aA-qaW.js:41
k @ index-D5aA-qaW.js:26
U @ index-D5aA-qaW.js:26
ActiveView-BuxWUIqH.js:1 [PhotoFlowLogger] ERROR ProgressService:save_progress_response_error {status: 404, statusText: '', errorText: '<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <met…  </p>\n      </div>\n    </div>\n  </body>\n</html>\n'}
ActiveView-BuxWUIqH.js:1  [ProgressService] Failed to save progress: Error: Failed to save progress: 
    at Et.saveProgress (ActiveView-BuxWUIqH.js:1:4027)
    at async ActiveView-BuxWUIqH.js:10:31622
saveProgress @ ActiveView-BuxWUIqH.js:1
await in saveProgress
(anonymous) @ ActiveView-BuxWUIqH.js:10
setTimeout
(anonymous) @ ActiveView-BuxWUIqH.js:10
wl @ index-D5aA-qaW.js:41
Go @ index-D5aA-qaW.js:41
BT @ index-D5aA-qaW.js:41
$r @ index-D5aA-qaW.js:41
Am @ index-D5aA-qaW.js:41
Cr @ index-D5aA-qaW.js:39
Go @ index-D5aA-qaW.js:41
(anonymous) @ index-D5aA-qaW.js:41
k @ index-D5aA-qaW.js:26
U @ index-D5aA-qaW.js:26
ActiveView-BuxWUIqH.js:1 [PhotoFlowLogger] ERROR ProgressService:save_progress_error {error: 'Failed to save progress: '}
ActiveView-BuxWUIqH.js:10 [PHOTO-FLOW] Step 10: ✅ Progress successfully saved to Supabase!
ActiveView-BuxWUIqH.js:10 ✅ Progress saved to server
ActiveView-BuxWUIqH.js:1 [PhotoFlowLogger] INFO ActiveView:auto_save_success {orgId: 'bhhs', teamId: 'berrypicker', hunt: 'fall-2025', stopsWithPhotos: 9}
ActiveView-BuxWUIqH.js:10 [SponsorSVG] Rendering SVG for: Chalk Digital SVG length: 48833
ActiveView-BuxWUIqH.js:10 [SponsorSVG] Sanitized SVG: <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" zoomA...
ActiveView-BuxWUIqH.js:10 [SponsorSVG] Rendering SVG for: MAXA SVG length: 193686
ActiveView-BuxWUIqH.js:10 [SponsorSVG] Sanitized SVG: <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" zoomA...
ActiveView-BuxWUIqH.js:1 [PhotoFlowLogger] INFO usePhotoUpload:upload_start {stopId: 'stop_5', stopTitle: "Water's Edge", fileType: 'file', fileSize: 1353012}
ActiveView-BuxWUIqH.js:10 Using complete upload endpoint (atomic photo + progress update)
ActiveView-BuxWUIqH.js:10 📸 PhotoUploadService.uploadPhotoComplete() called - NEW CONSOLIDATED ENDPOINT
ActiveView-BuxWUIqH.js:10 [SponsorSVG] Rendering SVG for: Chalk Digital SVG length: 48833
ActiveView-BuxWUIqH.js:10 [SponsorSVG] Sanitized SVG: <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" zoomA...
ActiveView-BuxWUIqH.js:10 [SponsorSVG] Rendering SVG for: MAXA SVG length: 193686
ActiveView-BuxWUIqH.js:10 [SponsorSVG] Sanitized SVG: <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" zoomA...
ActiveView-BuxWUIqH.js:10 🔑 Generated idempotency key: 2e666099433f6d4b
ActiveView-BuxWUIqH.js:10 📦 FormData created for complete upload (photo + progress)
ActiveView-BuxWUIqH.js:10 🌐 Making complete upload API request (single atomic operation)...
index-D5aA-qaW.js:92 [2025-09-28T08:17:01.413Z] [INFO ] [#legacy-logger #api-client] [session:client_1] Request started 
  Context: {
  "component": "api-client",
  "method": "POST",
  "url": "/api/photo-upload-complete",
  "message": "🌐 API Request: POST /api/photo-upload-complete"
}
index-D5aA-qaW.js:92 [2025-09-28T08:17:04.465Z] [INFO ] [#legacy-logger #api-client] [session:client_1] Response received 
  Context: {
  "component": "api-client",
  "message": "📥 Response: 200 ",
  "status": 200,
  "statusText": "",
  "duration": 3051
}
ActiveView-BuxWUIqH.js:10 🔍 Complete upload response received: {success: true, photoUrl: 'https://res.cloudinary.com/dwmjbmdgq/image/upload/…-da3b-4a5a-b8f1-6490cc59fcb7_d73b5697b7ee0079.jpg', publicId: 'scavenger/entries/waters-edge_3b48b136-da3b-4a5a-b8f1-6490cc59fcb7_d73b5697b7ee0079', locationSlug: 'waters-edge', title: "Water's Edge", …}
ActiveView-BuxWUIqH.js:10 ✅ Photo uploaded: https://res.cloudinary.com/dwmjbmdgq/image/upload/v1759047424/scavenger/entries/waters-edge_3b48b136-da3b-4a5a-b8f1-6490cc59fcb7_d73b5697b7ee0079.jpg
ActiveView-BuxWUIqH.js:10 ✅ Progress updated: YES
ActiveView-BuxWUIqH.js:1 [PhotoFlowLogger] INFO usePhotoUpload:upload_success {stopId: 'stop_5', photoUrl: 'https://res.cloudinary.com/dwmjbmdgq/image/upload/…9047424/scavenger/entries/waters-edge_3b48b136...', progressUpdated: true, responseData: {…}}
ActiveView-BuxWUIqH.js:10 [PHOTO-FLOW] ✅ Complete upload successful for stop stop_5
ActiveView-BuxWUIqH.js:10 [PHOTO-FLOW] Photo URL: https://res.cloudinary.com/dwmjbmdgq/image/upload/v1759047424/scavenger/entries/waters-edge_3b48b136...
ActiveView-BuxWUIqH.js:10 [PHOTO-FLOW] Progress updated: YES
ActiveView-BuxWUIqH.js:10 [SponsorSVG] Rendering SVG for: Chalk Digital SVG length: 48833
ActiveView-BuxWUIqH.js:10 [SponsorSVG] Sanitized SVG: <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" zoomA...
ActiveView-BuxWUIqH.js:10 [SponsorSVG] Rendering SVG for: MAXA SVG length: 193686
ActiveView-BuxWUIqH.js:10 [SponsorSVG] Sanitized SVG: <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" zoomA...
ActiveView-BuxWUIqH.js:1 [PHOTO-FLOW] Step 9.1: Inside ProgressService.saveProgress()
ActiveView-BuxWUIqH.js:1 [PHOTO-FLOW] Step 9.2: Validating progress data...
ActiveView-BuxWUIqH.js:1 [ProgressService] Sending progress with 10 photo URLs: (10) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
ActiveView-BuxWUIqH.js:1 [PHOTO-FLOW] Step 9.3: Preparing POST request to: /api/progress/bhhs/berrypicker/fall-2025
ActiveView-BuxWUIqH.js:1 [PHOTO-FLOW] Step 9.4: Request body contains 10 stops, 10 with photos
ActiveView-BuxWUIqH.js:1 [PhotoFlowLogger] INFO ProgressService:save_progress_request {url: '/api/progress/bhhs/berrypicker/fall-2025', method: 'POST', stopsWithPhotos: 10, totalStops: 10, requestBody: {…}}
ActiveView-BuxWUIqH.js:1 [PHOTO-FLOW] Step 9.5: Sending POST request to backend...
ActiveView-BuxWUIqH.js:10 [SponsorSVG] Rendering SVG for: Chalk Digital SVG length: 48833
ActiveView-BuxWUIqH.js:10 [SponsorSVG] Sanitized SVG: <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" zoomA...
ActiveView-BuxWUIqH.js:10 [SponsorSVG] Rendering SVG for: MAXA SVG length: 193686
ActiveView-BuxWUIqH.js:10 [SponsorSVG] Sanitized SVG: <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" zoomA...
index-D5aA-qaW.js:92  Unhandled promise rejection: Error: Minified React error #321; visit https://reactjs.org/docs/error-decoder.html?invariant=321 for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
    at Object.Je (index-D5aA-qaW.js:39:16731)
    at ee.useContext (index-D5aA-qaW.js:10:5719)
    at y3 (index-D5aA-qaW.js:92:62418)
    at onSuccess (ActiveView-BuxWUIqH.js:10:29706)
    at ActiveView-BuxWUIqH.js:10:24528
    at async L (ActiveView-BuxWUIqH.js:10:32276)
    at async m (ActiveView-BuxWUIqH.js:2:2817)
(anonymous) @ index-D5aA-qaW.js:92
index-D5aA-qaW.js:39  Uncaught (in promise) Error: Minified React error #321; visit https://reactjs.org/docs/error-decoder.html?invariant=321 for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
    at Object.Je (index-D5aA-qaW.js:39:16731)
    at ee.useContext (index-D5aA-qaW.js:10:5719)
    at y3 (index-D5aA-qaW.js:92:62418)
    at onSuccess (ActiveView-BuxWUIqH.js:10:29706)
    at ActiveView-BuxWUIqH.js:10:24528
    at async L (ActiveView-BuxWUIqH.js:10:32276)
    at async m (ActiveView-BuxWUIqH.js:2:2817)
Je @ index-D5aA-qaW.js:39
ee.useContext @ index-D5aA-qaW.js:10
y3 @ index-D5aA-qaW.js:92
onSuccess @ ActiveView-BuxWUIqH.js:10
(anonymous) @ ActiveView-BuxWUIqH.js:10
await in (anonymous)
L @ ActiveView-BuxWUIqH.js:10
m @ ActiveView-BuxWUIqH.js:2
ak @ index-D5aA-qaW.js:38
lk @ index-D5aA-qaW.js:38
ck @ index-D5aA-qaW.js:38
tm @ index-D5aA-qaW.js:38
u_ @ index-D5aA-qaW.js:38
(anonymous) @ index-D5aA-qaW.js:38
pp @ index-D5aA-qaW.js:41
Pv @ index-D5aA-qaW.js:38
pc @ index-D5aA-qaW.js:38
Uf @ index-D5aA-qaW.js:38
xk @ index-D5aA-qaW.js:38
index-D5aA-qaW.js:92   POST https://findr.quest/api/progress/bhhs/berrypicker/fall-2025 404 (Not Found)
window.fetch @ index-D5aA-qaW.js:92
saveProgress @ ActiveView-BuxWUIqH.js:1
(anonymous) @ ActiveView-BuxWUIqH.js:10
await in (anonymous)
onSuccess @ ActiveView-BuxWUIqH.js:10
(anonymous) @ ActiveView-BuxWUIqH.js:10
await in (anonymous)
L @ ActiveView-BuxWUIqH.js:10
m @ ActiveView-BuxWUIqH.js:2
ak @ index-D5aA-qaW.js:38
lk @ index-D5aA-qaW.js:38
ck @ index-D5aA-qaW.js:38
tm @ index-D5aA-qaW.js:38
u_ @ index-D5aA-qaW.js:38
(anonymous) @ index-D5aA-qaW.js:38
pp @ index-D5aA-qaW.js:41
Pv @ index-D5aA-qaW.js:38
pc @ index-D5aA-qaW.js:38
Uf @ index-D5aA-qaW.js:38
xk @ index-D5aA-qaW.js:38
ActiveView-BuxWUIqH.js:1  [PHOTO-FLOW] Step 9.6: ERROR - Failed to save to Supabase: {status: 404, statusText: '', errorText: '<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <met…  </p>\n      </div>\n    </div>\n  </body>\n</html>\n'}
saveProgress @ ActiveView-BuxWUIqH.js:1
await in saveProgress
(anonymous) @ ActiveView-BuxWUIqH.js:10
await in (anonymous)
onSuccess @ ActiveView-BuxWUIqH.js:10
(anonymous) @ ActiveView-BuxWUIqH.js:10
await in (anonymous)
L @ ActiveView-BuxWUIqH.js:10
m @ ActiveView-BuxWUIqH.js:2
ak @ index-D5aA-qaW.js:38
lk @ index-D5aA-qaW.js:38
ck @ index-D5aA-qaW.js:38
tm @ index-D5aA-qaW.js:38
u_ @ index-D5aA-qaW.js:38
(anonymous) @ index-D5aA-qaW.js:38
pp @ index-D5aA-qaW.js:41
Pv @ index-D5aA-qaW.js:38
pc @ index-D5aA-qaW.js:38
Uf @ index-D5aA-qaW.js:38
xk @ index-D5aA-qaW.js:38
ActiveView-BuxWUIqH.js:1 [PhotoFlowLogger] ERROR ProgressService:save_progress_response_error {status: 404, statusText: '', errorText: '<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <met…  </p>\n      </div>\n    </div>\n  </body>\n</html>\n'}
ActiveView-BuxWUIqH.js:1  [ProgressService] Failed to save progress: Error: Failed to save progress: 
    at Et.saveProgress (ActiveView-BuxWUIqH.js:1:4027)
    at async ActiveView-BuxWUIqH.js:10:10937
saveProgress @ ActiveView-BuxWUIqH.js:1
await in saveProgress
(anonymous) @ ActiveView-BuxWUIqH.js:10
await in (anonymous)
onSuccess @ ActiveView-BuxWUIqH.js:10
(anonymous) @ ActiveView-BuxWUIqH.js:10
await in (anonymous)
L @ ActiveView-BuxWUIqH.js:10
m @ ActiveView-BuxWUIqH.js:2
ak @ index-D5aA-qaW.js:38
lk @ index-D5aA-qaW.js:38
ck @ index-D5aA-qaW.js:38
tm @ index-D5aA-qaW.js:38
u_ @ index-D5aA-qaW.js:38
(anonymous) @ index-D5aA-qaW.js:38
pp @ index-D5aA-qaW.js:41
Pv @ index-D5aA-qaW.js:38
pc @ index-D5aA-qaW.js:38
Uf @ index-D5aA-qaW.js:38
xk @ index-D5aA-qaW.js:38
ActiveView-BuxWUIqH.js:1 [PhotoFlowLogger] ERROR ProgressService:save_progress_error {error: 'Failed to save progress: '}
ActiveView-BuxWUIqH.js:10  [useProgress] Failed to save progress to server
(anonymous) @ ActiveView-BuxWUIqH.js:10
await in (anonymous)
onSuccess @ ActiveView-BuxWUIqH.js:10
(anonymous) @ ActiveView-BuxWUIqH.js:10
await in (anonymous)
L @ ActiveView-BuxWUIqH.js:10
m @ ActiveView-BuxWUIqH.js:2
ak @ index-D5aA-qaW.js:38
lk @ index-D5aA-qaW.js:38
ck @ index-D5aA-qaW.js:38
tm @ index-D5aA-qaW.js:38
u_ @ index-D5aA-qaW.js:38
(anonymous) @ index-D5aA-qaW.js:38
pp @ index-D5aA-qaW.js:41
Pv @ index-D5aA-qaW.js:38
pc @ index-D5aA-qaW.js:38
Uf @ index-D5aA-qaW.js:38
xk @ index-D5aA-qaW.js:38
ActiveView-BuxWUIqH.js:10 [PHOTO-FLOW] Step 6: Auto-save triggered (1 second debounce elapsed)
ActiveView-BuxWUIqH.js:10 [PHOTO-FLOW] Step 7: Preparing to save progress to Supabase: {orgId: 'bhhs', teamId: 'berrypicker', hunt: 'fall-2025', totalStops: 10, stopsWithPhotos: 10}
ActiveView-BuxWUIqH.js:10 [PHOTO-FLOW] Step 8: Progress data with photos: (10) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
ActiveView-BuxWUIqH.js:1 [PhotoFlowLogger] INFO ActiveView:auto_save_triggered {orgId: 'bhhs', teamId: 'berrypicker', hunt: 'fall-2025', totalStops: 10, stopsWithPhotos: 10, …}
ActiveView-BuxWUIqH.js:10 [PHOTO-FLOW] Step 9: Calling progressService.saveProgress()...
ActiveView-BuxWUIqH.js:1 [PHOTO-FLOW] Step 9.1: Inside ProgressService.saveProgress()
ActiveView-BuxWUIqH.js:1 [PHOTO-FLOW] Step 9.2: Validating progress data...
ActiveView-BuxWUIqH.js:1 [ProgressService] Sending progress with 10 photo URLs: (10) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
ActiveView-BuxWUIqH.js:1 [PHOTO-FLOW] Step 9.3: Preparing POST request to: /api/progress/bhhs/berrypicker/fall-2025
ActiveView-BuxWUIqH.js:1 [PHOTO-FLOW] Step 9.4: Request body contains 10 stops, 10 with photos
ActiveView-BuxWUIqH.js:1 [PhotoFlowLogger] INFO ProgressService:save_progress_request {url: '/api/progress/bhhs/berrypicker/fall-2025', method: 'POST', stopsWithPhotos: 10, totalStops: 10, requestBody: {…}}
ActiveView-BuxWUIqH.js:1 [PHOTO-FLOW] Step 9.5: Sending POST request to backend...
index-D5aA-qaW.js:92   POST https://findr.quest/api/progress/bhhs/berrypicker/fall-2025 404 (Not Found)
window.fetch @ index-D5aA-qaW.js:92
saveProgress @ ActiveView-BuxWUIqH.js:1
(anonymous) @ ActiveView-BuxWUIqH.js:10
setTimeout
(anonymous) @ ActiveView-BuxWUIqH.js:10
wl @ index-D5aA-qaW.js:41
Go @ index-D5aA-qaW.js:41
BT @ index-D5aA-qaW.js:41
$r @ index-D5aA-qaW.js:41
Am @ index-D5aA-qaW.js:41
Cr @ index-D5aA-qaW.js:39
(anonymous) @ index-D5aA-qaW.js:41
ActiveView-BuxWUIqH.js:1  [PHOTO-FLOW] Step 9.6: ERROR - Failed to save to Supabase: {status: 404, statusText: '', errorText: '<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <met…  </p>\n      </div>\n    </div>\n  </body>\n</html>\n'}
saveProgress @ ActiveView-BuxWUIqH.js:1
await in saveProgress
(anonymous) @ ActiveView-BuxWUIqH.js:10
setTimeout
(anonymous) @ ActiveView-BuxWUIqH.js:10
wl @ index-D5aA-qaW.js:41
Go @ index-D5aA-qaW.js:41
BT @ index-D5aA-qaW.js:41
$r @ index-D5aA-qaW.js:41
Am @ index-D5aA-qaW.js:41
Cr @ index-D5aA-qaW.js:39
(anonymous) @ index-D5aA-qaW.js:41
ActiveView-BuxWUIqH.js:1 [PhotoFlowLogger] ERROR ProgressService:save_progress_response_error {status: 404, statusText: '', errorText: '<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <met…  </p>\n      </div>\n    </div>\n  </body>\n</html>\n'}
ActiveView-BuxWUIqH.js:1  [ProgressService] Failed to save progress: Error: Failed to save progress: 
    at Et.saveProgress (ActiveView-BuxWUIqH.js:1:4027)
    at async ActiveView-BuxWUIqH.js:10:31622
saveProgress @ ActiveView-BuxWUIqH.js:1
await in saveProgress
(anonymous) @ ActiveView-BuxWUIqH.js:10
setTimeout
(anonymous) @ ActiveView-BuxWUIqH.js:10
wl @ index-D5aA-qaW.js:41
Go @ index-D5aA-qaW.js:41
BT @ index-D5aA-qaW.js:41
$r @ index-D5aA-qaW.js:41
Am @ index-D5aA-qaW.js:41
Cr @ index-D5aA-qaW.js:39
(anonymous) @ index-D5aA-qaW.js:41
ActiveView-BuxWUIqH.js:1 [PhotoFlowLogger] ERROR ProgressService:save_progress_error {error: 'Failed to save progress: '}
ActiveView-BuxWUIqH.js:10 [PHOTO-FLOW] Step 10: ✅ Progress successfully saved to Supabase!
ActiveView-BuxWUIqH.js:10 ✅ Progress saved to server
ActiveView-BuxWUIqH.js:1 [PhotoFlowLogger] INFO ActiveView:auto_save_success {orgId: 'bhhs', teamId: 'berrypicker', hunt: 'fall-2025', stopsWithPhotos: 10}