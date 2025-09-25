# EPIC-001: Complete Migration from Netlify Blobs to Supabase

## Epic Summary
Migrate all data persistence from Netlify Blob storage to Supabase, creating a unified storage solution that works seamlessly in both local and production environments.

## Priority: HIGH
## Estimated Effort: 6 weeks
## Status: NOT STARTED

---

## Phase 0: Infrastructure Setup (Prerequisites)
Must be completed before any user stories can begin.

### STORY-000: Supabase Infrastructure Setup
**Priority:** CRITICAL - Blocker for all other stories
**Estimated:** 2 days
**Dependencies:** None

#### Task Prompts:
1. **Setup Supabase Project**
   ```
   Create a new Supabase project and configure the initial database.
   Set up authentication with service role and anon keys.
   Document all connection details and environment variables needed.
   ```

2. **Run Database Schema**
   ```
   Execute the SQL schema from scripts/sql/supabase-migration-schema.sql.
   Verify all tables, indexes, and RLS policies are created successfully.
   Test basic CRUD operations on each table.
   ```

3. **Configure Environment Variables**
   ```
   Add SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_ANON_KEY to .env files.
   Update netlify.toml with production environment variables.
   Create .env.example with placeholder values for documentation.
   ```

4. **Create Supabase Client Utility**
   ```
   Create netlify/functions/_lib/supabaseClient.js that:
   - Initializes Supabase client with service role key
   - Handles connection errors gracefully
   - Provides helper methods for common operations
   - Includes retry logic for transient failures
   ```

---

## Phase 1: Low-Risk Migrations (Week 1-2)
Start with functions that have minimal impact and simpler data structures.

### STORY-001: Migrate Debug Logging System
**Priority:** HIGH (Low risk, good test case)
**Estimated:** 1 day
**Dependencies:** STORY-000

#### Task Prompts:
1. **Update write-log.js Function**
   ```
   Replace @netlify/blobs import with Supabase client in netlify/functions/write-log.js.
   Implement insert to debug_logs table with proper error handling.
   Add fallback mode if Supabase is unavailable (console.log only).
   Test with various payload sizes and data types.
   ```

2. **Create Log Viewer Utility**
   ```
   Create a utility function to query debug_logs from Supabase.
   Add filtering by timestamp, filename, and error count.
   Implement pagination for large result sets.
   ```

3. **Add E2E Tests**
   ```
   Create tests/e2e/netlify-functions/write-log.test.js.
   Test successful log creation, large payloads, concurrent writes.
   Test error scenarios and fallback behavior.
   Verify 30-day retention policy works.
   ```

### STORY-002: Migrate Health Check
**Priority:** HIGH (Critical for monitoring)
**Estimated:** 0.5 days
**Dependencies:** STORY-000

#### Task Prompts:
1. **Update health.js Function**
   ```
   Replace blob store checks with Supabase connectivity tests in netlify/functions/health.js.
   Check if all required tables exist and are accessible.
   Test read/write permissions on each table.
   Add response time metrics for Supabase queries.
   ```

2. **Add Monitoring Dashboard**
   ```
   Create a simple health status endpoint that returns:
   - Supabase connection status
   - Table accessibility status
   - Average response times
   - Any degraded services
   ```

3. **Add E2E Tests**
   ```
   Create tests/e2e/netlify-functions/health.test.js.
   Test healthy system response, degraded states, connection failures.
   Test performance under load (100 concurrent requests).
   ```

---

## Phase 2: Core Storage Migrations (Week 2-3)
Migrate the main storage mechanisms used throughout the application.

### STORY-003: Migrate KV Store Operations
**Priority:** HIGH (Widely used)
**Estimated:** 2 days
**Dependencies:** STORY-000

#### Task Prompts:
1. **Update kv-upsert.js Function**
   ```
   Replace @netlify/blobs with Supabase in netlify/functions/kv-upsert.js.
   Implement upsert logic using Supabase's upsert method.
   Handle index arrays properly (store as PostgreSQL arrays).
   Maintain backward compatibility with existing API.
   ```

2. **Update kv-list.js Function**
   ```
   Replace blob listing with Supabase queries in netlify/functions/kv-list.js.
   Implement prefix-based filtering using SQL LIKE operator.
   Add pagination support for large result sets.
   Include option to retrieve values along with keys.
   ```

3. **Create Migration Script**
   ```
   Create scripts/migrate-kv-data.js to:
   - Read all existing KV data from blobs
   - Transform to Supabase format
   - Bulk insert into kv_store table
   - Verify data integrity after migration
   ```

4. **Add E2E Tests**
   ```
   Create tests/e2e/netlify-functions/kv-store.test.js.
   Test upsert, list, prefix filtering, index queries.
   Test concurrent operations and data consistency.
   Performance test with 1000+ entries.
   ```

### STORY-004: Migrate Settings Management
**Priority:** MEDIUM
**Estimated:** 1 day
**Dependencies:** STORY-000

#### Task Prompts:
1. **Update settings-set.js Function**
   ```
   Replace blob storage with Supabase in netlify/functions/settings-set.js.
   Implement upsert to hunt_settings table.
   Update metadata tracking for contributors.
   Add audit trail for all changes.
   ```

2. **Update settings-get.js Function**
   ```
   Replace blob retrieval with Supabase query in netlify/functions/settings-get.js.
   Use composite key (org_id, team_id, hunt_id) for lookups.
   Add caching layer with 1-minute TTL.
   Handle missing settings gracefully.
   ```

3. **Add E2E Tests**
   ```
   Create tests/e2e/netlify-functions/settings.test.js.
   Test CRUD operations, concurrent updates, metadata tracking.
   Verify audit trail captures all changes.
   Test with multiple teams and organizations.
   ```

---

## Phase 3: Team Management Migrations (Week 3-4)
Migrate the critical team-related functions.

### STORY-005: Migrate Team Storage and Mappings
**Priority:** CRITICAL
**Estimated:** 3 days
**Dependencies:** STORY-000

#### Task Prompts:
1. **Deprecate Legacy teamStorage.js**
   ```
   Mark netlify/functions/_lib/teamStorage.js as deprecated.
   Update all imports to use supabaseTeamStorage.js instead.
   Ensure supabaseTeamStorage.js has all required methods.
   Add migration warnings to legacy file.
   ```

2. **Update team-verify.js for Device Locks**
   ```
   Replace device lock blob storage with Supabase in netlify/functions/team-verify.js.
   Implement device_locks table operations.
   Add automatic cleanup of expired locks.
   Maintain existing lock conflict detection logic.
   ```

3. **Migrate Team Mappings Data**
   ```
   Create scripts/migrate-team-data.js to:
   - Export all team mappings from blob storage
   - Transform to Supabase format
   - Bulk insert into team_mappings table
   - Verify all team codes work after migration
   ```

4. **Update Team Progress Tracking**
   ```
   Ensure team progress is stored in team_progress table.
   Implement optimistic locking with version field.
   Calculate progress statistics using database triggers.
   Add indexes for efficient leaderboard queries.
   ```

5. **Add E2E Tests**
   ```
   Create tests/e2e/netlify-functions/team-verify.test.js.
   Test team verification, device locks, conflicts, expiration.
   Test concurrent verifications from multiple devices.
   Verify team creation and progress tracking.
   ```

### STORY-006: Migrate Leaderboard Function
**Priority:** HIGH
**Estimated:** 1 day
**Dependencies:** STORY-005

#### Task Prompts:
1. **Update leaderboard-get.js Function**
   ```
   Replace blob iteration with Supabase query in netlify/functions/leaderboard-get.js.
   Use indexed queries on team_progress table.
   Implement efficient sorting and ranking.
   Add caching with 1-minute TTL for performance.
   ```

2. **Optimize Database Queries**
   ```
   Create database function get_leaderboard() for efficient querying.
   Add composite indexes for org_id, hunt_id, percent_complete.
   Test query performance with 100+ teams.
   Implement query result caching.
   ```

3. **Add E2E Tests**
   ```
   Create tests/e2e/netlify-functions/leaderboard.test.js.
   Test with 0, 1, 10, 100+ teams.
   Verify sorting and ranking logic.
   Test filtering by organization and hunt.
   Benchmark response times.
   ```

---

## Phase 4: Data Migration and Validation (Week 4)

### STORY-007: Complete Data Migration
**Priority:** CRITICAL
**Estimated:** 2 days
**Dependencies:** All previous stories

#### Task Prompts:
1. **Create Master Migration Script**
   ```
   Create scripts/master-migration.js that:
   - Backs up all blob data to JSON files
   - Runs all individual migration scripts in order
   - Validates data integrity after each step
   - Provides rollback capability if errors occur
   ```

2. **Implement Data Validation**
   ```
   Create scripts/validate-migration.js to:
   - Compare record counts between blob and Supabase
   - Verify all team codes still work
   - Check all progress data is intact
   - Generate migration report with any discrepancies
   ```

3. **Create Rollback Procedures**
   ```
   Document step-by-step rollback process.
   Create scripts/rollback-migration.js for emergency use.
   Test rollback in staging environment.
   Ensure zero data loss during rollback.
   ```

---

## Phase 5: Cleanup and Optimization (Week 5)

### STORY-008: Remove Blob Dependencies
**Priority:** MEDIUM
**Estimated:** 1 day
**Dependencies:** STORY-007

#### Task Prompts:
1. **Remove @netlify/blobs Package**
   ```
   Remove @netlify/blobs from package.json and package-lock.json.
   Remove from netlify/functions/package.json as well.
   Search for any remaining imports and remove them.
   Update documentation to reflect removal.
   ```

2. **Clean Up Environment Variables**
   ```
   Remove any blob-related environment variables.
   Update .env.example to show only Supabase variables.
   Update netlify.toml to remove blob configurations.
   Document the simplified configuration.
   ```

3. **Archive Legacy Code**
   ```
   Move teamStorage.js to an archive folder.
   Add deprecation notices to any blob-related utilities.
   Update all imports and references.
   Create migration guide for future reference.
   ```

---

## Phase 6: Performance and Monitoring (Week 6)

### STORY-009: Performance Optimization
**Priority:** HIGH
**Estimated:** 2 days
**Dependencies:** All previous stories

#### Task Prompts:
1. **Add Connection Pooling**
   ```
   Implement connection pooling for Supabase client.
   Configure optimal pool size based on load testing.
   Add connection retry logic with exponential backoff.
   Monitor connection pool health.
   ```

2. **Implement Caching Layer**
   ```
   Add Redis or in-memory caching for frequently accessed data.
   Cache leaderboard results with 1-minute TTL.
   Cache team mappings with 5-minute TTL.
   Implement cache invalidation on updates.
   ```

3. **Performance Testing**
   ```
   Run load tests with 1000 concurrent users.
   Benchmark all functions before and after migration.
   Document performance improvements.
   Set up alerts for performance degradation.
   ```

### STORY-010: Monitoring and Alerting
**Priority:** HIGH
**Estimated:** 1 day
**Dependencies:** STORY-009

#### Task Prompts:
1. **Set Up Monitoring**
   ```
   Configure Supabase monitoring dashboard.
   Set up alerts for connection failures.
   Monitor query performance and slow queries.
   Track storage usage and growth.
   ```

2. **Create Operational Runbook**
   ```
   Document common issues and solutions.
   Create troubleshooting guide for Supabase issues.
   Document backup and restore procedures.
   Include emergency contact information.
   ```

---

## Success Criteria Checklist

### Technical Requirements
- [ ] All blob storage references removed
- [ ] Single Supabase configuration working
- [ ] All functions have E2E tests
- [ ] No hardcoded configuration values
- [ ] Performance metrics improved by 20%

### Operational Requirements
- [ ] Zero downtime during migration
- [ ] Data integrity maintained
- [ ] Rollback procedures tested
- [ ] Monitoring and alerting configured
- [ ] Documentation updated

### Quality Requirements
- [ ] 100% E2E test coverage for critical paths
- [ ] 90% overall code coverage
- [ ] Load testing passed (1000 concurrent users)
- [ ] Security review completed
- [ ] Code review approved

---

## Risk Mitigation

### Feature Flags Implementation
```
Create feature flags for gradual rollout:
- USE_SUPABASE_LOGS (write-log.js)
- USE_SUPABASE_KV (kv-*.js)
- USE_SUPABASE_TEAMS (team-*.js)
- USE_SUPABASE_SETTINGS (settings-*.js)
Enable incrementally and monitor for issues.
```

### Parallel Running Strategy
```
Run both blob and Supabase in parallel for 48 hours:
- Write to both systems
- Read from blobs (primary)
- Compare data consistency
- Switch read to Supabase after validation
```

### Emergency Contacts
- Supabase Support: support@supabase.io
- DevOps On-Call: [Your contact info]
- Product Owner: [Contact info]

---

## Notes for Implementation

1. **Start with STORY-000** - Nothing else can proceed without infrastructure
2. **Run STORY-001 and STORY-002 in parallel** - Both are low risk
3. **STORY-005 is critical path** - Many functions depend on team data
4. **Keep feature flags for 30 days** after migration completes
5. **Document everything** - Future developers will thank you

---

## Tracking Progress

Use this template for daily standups:
```
Date: [DATE]
Stories Completed: [List]
Stories In Progress: [List]
Blockers: [List]
Next Steps: [List]
```