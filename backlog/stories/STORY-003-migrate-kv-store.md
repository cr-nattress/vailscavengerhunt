# STORY-003: Migrate KV Store Operations

## Story Details
**Epic:** EPIC-001 (Blob to Supabase Migration)
**Priority:** HIGH
**Status:** NOT STARTED
**Estimated:** 2 days
**Dependencies:** STORY-000

## User Story
**As a** system
**I want to** store key-value pairs in Supabase
**So that** we have better querying and indexing capabilities

## Acceptance Criteria
- [ ] kv-upsert.js uses Supabase instead of blob storage
- [ ] kv-list.js queries Supabase instead of blobs
- [ ] Index-based queries work correctly
- [ ] Prefix filtering supported
- [ ] API remains backward compatible
- [ ] All existing KV data migrated
- [ ] E2E tests pass with 100% coverage

## Technical Tasks

### Task 1: Update kv-upsert.js Function
```bash
# Prompt for AI Assistant:
Update netlify/functions/kv-upsert.js to use Supabase:
1. Replace @netlify/blobs import with Supabase client
2. Use Supabase upsert to kv_store table
3. Handle the indexes array properly (store as PostgreSQL array)
4. Maintain exact same API interface for backward compatibility
5. Add proper error handling with descriptive messages
6. Ensure atomic operations (all or nothing)
7. Return the same response format as before

The function should handle both create and update operations seamlessly.
```

### Task 2: Update kv-list.js Function
```bash
# Prompt for AI Assistant:
Update netlify/functions/kv-list.js to use Supabase:
1. Replace blob listing with Supabase query
2. Implement prefix filtering using SQL LIKE operator (prefix%)
3. Add pagination support (limit, offset parameters)
4. Include option to return values with keys (includeValues parameter)
5. Sort results by key name for consistency
6. Add option to filter by index values
7. Maintain backward compatible response format

Optimize queries with proper indexes for performance.
```

### Task 3: Create KV Migration Script
```bash
# Prompt for AI Assistant:
Create scripts/migrate-kv-store.js that:
1. Connects to blob storage and lists all KV entries
2. Reads each blob and extracts key, value, indexes
3. Transforms data to match kv_store table schema
4. Performs bulk upsert to Supabase (batch size: 100)
5. Verifies each migrated entry
6. Handles errors and supports resume from failure
7. Creates detailed migration report
8. Provides progress updates during migration

Include dry-run mode for testing without making changes.
```

### Task 4: Add Index Query Support
```bash
# Prompt for AI Assistant:
Create netlify/functions/kv-query.js that supports advanced queries:
1. Query by index values (e.g., all keys with specific index)
2. Query by multiple indexes (AND/OR operations)
3. Full-text search in JSON values
4. Range queries on numeric values in JSON
5. Aggregation queries (count, sum, etc.)
6. Export results in different formats (JSON, CSV)

This provides capabilities that blob storage couldn't offer.
```

### Task 5: Create E2E Tests
```bash
# Prompt for AI Assistant:
Create comprehensive tests in tests/e2e/netlify-functions/kv-store.test.js:
1. Test upsert operations (create and update)
2. Test list operations with various filters
3. Test prefix filtering with special characters
4. Test index queries and filtering
5. Test pagination with large datasets (1000+ entries)
6. Test concurrent upserts to same key
7. Test atomic operations (transaction rollback on error)
8. Performance test: 1000 operations in < 10 seconds
9. Test data consistency after migration

Include stress tests with large JSON values (up to 1MB).
```

### Task 6: Add Caching Layer
```bash
# Prompt for AI Assistant:
Implement caching for frequently accessed KV pairs:
1. Add in-memory LRU cache to Supabase client
2. Cache capacity: 100 entries
3. TTL: 5 minutes for cached entries
4. Cache invalidation on updates
5. Cache hit/miss metrics for monitoring
6. Option to bypass cache with header
7. Warm cache on function cold start with common keys

This will improve performance for hot keys.
```

## Testing Requirements
- Unit tests for transformation logic
- Integration tests with real Supabase
- Performance benchmarks before/after migration
- Data integrity verification after migration
- Concurrent operation testing

## Migration Checklist
- [ ] Backup all existing KV data
- [ ] Run migration in dry-run mode first
- [ ] Verify counts match between systems
- [ ] Run migration during low-traffic period
- [ ] Keep blobs for 7 days as backup
- [ ] Monitor performance metrics post-migration

## Definition of Done
- [ ] Both KV functions updated to use Supabase
- [ ] Advanced query function implemented
- [ ] All existing data migrated successfully
- [ ] E2E tests passing with high coverage
- [ ] Performance equal or better than blobs
- [ ] Caching layer implemented and tested
- [ ] Documentation updated with examples
- [ ] Code reviewed and approved

## Performance Targets
- Upsert: < 50ms average
- List: < 100ms for 100 entries
- Query by index: < 30ms
- Cache hit ratio: > 80% for common keys

## Rollback Plan
1. Feature flag: `USE_SUPABASE_KV` (default: false)
2. Keep blob functions as kv-*.blob.js
3. Run both systems in parallel initially
4. Compare results for consistency
5. Switch reads to Supabase after validation

## Notes
- KV store is used extensively throughout the app
- Must maintain 100% backward compatibility
- Index queries will be a new capability
- Performance is critical for this component