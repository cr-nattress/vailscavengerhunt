# BUG-002-B: Complete KV Store Supabase Migration

## Summary
Complete the migration of all KV (Key-Value) store operations from Netlify Blob storage to Supabase, ensuring 100% functionality with the existing KV schema.

## Priority: CRITICAL
**Estimated Time**: 2 hours
**Complexity**: MEDIUM
**Impact**: Core KV operations failing, blocking state management

## Prerequisites
- **BUG-002-A** must be completed first (function loading issues fixed)
- KV store schema already deployed to Supabase
- SupabaseKVStore service layer exists

## Root Cause
KV functions still attempting to use blob storage or have incomplete Supabase integration:
- `kv-list.js` - Still uses blob storage
- `kv-upsert.js` - Still uses blob storage
- KV functions returning 404/500 errors in E2E tests

## Current Status
✅ **Completed**:
- KV schema in Supabase (`key_value_store` table)
- SupabaseKVStore service layer
- kv-get-supabase.js and kv-set-supabase.js (need testing)

❌ **Remaining**:
- kv-list.js migration
- kv-upsert.js migration
- End-to-end KV functionality testing

## Implementation Prompt

### Task 1: Migrate kv-list.js to Supabase
**Prompt**: Update the `kv-list.js` function to use the SupabaseKVStore instead of blob storage. The function should list all keys with optional prefix filtering.

**Current Function**: `netlify/functions/kv-list.js`
**Target**: Use `SupabaseKVStore.listKeys(prefix)` method

**Steps**:
1. Read the current kv-list.js implementation
2. Replace blob storage calls with SupabaseKVStore.listKeys()
3. Maintain the same API interface and response format
4. Add proper error handling and CORS headers
5. Ensure the function uses CommonJS exports

**Expected API**:
```
GET /kv-list?prefix=optional-prefix
Response: {
  "keys": ["key1", "key2", "key3"],
  "count": 3,
  "prefix": "optional-prefix"
}
```

**Acceptance Criteria**:
- [ ] Function uses SupabaseKVStore.listKeys()
- [ ] Supports optional prefix filtering
- [ ] Returns proper JSON response format
- [ ] Handles errors gracefully
- [ ] No blob storage dependencies

### Task 2: Migrate kv-upsert.js to Supabase
**Prompt**: Update the `kv-upsert.js` function to use SupabaseKVStore for upsert operations (insert or update key-value pairs).

**Current Function**: `netlify/functions/kv-upsert.js`
**Target**: Use `SupabaseKVStore.set(key, value)` method

**Steps**:
1. Read the current kv-upsert.js implementation
2. Replace blob storage calls with SupabaseKVStore.set()
3. Maintain the same API interface (POST with key/value in body)
4. Add proper validation and error handling
5. Ensure the function uses CommonJS exports

**Expected API**:
```
POST /kv-upsert
Body: { "key": "my-key", "value": { "data": "my-value" } }
Response: {
  "success": true,
  "key": "my-key",
  "operation": "upsert",
  "stored_at": "2025-09-23T23:15:00.000Z"
}
```

**Acceptance Criteria**:
- [ ] Function uses SupabaseKVStore.set()
- [ ] Supports both insert and update operations
- [ ] Returns proper JSON response format
- [ ] Validates input data
- [ ] No blob storage dependencies

### Task 3: Test Complete KV Functionality
**Prompt**: Thoroughly test all KV operations to ensure end-to-end functionality with Supabase backend.

**Test Sequence**:
```bash
# 1. Test KV set operation
curl -X POST "http://localhost:8888/.netlify/functions/kv-set" \
  -H "Content-Type: application/json" \
  -d '{"key": "test-key", "value": {"message": "Hello KV!"}}'

# 2. Test KV get operation
curl "http://localhost:8888/.netlify/functions/kv-get?key=test-key"

# 3. Test KV upsert operation
curl -X POST "http://localhost:8888/.netlify/functions/kv-upsert" \
  -H "Content-Type: application/json" \
  -d '{"key": "upsert-key", "value": {"data": "Upsert test"}}'

# 4. Test KV list operation
curl "http://localhost:8888/.netlify/functions/kv-list"

# 5. Test with prefix
curl "http://localhost:8888/.netlify/functions/kv-list?prefix=test"

# 6. Test Supabase-specific functions
curl -X POST "http://localhost:8888/.netlify/functions/kv-set-supabase" \
  -H "Content-Type: application/json" \
  -d '{"key": "supabase-test", "value": {"direct": "supabase"}}'

curl "http://localhost:8888/.netlify/functions/kv-get-supabase?key=supabase-test"
```

**Acceptance Criteria**:
- [ ] All KV operations return 200 status codes
- [ ] Data can be stored and retrieved successfully
- [ ] List operations work with and without prefix
- [ ] Error cases handled properly (404 for missing keys)
- [ ] Both legacy and Supabase-specific functions work

### Task 4: Run E2E Tests to Verify KV Fixes
**Prompt**: Run the E2E test suite and verify that KV-related tests are now passing.

**Commands**:
```bash
# Run E2E tests with logging
npm run test:e2e:log

# Check the logs for KV-related test results
# Should see 200 responses instead of 404/500 for KV operations
```

**Acceptance Criteria**:
- [ ] KV-related E2E tests pass (no more 404 errors)
- [ ] Overall E2E test success rate improves significantly
- [ ] No "MissingBlobsEnvironmentError" for KV operations
- [ ] Health endpoint shows KV store as functional

## Expected Outcome
- ✅ All KV functions use Supabase instead of blob storage
- ✅ KV operations work end-to-end with 200 responses
- ✅ E2E test success rate increases to ~90%+
- ✅ Foundation ready for settings and state migration

## Verification Checklist
- [ ] kv-list.js migrated and tested
- [ ] kv-upsert.js migrated and tested
- [ ] All KV functions return proper responses
- [ ] E2E tests show improvement in KV operations
- [ ] No blob storage errors for KV functions

## Next Steps
After completion, proceed to **BUG-002-C** to migrate settings management to Supabase.