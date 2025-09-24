# BUG-002-C: Migrate Settings Management to Supabase

## Summary
Migrate application settings management from Netlify Blob storage to Supabase, creating a proper settings table and service layer for configuration management.

## Priority: HIGH
**Estimated Time**: 1 hour
**Complexity**: MEDIUM
**Impact**: Settings operations failing, blocking admin functionality

## Prerequisites
- **BUG-002-A** and **BUG-002-B** completed
- Supabase connection established and working

## Root Cause
Settings functions still depend on blob storage:
- `settings-get.js` - "Error fetching settings: MissingBlobsEnvironmentError"
- `settings-set.js` - 400/500 errors in E2E tests

## Current Status
❌ **Missing**:
- Settings table in Supabase
- SupabaseSettingsStore service layer
- Migration of settings-get.js and settings-set.js

## Implementation Prompt

### Task 1: Create Settings Schema in Supabase
**Prompt**: Create a Supabase table for application settings with proper structure for multi-tenant configuration management.

**Schema Requirements**:
```sql
-- Application settings table
CREATE TABLE IF NOT EXISTS application_settings (
    setting_key TEXT NOT NULL,
    setting_value JSONB NOT NULL,
    organization_id TEXT,
    scope TEXT DEFAULT 'global', -- 'global', 'organization', 'hunt'
    hunt_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,

    PRIMARY KEY (setting_key, organization_id, hunt_id)
);

-- Enable RLS for multi-tenancy
ALTER TABLE application_settings ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access on application_settings"
ON application_settings FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_app_settings_org_id ON application_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_app_settings_scope ON application_settings(scope);
CREATE INDEX IF NOT EXISTS idx_app_settings_updated_at ON application_settings(updated_at);

-- Updated timestamp trigger
CREATE TRIGGER update_application_settings_updated_at
    BEFORE UPDATE ON application_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

**Steps**:
1. Create the SQL file `sql/settings-schema.sql`
2. Execute the schema in Supabase (manually via dashboard or script)
3. Verify the table is created correctly

**Acceptance Criteria**:
- [ ] application_settings table exists in Supabase
- [ ] RLS policies configured properly
- [ ] Indexes created for performance
- [ ] Updated timestamp trigger working

### Task 2: Create SupabaseSettingsStore Service Layer
**Prompt**: Create a service layer for settings management that provides a clean interface for settings operations.

**File**: `netlify/functions/_lib/supabaseSettingsStore.js`

**Required Methods**:
```javascript
class SupabaseSettingsStore {
  // Get a setting value by key
  static async get(settingKey, orgId = null, huntId = null)

  // Set a setting value
  static async set(settingKey, settingValue, orgId = null, huntId = null, scope = 'global')

  // Delete a setting
  static async delete(settingKey, orgId = null, huntId = null)

  // List all settings for a scope
  static async list(scope = 'global', orgId = null, huntId = null)

  // Get multiple settings by keys
  static async getMultiple(settingKeys, orgId = null, huntId = null)

  // Clear all settings for a scope
  static async clear(scope, orgId = null, huntId = null)
}
```

**Features**:
- Support for global, organization, and hunt-specific settings
- Hierarchical settings resolution (hunt > org > global)
- Proper error handling and logging
- CommonJS exports for compatibility

**Acceptance Criteria**:
- [ ] SupabaseSettingsStore class implemented
- [ ] All required methods functional
- [ ] Supports multi-tenant scoping
- [ ] Proper error handling and logging
- [ ] CommonJS exports format

### Task 3: Migrate settings-get.js to Supabase
**Prompt**: Update the `settings-get.js` function to use SupabaseSettingsStore instead of blob storage.

**Current Function**: `netlify/functions/settings-get.js`
**Target**: Use SupabaseSettingsStore methods

**Steps**:
1. Read the current settings-get.js implementation
2. Replace blob storage calls with SupabaseSettingsStore.get()
3. Support query parameters for orgId and huntId
4. Maintain existing API format
5. Add proper error handling

**Expected API**:
```
GET /settings-get?key=setting-key&orgId=org1&huntId=hunt1
Response: {
  "key": "setting-key",
  "value": { "config": "data" },
  "scope": "hunt",
  "retrieved_at": "2025-09-23T23:20:00.000Z"
}
```

**Acceptance Criteria**:
- [ ] Function uses SupabaseSettingsStore.get()
- [ ] Supports orgId and huntId parameters
- [ ] Returns proper JSON response format
- [ ] Handles missing settings gracefully (404)
- [ ] No blob storage dependencies

### Task 4: Migrate settings-set.js to Supabase
**Prompt**: Update the `settings-set.js` function to use SupabaseSettingsStore for setting configuration values.

**Current Function**: `netlify/functions/settings-set.js`
**Target**: Use SupabaseSettingsStore.set()

**Steps**:
1. Read the current settings-set.js implementation
2. Replace blob storage calls with SupabaseSettingsStore.set()
3. Support POST body with key, value, and scope parameters
4. Add validation for setting data
5. Maintain existing API format

**Expected API**:
```
POST /settings-set
Body: {
  "key": "setting-key",
  "value": { "config": "data" },
  "orgId": "org1",
  "huntId": "hunt1",
  "scope": "hunt"
}
Response: {
  "success": true,
  "key": "setting-key",
  "scope": "hunt",
  "stored_at": "2025-09-23T23:20:00.000Z"
}
```

**Acceptance Criteria**:
- [ ] Function uses SupabaseSettingsStore.set()
- [ ] Supports scoping (global, organization, hunt)
- [ ] Validates input data properly
- [ ] Returns proper JSON response format
- [ ] No blob storage dependencies

### Task 5: Test Settings Functionality
**Prompt**: Test the complete settings management system to ensure end-to-end functionality.

**Test Sequence**:
```bash
# 1. Set a global setting
curl -X POST "http://localhost:8888/.netlify/functions/settings-set" \
  -H "Content-Type: application/json" \
  -d '{"key": "global-config", "value": {"theme": "dark"}, "scope": "global"}'

# 2. Get the global setting
curl "http://localhost:8888/.netlify/functions/settings-get?key=global-config"

# 3. Set an organization setting
curl -X POST "http://localhost:8888/.netlify/functions/settings-set" \
  -H "Content-Type: application/json" \
  -d '{"key": "org-config", "value": {"name": "BHHS"}, "orgId": "bhhs", "scope": "organization"}'

# 4. Get the organization setting
curl "http://localhost:8888/.netlify/functions/settings-get?key=org-config&orgId=bhhs"

# 5. Set a hunt-specific setting
curl -X POST "http://localhost:8888/.netlify/functions/settings-set" \
  -H "Content-Type: application/json" \
  -d '{"key": "hunt-config", "value": {"active": true}, "orgId": "bhhs", "huntId": "fall-2025", "scope": "hunt"}'

# 6. Get the hunt setting
curl "http://localhost:8888/.netlify/functions/settings-get?key=hunt-config&orgId=bhhs&huntId=fall-2025"
```

**Acceptance Criteria**:
- [ ] All settings operations return 200 status codes
- [ ] Settings can be stored and retrieved at different scopes
- [ ] Hierarchical resolution works properly
- [ ] Error cases handled (404 for missing settings)
- [ ] E2E tests show improvement in settings operations

## Expected Outcome
- ✅ Settings table created in Supabase
- ✅ SupabaseSettingsStore service layer functional
- ✅ settings-get.js and settings-set.js migrated
- ✅ Settings operations work end-to-end
- ✅ No more "Error fetching settings" in logs

## Verification Checklist
- [ ] Settings schema deployed to Supabase
- [ ] SupabaseSettingsStore service implemented
- [ ] settings-get.js migrated and tested
- [ ] settings-set.js migrated and tested
- [ ] Multi-tenant scoping works correctly
- [ ] E2E tests show settings improvements

## Next Steps
After completion, proceed to **BUG-002-D** to migrate application state to Supabase.