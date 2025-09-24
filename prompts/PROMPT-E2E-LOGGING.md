# 🧪 E2E Test Failure Logging System

## Quick Command

```bash
npm run test:e2e:log
```

This will run all E2E tests and generate comprehensive failure logs with debugging information.

## What It Does

The E2E logging system provides detailed analysis of test failures, including:

### 📝 **Detailed Log File** (`logs/e2e-failures-TIMESTAMP.log`)
- Complete test execution summary (pass/fail counts, duration)
- **Individual failure analysis** for each failed test
- **Ready-to-run curl commands** for manual testing
- **Possible causes** for each failure type
- **Specific debugging recommendations**

### 📊 **JSON Summary** (`logs/e2e-summary-TIMESTAMP.json`)
- Machine-readable test results
- Structured failure data for CI/CD integration
- Test execution metadata

## Sample Output

### Terminal Summary
```
🧪 E2E Test Runner with Detailed Failure Logging
============================================================
📍 Base URL: http://localhost:8888
📝 Log File: logs/e2e-failures-2025-09-23T22-04-35-966Z.log
📊 Summary: logs/e2e-summary-2025-09-23T22-04-35-966Z.json
============================================================

[Test execution output...]

============================================================
📊 TEST EXECUTION COMPLETE
============================================================
Duration: 8562ms
Exit Code: 1
Failures Detected: 3

❌ QUICK FAILURE SUMMARY:
  1. POST team-verify: expected 401 to be 200
  2. POST progress-set: expected 400 to be 200
  3. GET kv-get: expected 404 to be 200

🔧 DEBUGGING COMMANDS:
  View detailed log: cat "logs/e2e-failures-2025-09-23T22-04-35-966Z.log"
  Test health endpoint: curl "http://localhost:8888/.netlify/functions/health"
  Test team verification: curl -X POST "http://localhost:8888/.netlify/functions/team-verify" -H "Content-Type: application/json" -d '{"code":"ALPHA01","deviceHint":"test"}'
```

### Detailed Log Content

```
E2E TEST FAILURE ANALYSIS
============================================================
Timestamp: 2025-09-23T22:04:35.966Z
Base URL: http://localhost:8888
Total Tests: 44
Passed: 31
Failed: 13
Duration: 8562ms
Exit Code: 1

DETAILED FAILURE ANALYSIS (3 failures)
============================================================

FAILURE #1
----------------------------------------
Test: POST /team-verify should validate team codes
File: netlify-functions.test.js
Suite: Netlify Functions E2E Tests > Team Verification
Endpoint: POST /.netlify/functions/team-verify
Function: team-verify
Error: expected 401 to be 200
Expected Status: 200
Actual Status: 401

MANUAL TEST COMMAND:
curl -s "http://localhost:8888/.netlify/functions/team-verify" -X POST -H "Content-Type: application/json" -d '{"code":"ALPHA01","deviceHint":"test-device"}'

POSSIBLE CAUSES:
  • Team code not found in expected storage system
  • Authentication failure - RLS blocking access
  • Storage bridge not working properly

RECOMMENDATIONS:
  • Test manually with curl command above
  • Verify team codes exist in Supabase team_codes table
  • Check if SupabaseTeamStorage bridge is working
  • Review function logs for detailed error messages

============================================================
```

## Key Features

### 🎯 **Smart Error Analysis**
- **Status code interpretation**: 401 (auth), 404 (not found), 500 (server error), 400 (bad request)
- **Context-aware suggestions**: Different recommendations for different endpoints
- **Storage system awareness**: Recognizes blob storage vs Supabase issues

### 🔧 **Ready-to-Use Debug Commands**
- **Curl commands**: Pre-formatted with correct headers and sample data
- **Health checks**: System status verification commands
- **Manual tests**: Step-by-step debugging workflows

### 📊 **Comprehensive Coverage**
- **All test failures**: Captures every failed assertion
- **Performance data**: Test execution times and durations
- **Environment info**: Base URL, timestamps, configuration

## Common Failure Patterns & Solutions

### 🔐 **401 Unauthorized**
**Quick Fix:**
```bash
# Test team verification
curl -X POST "http://localhost:8888/.netlify/functions/team-verify" \
  -H "Content-Type: application/json" \
  -d '{"code":"ALPHA01","deviceHint":"test"}'

# Verify data migration
npm run migrate:data
```

### 🔍 **404 Not Found**
**Quick Fix:**
```bash
# Check function health
curl "http://localhost:8888/.netlify/functions/health"

# List available functions
ls netlify/functions/
```

### ⚠️ **500 Internal Server Error**
**Quick Fix:**
```bash
# Check environment variables
echo $VITE_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Review Netlify dev console logs
```

### 🚫 **400 Bad Request**
**Quick Fix:**
```bash
# Test with Supabase functions instead
curl "http://localhost:8888/.netlify/functions/progress-get-supabase/bhhs/berrypicker/fall-2025"
```

## Usage Examples

### Development Workflow
```bash
# 1. Make code changes
# 2. Run tests with logging
npm run test:e2e:log

# 3. Review failures
cat logs/e2e-failures-*.log

# 4. Test manually
curl -X POST "http://localhost:8888/.netlify/functions/team-verify" \
  -H "Content-Type: application/json" \
  -d '{"code":"ALPHA01","deviceHint":"debug"}'

# 5. Fix issues and re-test
npm run test:e2e:log
```

### CI/CD Integration
```yaml
- name: Run E2E Tests with Logging
  run: npm run test:e2e:log
  continue-on-error: true

- name: Upload Test Logs
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: e2e-test-logs
    path: logs/
```

## Files Created

### Core System
- `scripts/run-e2e-with-logging.js` - Main logging system
- `docs/e2e-test-logging.md` - Comprehensive documentation

### Sample Outputs
- `logs/sample-e2e-failure-log.txt` - Example detailed log
- `logs/sample-e2e-summary.json` - Example JSON summary

### Package Scripts
- `npm run test:e2e:log` - Run tests with logging
- `npm run test:e2e` - Standard E2E tests
- `npm run test:e2e:watch` - Watch mode

## Benefits

### 🚀 **Faster Debugging**
- **Immediate curl commands**: No need to construct test requests manually
- **Context-aware suggestions**: Targeted recommendations for each failure
- **Pattern recognition**: Common issues identified automatically

### 📈 **Better Visibility**
- **Complete failure context**: Test name, file, suite, endpoint, error
- **Historical tracking**: Timestamped logs for trend analysis
- **Machine-readable data**: JSON output for automation

### 🎯 **Actionable Insights**
- **Root cause analysis**: Possible causes listed for each failure
- **Step-by-step fixes**: Specific recommendations for each issue
- **Health check commands**: System validation workflows

## Next Steps

1. **Run the system**: `npm run test:e2e:log`
2. **Review generated logs**: Check `logs/` directory
3. **Test manually**: Use provided curl commands
4. **Fix issues**: Follow specific recommendations
5. **Re-test**: Verify fixes with another run

The system is designed to make E2E test failure debugging fast, comprehensive, and actionable! 🎉