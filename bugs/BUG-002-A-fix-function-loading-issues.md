# BUG-002-A: Fix Critical Function Loading Issues

## Summary
Fix critical syntax errors and CommonJS export issues preventing functions from loading properly, causing 500 errors and blocking E2E tests.

## Priority: CRITICAL
**Estimated Time**: 30 minutes
**Complexity**: LOW
**Impact**: Blocks all KV operations and some team functions

## Root Cause
1. **Syntax Error**: `supabaseTeamStorage.js:269` - `Expected ";" but found "async"`
2. **Export Issues**: `lambdaFunc[lambdaHandler] is not a function` for KV functions
3. **Function Loading**: Progress-set and team-verify fail to load due to supabaseTeamStorage syntax

## Current Errors
```
⬥ Failed to load function progress-set: Build failed with 1 error:
netlify/functions/_lib/supabaseTeamStorage.js:269:9: ERROR: Expected ";" but found "async"

⬥ Function kv-set has returned an error: lambdaFunc[lambdaHandler] is not a function
⬥ Function kv-set-supabase has returned an error: lambdaFunc[lambdaHandler] is not a function
```

## Implementation Prompt

### Task 1: Fix SupabaseTeamStorage Syntax Error
**Prompt**: Examine the file `netlify/functions/_lib/supabaseTeamStorage.js` around line 269 and fix the syntax error causing "Expected ';' but found 'async'". The issue is likely related to a missing closing brace or incorrect method placement within the class definition.

**Steps**:
1. Read the file around lines 260-280
2. Identify the syntax issue (likely missing `}` or incorrect method placement)
3. Fix the syntax while preserving all method functionality
4. Ensure the class structure is correct

**Acceptance Criteria**:
- [ ] No syntax errors in supabaseTeamStorage.js
- [ ] progress-set and team-verify functions load successfully
- [ ] All class methods remain functional

### Task 2: Fix KV Function CommonJS Exports
**Prompt**: The KV functions `kv-get.js`, `kv-set.js`, `kv-get-supabase.js`, and `kv-set-supabase.js` are causing "lambdaFunc[lambdaHandler] is not a function" errors. Ensure all functions use proper CommonJS `exports.handler = async (event, context) => {}` format.

**Steps**:
1. Verify each function uses `exports.handler` not `export const handler`
2. Ensure imports use `require()` not `import`
3. Check that no ES module syntax remains
4. Test that functions can be invoked properly

**Acceptance Criteria**:
- [ ] All KV functions use proper CommonJS exports
- [ ] Functions load without "lambdaFunc[lambdaHandler]" errors
- [ ] KV functions return appropriate responses (even if 500 due to Supabase connection)

### Task 3: Verify Function Loading
**Prompt**: After fixing the syntax issues, verify that all functions load properly by checking the Netlify dev console and testing with curl requests.

**Test Commands**:
```bash
# Test KV functions load (may return 500 but shouldn't return "not a function")
curl -X POST "http://localhost:8888/.netlify/functions/kv-set" -H "Content-Type: application/json" -d '{"key": "test", "value": "test"}'

# Test team-verify loads properly
curl -X POST "http://localhost:8888/.netlify/functions/team-verify" -H "Content-Type: application/json" -d '{"code": "ALPHA01", "deviceHint": "test"}'

# Check health endpoint for function loading status
curl "http://localhost:8888/.netlify/functions/health"
```

**Acceptance Criteria**:
- [ ] No "Failed to load function" errors in Netlify logs
- [ ] No "lambdaFunc[lambdaHandler] is not a function" errors
- [ ] Functions return proper HTTP responses (not loading errors)
- [ ] Health endpoint shows improved status

## Expected Outcome
- ✅ All functions load without syntax errors
- ✅ CommonJS exports work properly
- ✅ Function invocation errors resolved
- ✅ Foundation ready for completing KV migration

## Next Steps
After completion, proceed to **BUG-002-B** to complete the KV store migration to Supabase.