# STORY-005: Migrate Team Storage and Mappings

## Story Details
**Epic:** EPIC-001 (Blob to Supabase Migration)
**Priority:** CRITICAL
**Status:** NOT STARTED
**Estimated:** 3 days
**Dependencies:** STORY-000

## User Story
**As a** team member
**I want to** have my team data stored in Supabase
**So that** we get better performance and reliability

## Acceptance Criteria
- [ ] team-verify.js uses Supabase for device locks
- [ ] Team mappings migrated to team_mappings table
- [ ] Team progress tracked in team_progress table
- [ ] Legacy teamStorage.js deprecated
- [ ] All existing team data migrated
- [ ] Device lock conflicts handled correctly
- [ ] Optimistic locking implemented
- [ ] E2E tests pass with 100% coverage

## Technical Tasks

### Task 1: Update team-verify.js for Device Locks
```bash
# Prompt for AI Assistant:
Update netlify/functions/team-verify.js to use Supabase for device locks:
1. Replace blob storage imports with Supabase client
2. Implement checkDeviceLockConflict() using device_locks table
3. Implement storeDeviceLock() with proper expiration
4. Add automatic cleanup of expired locks (on each check)
5. Maintain existing conflict detection logic
6. Keep the same API response format
7. Add better error messages for lock conflicts
8. Include device fingerprint in audit logs

Ensure the lock mechanism is atomic to prevent race conditions.
```

### Task 2: Deprecate Legacy teamStorage.js
```bash
# Prompt for AI Assistant:
Update the codebase to stop using legacy team storage:
1. Add deprecation warning to netlify/functions/_lib/teamStorage.js
2. Find all imports of teamStorage.js and list them
3. Update each import to use supabaseTeamStorage.js instead
4. Ensure supabaseTeamStorage has all required methods:
   - getTeamCodeMapping()
   - setTeamCodeMapping()
   - getTeamData()
   - setTeamData()
   - createTeam()
   - updateTeamProgress()
5. Verify no functionality is lost in the transition
6. Add compatibility layer if needed for transition period
```

### Task 3: Migrate Team Mappings Data
```bash
# Prompt for AI Assistant:
Create scripts/migrate-team-mappings.js that:
1. Reads all team mappings from blob storage
2. Validates each mapping has required fields
3. Transforms to team_mappings table schema
4. Handles duplicate team codes gracefully
5. Bulk inserts into Supabase (batch size: 50)
6. Creates audit log of migration
7. Verifies all team codes still work
8. Reports any unmapped teams

Include option to migrate specific organization only.
```

### Task 4: Migrate Team Progress Data
```bash
# Prompt for AI Assistant:
Create scripts/migrate-team-progress.js that:
1. Reads all team progress from vail-hunt-state blobs
2. Parses the nested structure (org/team/hunt/progress)
3. Calculates progress statistics for each team
4. Transforms to team_progress table schema
5. Implements version field for optimistic locking
6. Bulk inserts with automatic stat calculation
7. Verifies data integrity after migration
8. Creates leaderboard comparison report

Handle teams with no progress gracefully (create empty record).
```

### Task 5: Implement Optimistic Locking
```bash
# Prompt for AI Assistant:
Add optimistic locking to team progress updates:
1. Update supabaseTeamStorage.js to use version field
2. Increment version on each update
3. Check version match before updates
4. Retry with fresh data on version mismatch (up to 3 times)
5. Return conflict error after max retries
6. Add version to API responses
7. Update clients to handle version conflicts
8. Add metrics for conflict frequency

This prevents lost updates during concurrent modifications.
```

### Task 6: Create Comprehensive E2E Tests
```bash
# Prompt for AI Assistant:
Create tests in tests/e2e/netlify-functions/team-management.test.js:
1. Test team verification with valid/invalid codes
2. Test device lock creation and conflicts
3. Test expired lock cleanup
4. Test concurrent team verifications
5. Test team creation process
6. Test progress updates with optimistic locking
7. Test version conflict resolution
8. Load test: 100 teams verifying simultaneously
9. Test migration data integrity
10. Test backward compatibility during transition

Include tests for edge cases like network failures.
```

### Task 7: Update Team Progress Tracking
```bash
# Prompt for AI Assistant:
Enhance team progress tracking with Supabase features:
1. Use database triggers to calculate statistics
2. Add completed_stops, total_stops, percent_complete fields
3. Update latest_activity on each progress change
4. Create index for efficient leaderboard queries
5. Add team ranking calculation
6. Implement progress snapshots for history
7. Add progress velocity tracking

These calculations happen automatically in the database.
```

## Testing Requirements
- Test all team operations end-to-end
- Verify device locks prevent conflicts
- Test optimistic locking under load
- Validate migration preserves all data
- Performance test with 500+ teams
- Test rollback procedures

## Migration Checklist
- [ ] Backup all team data before migration
- [ ] Migrate team mappings first
- [ ] Migrate team progress second
- [ ] Verify all team codes work
- [ ] Update all function references
- [ ] Test in staging environment
- [ ] Monitor for 24 hours post-migration

## Definition of Done
- [ ] All team functions using Supabase
- [ ] Legacy teamStorage.js deprecated
- [ ] All team data migrated successfully
- [ ] Device locks working correctly
- [ ] Optimistic locking implemented
- [ ] E2E tests passing
- [ ] Performance improved by 20%+
- [ ] Documentation updated
- [ ] Code reviewed and approved

## Performance Targets
- Team verification: < 100ms
- Progress update: < 50ms
- Leaderboard query: < 200ms for 100 teams
- Device lock check: < 30ms

## Rollback Plan
1. Feature flag: `USE_SUPABASE_TEAMS` (default: false)
2. Keep parallel writes to both systems
3. Compare data consistency hourly
4. Switch reads gradually (10%, 50%, 100%)
5. Monitor error rates and performance
6. Quick switch back if issues detected

## Critical Considerations
- Team verification is mission-critical
- Must handle race conditions properly
- Device locks must be bulletproof
- Zero data loss tolerance
- Must work during hunt events (high load)

## Notes
- This is the most critical migration
- Affects core gameplay functionality
- Must be thoroughly tested before deployment
- Consider running parallel for full hunt cycle