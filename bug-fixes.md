# Bug Fix Knowledge Base
A record of all bugs fixed in this application and their solutions.

---

## 2025-09-27 - Photo Upload Database UUID Type Error

**Problem:** Photo uploads to Cloudinary succeeded but database writes failed with error "invalid input syntax for type uuid: 'teacup'". The application was passing team names (strings) where the database expected UUIDs.

**Root Cause:** The hunt_progress table in Supabase requires a UUID for the team_id column, but the application was passing the team name string (e.g., "teacup") directly. PostgreSQL strictly enforces UUID type constraints and rejected the non-UUID value.

**Solution:** Added logic to detect if the provided team ID is a UUID or a team name. If it's a team name, the function now queries the teams table to get the actual UUID before inserting into hunt_progress.

**Key Changes:**
- `netlify/functions/photo-upload-orchestrated.js`: Modified `upsertHuntProgress` function to:
  1. Check if teamId matches UUID regex pattern
  2. If not a UUID, lookup team by name in teams table
  3. Use the actual UUID for database insertion
  4. Added orgId parameter to help with team lookup
- `netlify/functions/write-log.js`: Removed 'ip' field from debug_logs insert (column doesn't exist in table)

**Prevention:**
- Added UUID validation before database operations
- Implemented team name to UUID resolution
- Better error messages to identify UUID vs string mismatches
- Defensive programming to handle both UUID and string inputs

**Test Added:** The fix handles both UUID and team name inputs gracefully, converting team names to UUIDs automatically.

**Keywords:** supabase, uuid, team_id, hunt_progress, type error, postgresql, invalid input syntax

---

## 2025-09-27 - Multipart Form Data Parsing Error

**Problem:** Photo upload endpoint returned 400 Bad Request with "No multipart data found" when uploading from browser, despite multipart/form-data being sent correctly.

**Root Cause:** Express middleware (express.json() and express.urlencoded()) was parsing request bodies before they reached the photo upload handler, destroying the multipart boundary information needed by the Netlify function.

**Solution:** Added raw body capture middleware for multipart requests that preserves the original request body before Express parsing, then passes it as base64 encoded to the Netlify function.

**Key Changes:**
- `src/server/server.ts`:
  1. Added raw body capture middleware for multipart/form-data requests
  2. Removed multer dependency (no longer needed)
  3. Pass raw body as base64 encoded to Netlify functions
  4. Updated handler to detect and use raw body for photo uploads

**Prevention:**
- Middleware order matters - capture raw data before parsing
- Document that multipart data needs special handling
- Test file uploads end-to-end after middleware changes

**Keywords:** multipart, form-data, express, middleware, file upload, boundary, raw body

---

## 2025-09-27 - API Routing 404 Errors

**Problem:** Application failed to initialize with login-initialize endpoint returning 404 errors after switching to centralized apiClient.

**Root Cause:** API client was prepending `/api` to paths, creating `/api/login-initialize`, but Express server only handled Netlify functions at `/.netlify/functions/*` path.

**Solution:** Added route redirects in Express server to forward `/api/*` requests to corresponding Netlify function handlers.

**Key Changes:**
- `src/server/server.ts`: Added route handlers to redirect `/api/login-initialize` and `/api/photo-upload-orchestrated` to Netlify functions
- `src/client/PhotoUploadService.ts`: Fixed path from `/.netlify/functions/photo-upload-orchestrated` to `/photo-upload-orchestrated`
- `netlify.toml`: Added production redirects for API endpoints

**Prevention:**
- Test all endpoints after API client changes
- Document routing architecture
- Maintain consistency between development and production routing

**Keywords:** routing, 404, api client, express, netlify functions, redirect