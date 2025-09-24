# E2E Test Failure Logging System

This system provides comprehensive failure analysis for end-to-end tests, generating detailed logs with debugging information for each failed test.

## Quick Start

### Run E2E Tests with Detailed Logging
```bash
npm run test:e2e:log
```

This command will:
1. Execute the full E2E test suite
2. Capture all test failures with detailed information
3. Generate comprehensive log files with debugging commands
4. Provide immediate terminal output with failure summary

### Alternative Commands
```bash
# Standard E2E tests (basic output)
npm run test:e2e

# E2E tests in watch mode
npm run test:e2e:watch

# Run specific test file with logging
TEST_BASE_URL=http://localhost:8888 node scripts/run-e2e-with-logging.js
```

## Output Files

The logging system generates two files in the `logs/` directory:

### 1. Detailed Log File
**Location**: `logs/e2e-failures-YYYY-MM-DDTHH-MM-SS-000Z.log`

**Contents**:
- Test execution summary (pass/fail counts, duration)
- Detailed failure analysis for each failed test
- Manual testing commands (curl commands)
- Possible causes for each failure
- Debugging recommendations

### 2. JSON Summary File
**Location**: `logs/e2e-summary-YYYY-MM-DDTHH-MM-SS-000Z.json`

**Contents**:
- Structured test results data
- Machine-readable failure information
- Test execution metadata
- Suitable for CI/CD integration

## Example Output

### Terminal Output
```
🧪 E2E Test Runner with Detailed Failure Logging
============================================================
📍 Base URL: http://localhost:8888
📝 Log File: logs/e2e-failures-2025-09-23T21-30-15-000Z.log
📊 Summary: logs/e2e-summary-2025-09-23T21-30-15-000Z.json
============================================================

🚀 Starting E2E test execution...

[Test output...]

============================================================
📊 TEST EXECUTION COMPLETE
============================================================
Duration: 8562ms
Exit Code: 1
Failures Detected: 3

📝 REPORTS GENERATED:
  Detailed Log: logs/e2e-failures-2025-09-23T21-30-15-000Z.log
  JSON Summary: logs/e2e-summary-2025-09-23T21-30-15-000Z.json

❌ QUICK FAILURE SUMMARY:
  1. POST team-verify: expected 401 to be 200
  2. GET kv-get: expected 404 to be 200
  3. POST progress-set: expected 400 to be 200

🔧 DEBUGGING COMMANDS:
  View detailed log: cat "logs/e2e-failures-2025-09-23T21-30-15-000Z.log"
  Test health endpoint: curl "http://localhost:8888/.netlify/functions/health"
  Test team verification: curl -X POST "http://localhost:8888/.netlify/functions/team-verify" -H "Content-Type: application/json" -d '{"code":"ALPHA01","deviceHint":"test"}'
```

### Detailed Log File Sample
```
E2E TEST FAILURE ANALYSIS
============================================================
Timestamp: 2025-09-23T21:30:15.000Z
Base URL: http://localhost:8888
Total Tests: 34
Passed: 31
Failed: 3
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
  • Authentication failure - token missing or invalid
  • RLS (Row Level Security) blocking access
  • Team code not found in expected storage system

RECOMMENDATIONS:
  • Test manually: curl -s "http://localhost:8888/.netlify/functions/team-verify" -X POST -H "Content-Type: application/json" -d '{"code":"ALPHA01","deviceHint":"test-device"}'
  • Check function logs in Netlify dev console
  • Verify environment variables are loaded
  • Verify team codes exist in Supabase team_codes table
  • Check if SupabaseTeamStorage bridge is working

============================================================
```

## Understanding the Analysis

### Test Information
- **Test**: The specific test case that failed
- **File**: The test file containing the failure
- **Suite**: The test suite hierarchy
- **Endpoint**: The API endpoint being tested
- **Function**: The Netlify function name
- **Error**: The specific assertion that failed

### Status Code Analysis
- **Expected Status**: What the test expected (e.g., 200)
- **Actual Status**: What was actually returned (e.g., 401, 404, 500)

### Debugging Information
- **Manual Test Commands**: Ready-to-run curl commands for testing
- **Possible Causes**: Likely reasons for the failure
- **Recommendations**: Specific steps to debug and fix the issue

## Common Failure Patterns

### 401 Unauthorized
**Possible Causes**:
- Authentication token missing or invalid
- RLS (Row Level Security) blocking access
- Team code not found in storage system

**Quick Debug**:
```bash
# Test team verification
curl -X POST "http://localhost:8888/.netlify/functions/team-verify" \
  -H "Content-Type: application/json" \
  -d '{"code":"ALPHA01","deviceHint":"test"}'

# Check if team codes exist in Supabase
npm run migrate:data
```

### 404 Not Found
**Possible Causes**:
- Function not found or not loaded
- Incorrect endpoint path
- Function file missing or not deployed

**Quick Debug**:
```bash
# Check function health
curl "http://localhost:8888/.netlify/functions/health"

# List available functions
ls netlify/functions/
```

### 500 Internal Server Error
**Possible Causes**:
- Internal server error in function code
- Database connection issues
- Missing environment variables

**Quick Debug**:
```bash
# Check environment variables
echo $VITE_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Check Netlify dev logs
# (Review console output from `npm run start:netlify`)
```

### 400 Bad Request
**Possible Causes**:
- Invalid request data or missing parameters
- Request validation failure
- Incorrect data format

**Quick Debug**:
```bash
# Test with minimal valid data
curl -X POST "http://localhost:8888/.netlify/functions/progress-set-supabase" \
  -H "Content-Type: application/json" \
  -d '{"orgId":"bhhs","teamId":"berrypicker","huntId":"fall-2025","progress":{}}'
```

## Integration with CI/CD

### GitHub Actions Example
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

### Parsing JSON Results
```javascript
import { readFileSync } from 'fs'

const summary = JSON.parse(readFileSync('logs/e2e-summary-latest.json'))
console.log(`Tests: ${summary.passedTests}/${summary.totalTests} passed`)

if (summary.failures.length > 0) {
  console.log('Failed endpoints:')
  summary.failures.forEach(failure => {
    console.log(`  ${failure.method} ${failure.endpoint}: ${failure.error}`)
  })
}
```

## Customization

### Environment Variables
- `TEST_BASE_URL`: Override the base URL for testing (default: http://localhost:8888)

### Custom Test Data
The script includes sample data for different endpoints. You can modify the `getSamplePostData()` function in the script to customize test payloads.

### Log Location
Logs are written to the `logs/` directory by default. This can be changed by modifying the `LOG_DIR` constant in the script.

## Troubleshooting

### Script Execution Issues
```bash
# Make script executable (Unix/Linux/macOS)
chmod +x scripts/run-e2e-with-logging.js

# Run directly with Node
node scripts/run-e2e-with-logging.js
```

### Missing Logs Directory
The script automatically creates the `logs/` directory if it doesn't exist.

### Large Log Files
Log files include detailed information and can become large with many failures. Consider implementing log rotation or cleanup for production use.

## Best Practices

1. **Run Before Commits**: Use `npm run test:e2e:log` before committing changes
2. **Review Patterns**: Look for common failure patterns across multiple tests
3. **Manual Verification**: Use the provided curl commands to verify fixes
4. **Environment Checks**: Always check the health endpoint first
5. **Progressive Fixing**: Fix authentication issues (401) before addressing other failures