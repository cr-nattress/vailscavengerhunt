# STORY-001: Migrate Debug Logging System

## Story Details
**Epic:** EPIC-001 (Blob to Supabase Migration)
**Priority:** HIGH
**Status:** NOT STARTED
**Estimated:** 1 day
**Dependencies:** STORY-000

## User Story
**As a** developer
**I want to** store debug logs in Supabase
**So that** I can query and analyze logs more efficiently

## Acceptance Criteria
- [ ] write-log.js uses Supabase instead of blob storage
- [ ] Logs are stored in debug_logs table
- [ ] Large payloads (>1MB) handled gracefully
- [ ] Fallback to console.log if Supabase unavailable
- [ ] 30-day retention policy implemented
- [ ] E2E tests pass with 100% coverage

## Technical Tasks

### Task 1: Update write-log.js Function
```bash
# Prompt for AI Assistant:
Update netlify/functions/write-log.js to use Supabase instead of @netlify/blobs:
1. Remove the @netlify/blobs import
2. Import the Supabase client from _lib/supabaseClient.js
3. Replace blob storage logic with Supabase insert to debug_logs table
4. Keep the same API interface (no breaking changes)
5. Add try-catch with fallback to console.log if Supabase fails
6. Validate data size and truncate if > 1MB
7. Ensure IP address and headers are captured correctly
```

### Task 2: Create Log Query Utility
```bash
# Prompt for AI Assistant:
Create netlify/functions/_lib/logQuery.js utility that provides:
1. Function to query logs by time range
2. Function to query logs by filename pattern
3. Function to get error logs (where data contains errors)
4. Pagination support (limit/offset)
5. Function to count logs by type
6. Function to get recent logs (last 24 hours)

Also create a simple viewer function netlify/functions/logs-view.js that uses these utilities.
```

### Task 3: Implement Retention Policy
```bash
# Prompt for AI Assistant:
Implement automatic log cleanup:
1. Create a Netlify scheduled function (runs daily at 2 AM)
2. Delete logs older than 30 days from debug_logs table
3. Log the cleanup summary (number of records deleted)
4. Handle errors gracefully
5. Add configuration to adjust retention period via environment variable

File: netlify/functions/scheduled-log-cleanup.js
```

### Task 4: Add E2E Tests
```bash
# Prompt for AI Assistant:
Create comprehensive E2E tests in tests/e2e/netlify-functions/write-log.test.js:
1. Test successful log creation with various data types
2. Test large payload handling (over 1MB)
3. Test concurrent writes (10 simultaneous requests)
4. Test malformed data handling
5. Test fallback when Supabase is unavailable
6. Test that headers and IP are captured correctly
7. Test the log query utilities
8. Performance test: 100 logs written in < 5 seconds

Use the test template from tests/e2e/netlify-functions/test-template.js
```

### Task 5: Migrate Existing Logs
```bash
# Prompt for AI Assistant:
Create a migration script scripts/migrate-debug-logs.js that:
1. Reads all existing logs from blob storage
2. Transforms them to match the debug_logs table schema
3. Bulk inserts them into Supabase (batch size: 100)
4. Maintains original timestamps
5. Provides progress updates during migration
6. Creates a summary report of migrated logs
7. Handles errors and allows resume from failure point
```

## Testing Requirements
- Unit tests for log transformation logic
- E2E tests for all API endpoints
- Performance test with 100 concurrent writes
- Verify retention policy works correctly
- Test fallback behavior when Supabase is down

## Definition of Done
- [ ] write-log.js updated to use Supabase
- [ ] Log query utilities created and working
- [ ] Retention policy implemented and tested
- [ ] All E2E tests passing
- [ ] Existing logs migrated successfully
- [ ] Performance benchmarks met (<100ms average response)
- [ ] Documentation updated
- [ ] Code reviewed and approved

## Rollback Plan
1. Keep original write-log.js as write-log.blob.js
2. Use feature flag `USE_SUPABASE_LOGS` (default: false)
3. Can switch back instantly by changing flag
4. Keep blob storage for 30 days after migration

## Notes
- This is a good first migration - low risk
- Logs are write-only from app perspective
- No critical dependencies on log data
- Good test case for Supabase performance