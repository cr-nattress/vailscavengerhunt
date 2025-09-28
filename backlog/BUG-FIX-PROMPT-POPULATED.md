# Bug Fix Request: Photo Upload Database Write Failure

## Bug Information

### Bug Description:
Photo upload to Cloudinary succeeds but the application returns a 500 error because the database write to Supabase fails. The upload process successfully uploads the image to Cloudinary and verifies it, but when trying to update the hunt_progress table, it fails and triggers compensation (rollback) logic. The error message shown to users is "Failed to process upload" with "An unexpected error occurred".

### Error Messages/Logs:
```
POST http://localhost:3001/api/photo-upload-orchestrated 500 (Internal Server Error)

Server logs:
[req_1759005111386_job4kesac] Starting orchestrated upload...
[req_1759005111386_job4kesac] Uploading to Cloudinary...
[req_1759005111386_job4kesac] Cloudinary upload successful
[req_1759005111386_job4kesac] Verifying Cloudinary asset...
[req_1759005111386_job4kesac] Updating hunt progress...
[req_1759005111386_job4kesac] Database write failed, compensating...
[req_1759005111386_job4kesac] Orchestrated upload error

Additional error:
[write-log] Supabase insert failed, falling back to console: Could not find the 'ip' column of 'debug_logs' in the schema cache
```

### Steps to Reproduce:
1. Open the application and navigate to a stop
2. Click the photo upload button and select an image
3. Upload process starts and shows spinner
4. Image successfully uploads to Cloudinary (verified in logs)
5. Error appears: "Failed to process upload"
6. Database update fails with schema cache error

### Affected Files/Components:
- `/netlify/functions/photo-upload-orchestrated.js` - Main upload handler
- `/netlify/functions/_lib/supabaseClient.js` - Supabase client configuration
- Database schema - hunt_progress table and debug_logs table

## Your Task

### Phase 1: Check Previous Solutions
Check for similar database/Supabase issues in previous bug fixes related to schema cache problems or column mismatches.

### Phase 2: Root Cause Analysis

**Trace the Bug:**
1. Photo upload succeeds to Cloudinary
2. Verification of Cloudinary asset passes
3. Attempt to update hunt_progress table in Supabase
4. Database write fails with schema-related error
5. Compensation/rollback is triggered
6. 500 error returned to client

**Categorize the Issue:**
- Configuration problem (Supabase schema cache)
- Database schema mismatch

**Understand Why:**
The Supabase client appears to have an outdated schema cache. The error about 'ip' column in 'debug_logs' table suggests the client is trying to access columns that either don't exist or aren't properly synchronized with the actual database schema.

### Phase 3: Design the Solution

**Choose Approach:**
1. Clear/refresh Supabase schema cache
2. Verify database schema matches expected structure
3. Add proper error handling for schema issues
4. Consider adding retry logic with schema refresh

**Identify Impact:**
- Supabase client configuration
- Database write operations
- Error handling in upload function

### Phase 4: Implement the Fix

1. Refresh Supabase schema cache
2. Add schema validation before database operations
3. Improve error messages to be more specific
4. Add retry logic for transient schema cache issues

### Phase 5: Prevent Recurrence

- Add schema validation on startup
- Log schema cache state for debugging
- Add monitoring for database write failures
- Document Supabase configuration requirements

### Phase 6: Verification Plan

**Immediate Testing:**
1. Upload a photo and verify it completes successfully
2. Check that hunt_progress table is updated
3. Verify no schema cache errors in logs
4. Confirm error handling works if database is unavailable

**Edge Cases to Check:**
1. Multiple rapid uploads
2. Upload with network interruption
3. Upload when database is temporarily unavailable
4. Upload with invalid team/location IDs

**Keywords:** supabase, schema cache, database write failure, hunt_progress, photo upload, orchestrated upload