# BUG-002-D: Migrate Application State to Supabase

## Summary
Migrate application state management functions (state-get, state-set, state-list, state-delete, state-clear) from Netlify Blob storage to Supabase for persistent state tracking.

## Priority: MEDIUM
**Estimated Time**: 1.5 hours
**Complexity**: MEDIUM
**Impact**: State management operations failing, affecting application persistence

## Prerequisites
- **BUG-002-A**, **BUG-002-B**, and **BUG-002-C** completed
- Supabase connection established and working

## Root Cause
State management functions still depend on blob storage:
- `state-get.js` - MissingBlobsEnvironmentError
- `state-set.js` - MissingBlobsEnvironmentError
- `state-list.js` - MissingBlobsEnvironmentError
- `state-delete.js` - MissingBlobsEnvironmentError
- `state-clear.js` - MissingBlobsEnvironmentError

## Current Status
❌ **Missing**:
- Application state table in Supabase
- SupabaseStateStore service layer
- Migration of all state-* functions

## Implementation Prompt

### Task 1: Create Application State Schema in Supabase
**Prompt**: Create a Supabase table for application state management with proper structure for session and application state tracking.

**Schema Requirements**:
```sql
-- Application state table
CREATE TABLE IF NOT EXISTS application_state (
    state_key TEXT NOT NULL,
    state_value JSONB NOT NULL,
    state_type TEXT DEFAULT 'session', -- 'session', 'persistent', 'cache'
    organization_id TEXT,
    team_id TEXT,
    hunt_id TEXT,
    user_session_id TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,

    PRIMARY KEY (state_key, organization_id, team_id, user_session_id)
);

-- Enable RLS for security
ALTER TABLE application_state ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access on application_state"
ON application_state FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_app_state_org_team ON application_state(organization_id, team_id);
CREATE INDEX IF NOT EXISTS idx_app_state_session ON application_state(user_session_id);
CREATE INDEX IF NOT EXISTS idx_app_state_type ON application_state(state_type);
CREATE INDEX IF NOT EXISTS idx_app_state_expires ON application_state(expires_at);
CREATE INDEX IF NOT EXISTS idx_app_state_updated_at ON application_state(updated_at);

-- Updated timestamp trigger
CREATE TRIGGER update_application_state_updated_at
    BEFORE UPDATE ON application_state
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired state
CREATE OR REPLACE FUNCTION cleanup_expired_state()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM application_state
    WHERE expires_at IS NOT NULL AND expires_at < NOW();

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;
```

**Steps**:
1. Create the SQL file `sql/state-schema.sql`
2. Execute the schema in Supabase
3. Verify the table and functions are created correctly

**Acceptance Criteria**:
- [ ] application_state table exists in Supabase
- [ ] RLS policies configured properly
- [ ] Indexes created for performance
- [ ] Cleanup function for expired state works
- [ ] Updated timestamp trigger working

### Task 2: Create SupabaseStateStore Service Layer
**Prompt**: Create a service layer for state management that provides a clean interface for state operations with expiration support.

**File**: `netlify/functions/_lib/supabaseStateStore.js`

**Required Methods**:
```javascript
class SupabaseStateStore {
  // Get state value by key
  static async get(stateKey, context = {})

  // Set state value with optional expiration
  static async set(stateKey, stateValue, context = {}, ttlSeconds = null)

  // Delete state by key
  static async delete(stateKey, context = {})

  // List all state keys for a context
  static async list(context = {}, stateType = null)

  // Clear all state for a context
  static async clear(context = {}, stateType = null)

  // Check if state exists
  static async exists(stateKey, context = {})

  // Get multiple state values
  static async getMultiple(stateKeys, context = {})

  // Cleanup expired state entries
  static async cleanupExpired()
}
```

**Context Object Structure**:
```javascript
const context = {
  organizationId: 'bhhs',
  teamId: 'berrypicker',
  huntId: 'fall-2025',
  userSessionId: 'session-123',
  stateType: 'session' // 'session', 'persistent', 'cache'
}
```

**Features**:
- Support for different state types (session, persistent, cache)
- TTL/expiration support for temporary state
- Context-based state isolation
- Automatic cleanup of expired entries
- Proper error handling and logging

**Acceptance Criteria**:
- [ ] SupabaseStateStore class implemented
- [ ] All required methods functional
- [ ] Supports context-based isolation
- [ ] TTL/expiration support working
- [ ] Cleanup mechanism functional
- [ ] CommonJS exports format

### Task 3: Migrate state-get.js to Supabase
**Prompt**: Update the `state-get.js` function to use SupabaseStateStore instead of blob storage.

**Current Function**: `netlify/functions/state-get.js`
**Target**: Use SupabaseStateStore.get()

**Steps**:
1. Read the current state-get.js implementation
2. Replace blob storage calls with SupabaseStateStore.get()
3. Extract context from query parameters or headers
4. Maintain existing API format
5. Add proper error handling

**Expected API**:
```
GET /state-get?key=state-key&orgId=bhhs&teamId=team1&sessionId=session-123
Response: {
  "key": "state-key",
  "value": { "data": "state-data" },
  "type": "session",
  "context": {
    "organizationId": "bhhs",
    "teamId": "team1",
    "sessionId": "session-123"
  },
  "retrieved_at": "2025-09-23T23:25:00.000Z"
}
```

**Acceptance Criteria**:
- [ ] Function uses SupabaseStateStore.get()
- [ ] Supports context parameters
- [ ] Returns proper JSON response format
- [ ] Handles missing state gracefully (404)
- [ ] No blob storage dependencies

### Task 4: Migrate state-set.js to Supabase
**Prompt**: Update the `state-set.js` function to use SupabaseStateStore for storing state data.

**Expected API**:
```
POST /state-set
Body: {
  "key": "state-key",
  "value": { "data": "state-data" },
  "context": {
    "organizationId": "bhhs",
    "teamId": "team1",
    "sessionId": "session-123"
  },
  "type": "session",
  "ttlSeconds": 3600
}
```

**Acceptance Criteria**:
- [ ] Function uses SupabaseStateStore.set()
- [ ] Supports TTL/expiration
- [ ] Validates input data properly
- [ ] Returns proper JSON response format

### Task 5: Migrate state-list.js to Supabase
**Prompt**: Update the `state-list.js` function to use SupabaseStateStore for listing state keys.

**Expected API**:
```
GET /state-list?orgId=bhhs&teamId=team1&type=session
Response: {
  "keys": ["key1", "key2", "key3"],
  "count": 3,
  "context": { "organizationId": "bhhs", "teamId": "team1" },
  "type": "session"
}
```

**Acceptance Criteria**:
- [ ] Function uses SupabaseStateStore.list()
- [ ] Supports filtering by context and type
- [ ] Returns proper JSON response format

### Task 6: Migrate state-delete.js to Supabase
**Prompt**: Update the `state-delete.js` function to use SupabaseStateStore for deleting state entries.

**Expected API**:
```
DELETE /state-delete?key=state-key&orgId=bhhs&teamId=team1
Response: {
  "success": true,
  "key": "state-key",
  "deleted_at": "2025-09-23T23:25:00.000Z"
}
```

**Acceptance Criteria**:
- [ ] Function uses SupabaseStateStore.delete()
- [ ] Supports context-based deletion
- [ ] Returns proper JSON response format

### Task 7: Migrate state-clear.js to Supabase
**Prompt**: Update the `state-clear.js` function to use SupabaseStateStore for clearing state data.

**Expected API**:
```
POST /state-clear
Body: {
  "context": {
    "organizationId": "bhhs",
    "teamId": "team1"
  },
  "type": "session"
}
Response: {
  "success": true,
  "cleared_count": 5,
  "context": { "organizationId": "bhhs", "teamId": "team1" },
  "cleared_at": "2025-09-23T23:25:00.000Z"
}
```

**Acceptance Criteria**:
- [ ] Function uses SupabaseStateStore.clear()
- [ ] Supports context and type filtering
- [ ] Returns count of cleared entries

### Task 8: Test Complete State Management
**Prompt**: Test the complete state management system to ensure end-to-end functionality.

**Test Sequence**:
```bash
# 1. Set session state
curl -X POST "http://localhost:8888/.netlify/functions/state-set" \
  -H "Content-Type: application/json" \
  -d '{"key": "user-preferences", "value": {"theme": "dark"}, "context": {"organizationId": "bhhs", "teamId": "team1", "sessionId": "sess-123"}, "type": "session"}'

# 2. Get session state
curl "http://localhost:8888/.netlify/functions/state-get?key=user-preferences&orgId=bhhs&teamId=team1&sessionId=sess-123"

# 3. List state keys
curl "http://localhost:8888/.netlify/functions/state-list?orgId=bhhs&teamId=team1&type=session"

# 4. Delete specific state
curl -X DELETE "http://localhost:8888/.netlify/functions/state-delete?key=user-preferences&orgId=bhhs&teamId=team1&sessionId=sess-123"

# 5. Clear all session state
curl -X POST "http://localhost:8888/.netlify/functions/state-clear" \
  -H "Content-Type: application/json" \
  -d '{"context": {"organizationId": "bhhs", "teamId": "team1"}, "type": "session"}'
```

**Acceptance Criteria**:
- [ ] All state operations return 200 status codes
- [ ] State can be stored and retrieved with context isolation
- [ ] List operations work with filtering
- [ ] Delete and clear operations work properly
- [ ] E2E tests show improvement in state operations

## Expected Outcome
- ✅ Application state table created in Supabase
- ✅ SupabaseStateStore service layer functional
- ✅ All state-* functions migrated to Supabase
- ✅ Context-based state isolation working
- ✅ TTL/expiration support functional
- ✅ No more MissingBlobsEnvironmentError for state operations

## Verification Checklist
- [ ] State schema deployed to Supabase
- [ ] SupabaseStateStore service implemented
- [ ] All 5 state functions migrated and tested
- [ ] Context isolation works correctly
- [ ] TTL/expiration support functional
- [ ] E2E tests show state operation improvements

## Next Steps
After completion, proceed to **BUG-002-E** to migrate leaderboard functionality.