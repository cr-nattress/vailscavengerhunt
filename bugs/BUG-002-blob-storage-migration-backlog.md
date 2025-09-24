# BUG-002: Complete Blob Storage to Supabase Migration

## Summary
Complete the migration from Netlify Blob storage to Supabase for all remaining functions that still depend on blob storage, achieving 100% E2E test success rate.

## Status
- **Priority**: HIGH
- **Complexity**: MEDIUM
- **Estimated Effort**: 4-6 hours
- **Current E2E Success Rate**: ~85-90% (38-40/44 tests)
- **Target Success Rate**: 100% (44/44 tests)

## Root Cause Analysis

### Successfully Migrated ✅
- **Team verification** (SupabaseTeamStorage bridge)
- **Progress tracking** (progress-get-supabase, progress-set-supabase)
- **Core authentication flow**

### Still Require Migration ❌

#### Category 1: KV Store Operations (CRITICAL)
Functions exist but have syntax/loading issues:
- `kv-get.js` - CommonJS export errors
- `kv-set.js` - CommonJS export errors
- `kv-get-supabase.js` - Function loading issues
- `kv-set-supabase.js` - Function loading issues
- `kv-list.js` - Still uses blob storage
- `kv-upsert.js` - Still uses blob storage

#### Category 2: Settings Management (HIGH)
- `settings-get.js` - Still uses blob storage
- `settings-set.js` - Still uses blob storage

#### Category 3: Application State (MEDIUM)
- `state-get.js` - Still uses blob storage
- `state-set.js` - Still uses blob storage
- `state-list.js` - Still uses blob storage
- `state-delete.js` - Still uses blob storage
- `state-clear.js` - Still uses blob storage

#### Category 4: Analytics/Reporting (MEDIUM)
- `leaderboard-get.js` - Still uses blob storage

#### Category 5: Syntax Fixes (CRITICAL)
- `supabaseTeamStorage.js:269` - Syntax error blocking function loads

## Error Patterns

### Current Errors from Logs:
1. **Function Loading**: `lambdaFunc[lambdaHandler] is not a function`
2. **Blob Storage**: `MissingBlobsEnvironmentError: The environment has not been configured to use Netlify Blobs`
3. **Build Errors**: `Expected ";" but found "async"`
4. **Response Codes**: 404 (not found), 500 (internal errors)

## Migration Strategy

### Phase 1: Fix Critical Syntax Issues (30 min)
- Fix `supabaseTeamStorage.js:269` syntax error
- Fix KV function CommonJS exports
- Ensure all functions can load properly

### Phase 2: Complete KV Store Migration (2 hours)
- Fix `kv-list.js` and `kv-upsert.js` to use SupabaseKVStore
- Ensure all KV operations work with Supabase backend
- Test KV functionality end-to-end

### Phase 3: Settings Management Migration (1 hour)
- Create settings table in Supabase
- Implement SupabaseSettingsStore service
- Migrate settings-get.js and settings-set.js

### Phase 4: Application State Migration (1.5 hours)
- Create app_state table in Supabase
- Implement SupabaseStateStore service
- Migrate all state-* functions

### Phase 5: Leaderboard Migration (1 hour)
- Implement leaderboard queries using existing Supabase data
- Update leaderboard-get.js to use hunt_progress table

## Success Criteria
- ✅ All 44 E2E tests passing (100% success rate)
- ✅ No blob storage dependencies in any function
- ✅ All functions load without errors
- ✅ Health endpoint reports no warnings
- ✅ Zero `MissingBlobsEnvironmentError` in logs

## Impact Assessment
- **Business Impact**: HIGH - Blocks production deployment
- **User Experience**: HIGH - Core functionality fails
- **Development Velocity**: HIGH - Blocks future feature development
- **Technical Debt**: CRITICAL - Architectural migration incomplete

## Sub-Tasks

This bug should be broken down into the following incremental tasks:

1. **BUG-002-A**: Fix Critical Function Loading Issues
2. **BUG-002-B**: Complete KV Store Supabase Migration
3. **BUG-002-C**: Migrate Settings Management to Supabase
4. **BUG-002-D**: Migrate Application State to Supabase
5. **BUG-002-E**: Migrate Leaderboard to Supabase Queries

Each sub-task includes detailed implementation prompts and acceptance criteria.