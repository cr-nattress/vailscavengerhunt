# Epic: Complete Migration from Netlify Blobs to Supabase

## Epic Overview
**Goal:** Completely remove Netlify Blob storage dependency and migrate all data persistence to Supabase, ensuring a single environment configuration that works both locally and in production.

**Business Value:**
- Unified data storage solution
- Better scalability and performance
- Simplified environment management
- Improved data querying capabilities
- Real-time synchronization support

## Success Criteria
- [ ] All Netlify Blob storage references removed from codebase
- [ ] Single Supabase configuration working locally and in production
- [ ] All functions have comprehensive E2E tests
- [ ] No hardcoded data in any function
- [ ] Zero downtime migration
- [ ] Data integrity maintained during migration

## Environment Strategy
Single Supabase instance for both local development and production:
- Use environment variables for Supabase URL and keys
- Implement proper RLS (Row Level Security) policies
- Use service role key for server-side operations
- Anon key for client-side operations

Required Environment Variables:
```
SUPABASE_URL=https://[project-id].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
SUPABASE_ANON_KEY=[anon-key]
```

## Database Schema Requirements

### Tables Needed:
1. **device_locks** - Replace device-locks blob store
2. **debug_logs** - Replace logs blob store
3. **kv_store** - Replace kv blob store
4. **team_progress** - Replace vail-hunt-state blob store
5. **team_mappings** - Replace team-mappings blob store
6. **hunt_settings** - Replace hunt-data blob store

---

## User Stories

### Story 1: Migrate Device Locks (team-verify.js)
**As a** team member
**I want to** verify my team code without conflicts
**So that** only one device can participate per team at a time

#### Acceptance Criteria:
- [ ] Create `device_locks` table in Supabase with columns:
  - `id` (UUID, primary key)
  - `device_fingerprint` (text, unique)
  - `team_id` (text)
  - `expires_at` (timestamp)
  - `created_at` (timestamp)
- [ ] Replace `@netlify/blobs` with Supabase client in `team-verify.js`
- [ ] Implement automatic cleanup of expired locks
- [ ] Add RLS policies for security
- [ ] No hardcoded store names or configurations

#### E2E Tests:
- Test successful team verification
- Test device lock conflict detection
- Test expired lock cleanup
- Test concurrent verification attempts
- Test invalid team codes

---

### Story 2: Migrate Debug Logging (write-log.js)
**As a** developer
**I want to** store debug logs persistently
**So that** I can troubleshoot issues in production

#### Acceptance Criteria:
- [ ] Create `debug_logs` table in Supabase with columns:
  - `id` (UUID, primary key)
  - `filename` (text)
  - `data` (jsonb)
  - `timestamp` (timestamp)
  - `headers` (jsonb)
  - `ip_address` (text)
  - `created_at` (timestamp)
- [ ] Replace blob storage with Supabase in `write-log.js`
- [ ] Implement log retention policy (auto-delete after 30 days)
- [ ] Add indexed columns for efficient querying

#### E2E Tests:
- Test log creation with various data types
- Test log retrieval by timestamp
- Test large payload handling
- Test concurrent log writes
- Test error handling for malformed data

---

### Story 3: Migrate KV Store Operations (kv-upsert.js, kv-list.js)
**As a** system
**I want to** store and retrieve key-value pairs
**So that** I can maintain application state

#### Acceptance Criteria:
- [ ] Create `kv_store` table in Supabase with columns:
  - `id` (UUID, primary key)
  - `key` (text, unique)
  - `value` (jsonb)
  - `indexes` (text[])
  - `updated_at` (timestamp)
  - `created_at` (timestamp)
- [ ] Migrate `kv-upsert.js` to use Supabase upsert
- [ ] Migrate `kv-list.js` to use Supabase queries
- [ ] Implement index-based querying
- [ ] Support prefix-based listing

#### E2E Tests:
- Test upsert operations (create and update)
- Test list operations with and without prefix
- Test index creation and querying
- Test bulk operations
- Test pagination for large datasets

---

### Story 4: Migrate Team Storage (teamStorage.js)
**As a** team
**I want to** store team progress and mappings
**So that** our hunt progress is persisted

#### Acceptance Criteria:
- [ ] Create `team_progress` table with columns:
  - `id` (UUID, primary key)
  - `team_id` (text, unique)
  - `org_id` (text)
  - `hunt_id` (text)
  - `progress` (jsonb)
  - `score` (integer)
  - `updated_at` (timestamp)
- [ ] Create `team_mappings` table with columns:
  - `id` (UUID, primary key)
  - `team_code` (text, unique)
  - `team_id` (text)
  - `team_name` (text)
  - `organization_id` (text)
  - `hunt_id` (text)
  - `is_active` (boolean)
  - `created_at` (timestamp)
- [ ] Remove `teamStorage.js` and update all references to use `supabaseTeamStorage.js`
- [ ] Implement optimistic locking with version/etag

#### E2E Tests:
- Test team creation
- Test team code validation
- Test progress updates
- Test concurrent updates handling
- Test team data retrieval

---

### Story 5: Migrate Leaderboard (leaderboard-get.js)
**As a** participant
**I want to** view the hunt leaderboard
**So that** I can see team rankings

#### Acceptance Criteria:
- [ ] Update `leaderboard-get.js` to query Supabase `team_progress` table
- [ ] Implement efficient aggregation queries
- [ ] Add database indexes for performance
- [ ] Support filtering by org_id and hunt_id
- [ ] Cache results for performance (1-minute TTL)

#### E2E Tests:
- Test leaderboard generation with multiple teams
- Test sorting and ranking logic
- Test filtering by organization and hunt
- Test empty leaderboard handling
- Test performance with 100+ teams

---

### Story 6: Migrate Health Check (health.js)
**As a** system administrator
**I want to** monitor system health
**So that** I can ensure all services are operational

#### Acceptance Criteria:
- [ ] Update health check to verify Supabase connectivity
- [ ] Check all required tables exist
- [ ] Verify read/write permissions
- [ ] Test connection pooling
- [ ] Remove all blob store checks

#### E2E Tests:
- Test healthy system response
- Test degraded state detection
- Test Supabase connection failure handling
- Test permission verification
- Test response time under load

---

### Story 7: Migrate Settings Management (settings-get.js, settings-set.js)
**As a** team
**I want to** save and retrieve hunt settings
**So that** our preferences persist across sessions

#### Acceptance Criteria:
- [ ] Create `hunt_settings` table with columns:
  - `id` (UUID, primary key)
  - `org_id` (text)
  - `team_id` (text)
  - `hunt_id` (text)
  - `settings` (jsonb)
  - `metadata` (jsonb)
  - `last_modified_by` (text)
  - `updated_at` (timestamp)
  - Composite unique index on (org_id, team_id, hunt_id)
- [ ] Update both settings functions to use Supabase
- [ ] Implement audit trail for changes
- [ ] Add contributor tracking

#### E2E Tests:
- Test settings creation and updates
- Test settings retrieval
- Test concurrent updates handling
- Test metadata tracking
- Test audit trail functionality

---

## Migration Plan

### Phase 1: Preparation (Week 1)
1. Set up Supabase project and configure environment variables
2. Create all required tables and indexes
3. Implement RLS policies
4. Create data migration scripts
5. Set up monitoring and alerting

### Phase 2: Development (Week 2-3)
1. Implement all user stories in parallel branches
2. Create comprehensive E2E tests for each function
3. Update environment configuration
4. Remove all hardcoded values
5. Update documentation

### Phase 3: Testing (Week 4)
1. Run all E2E tests locally
2. Deploy to staging environment
3. Perform load testing
4. Conduct security review
5. Test rollback procedures

### Phase 4: Migration (Week 5)
1. Backup existing blob data
2. Run migration scripts to copy data to Supabase
3. Deploy updated functions with feature flags
4. Gradually switch traffic to new implementation
5. Monitor for issues

### Phase 5: Cleanup (Week 6)
1. Remove all blob storage dependencies
2. Delete unused blob stores
3. Remove `@netlify/blobs` package
4. Update all documentation
5. Conduct post-migration review

---

## Testing Strategy

### E2E Test Framework Requirements:
- Use Jest or Vitest for test runner
- Mock Supabase client for unit tests
- Use test database for integration tests
- Implement test data factories
- Add performance benchmarks

### Test Coverage Goals:
- 100% coverage for critical paths
- 90% overall code coverage
- All error scenarios tested
- Performance regression tests
- Security vulnerability tests

---

## Rollback Plan
1. Keep blob storage code in feature flags for 30 days
2. Maintain data sync between blob and Supabase during transition
3. Document rollback procedures for each function
4. Test rollback procedures before migration
5. Monitor for 48 hours post-migration

---

## Success Metrics
- Zero downtime during migration
- No data loss
- Response time improvement of 20%
- 50% reduction in storage costs
- 100% E2E test coverage
- Zero security vulnerabilities

---

## Dependencies and Risks

### Dependencies:
- Supabase project setup and configuration
- Environment variable management system
- CI/CD pipeline updates
- Monitoring and alerting setup

### Risks:
- **Data Loss:** Mitigate with comprehensive backups and gradual rollout
- **Performance Degradation:** Mitigate with load testing and optimization
- **Security Vulnerabilities:** Mitigate with RLS policies and security review
- **Rollback Complexity:** Mitigate with feature flags and data sync

---

## Team Assignments
- **Backend Lead:** Migration implementation and data scripts
- **QA Lead:** E2E test development and execution
- **DevOps Lead:** Environment setup and deployment
- **Security Lead:** RLS policies and security review
- **Product Owner:** Acceptance testing and sign-off