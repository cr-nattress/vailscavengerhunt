# BUG-FIX-PROMPT: Date Format Validation Error

## Date: 2025-09-27

## Problem Description
After successfully uploading a photo and saving progress to the database, the app fails to load progress with a schema validation error. The `completedAt` field values are not matching the expected ISO date format regex pattern.

## Error Messages
```
ProgressService.ts:47  [ProgressService] Failed to load progress: Error: Schema validation failed for progress response: stop_5.completedAt: Invalid ISO date format, stop_3.completedAt: Invalid ISO date format, stop_1.completedAt: Invalid ISO date format, stop_8.completedAt: Invalid ISO date format, stop_10.completedAt: Invalid ISO date format
```

## Root Cause Analysis
The DateISOSchema regex pattern expects a specific ISO date format:
```typescript
// Current regex in schemas.ts
/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/
```

This pattern requires:
- Optional milliseconds (3 digits)
- Optional Z suffix

However, PostgreSQL timestamps might be returning dates with microseconds (6 digits) or different precision, causing the regex to fail.

## Evidence from Logs
1. Line 79: Date being saved: `completedAt: '2025-09-27T23:28:29.318Z'` (3 digit milliseconds - valid)
2. Line 127: Validation error occurs when loading progress back from database
3. Multiple stops (stop_1, stop_3, stop_5, stop_8, stop_10) have invalid date formats

## Files to Check
1. `src/types/schemas.ts` - DateISOSchema regex pattern
2. `netlify/functions/progress-get-supabase.js` - How dates are returned from database
3. Database query results - What format PostgreSQL returns for timestamps

## Solution Strategy
1. Check what date format is actually being returned from the database
2. Update DateISOSchema regex to be more flexible with ISO 8601 formats
3. Consider using a more lenient date validation or date parsing library

## Test Plan
1. Verify progress can be saved (currently working)
2. Verify progress can be loaded after fix
3. Ensure dates display correctly in the UI
4. Test with various date formats from the database