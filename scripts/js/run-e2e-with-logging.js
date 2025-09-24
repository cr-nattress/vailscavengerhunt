#!/usr/bin/env node
/**
 * E2E Test Runner with Detailed Failure Logging
 * Runs the E2E test suite and generates comprehensive failure logs
 */

import { spawn } from 'child_process'
import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Configuration
const LOG_DIR = join(__dirname, '..', 'logs')
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-')
const LOG_FILE = join(LOG_DIR, `e2e-failures-${TIMESTAMP}.log`)
const SUMMARY_FILE = join(LOG_DIR, `e2e-summary-${TIMESTAMP}.json`)

// Test configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8888'
const VITEST_CONFIG = 'tests/e2e/test-runner.js'

// Ensure logs directory exists
if (!existsSync(LOG_DIR)) {
  mkdirSync(LOG_DIR, { recursive: true })
}

console.log('🧪 E2E Test Runner with Detailed Failure Logging')
console.log('=' .repeat(60))
console.log(`📍 Base URL: ${BASE_URL}`)
console.log(`📝 Log File: ${LOG_FILE}`)
console.log(`📊 Summary: ${SUMMARY_FILE}`)
console.log('=' .repeat(60))

// Test failure tracking
const failures = []
const testSummary = {
  timestamp: new Date().toISOString(),
  baseUrl: BASE_URL,
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  duration: 0,
  failures: [],
  testFiles: []
}

/**
 * Parse test output to extract failure details
 */
function parseTestFailure(line) {
  const patterns = {
    // Test name pattern: " × e2e tests/e2e/file.test.js > Test Suite > Test Name"
    testName: /^\s*×.*?tests\/e2e\/(.+?\.test\.js)\s*>\s*(.+?)\s*>\s*(.+?)\s*(\d+ms)?$/,

    // Error pattern: "   → expected X to be Y"
    error: /^\s*→\s*(.+)$/,

    // Status code pattern: "expected 401 to be 200"
    statusCode: /expected (\d+) to be (\d+)/,

    // Property pattern: "to have property "
    property: /to have property "([^"]+)"/
  }

  for (const [type, pattern] of Object.entries(patterns)) {
    const match = line.match(pattern)
    if (match) {
      return { type, match, line }
    }
  }

  return null
}

/**
 * Extract endpoint information from test name
 */
function extractEndpointInfo(testName) {
  const patterns = {
    method: /(GET|POST|PUT|DELETE|OPTIONS)\s+([^\s]+)/i,
    endpoint: /\/([a-z-]+)(?:\s|$)/i,
    function: /(team-verify|progress-get|kv-set|health|settings|leaderboard)/i
  }

  const info = {
    method: 'UNKNOWN',
    endpoint: 'UNKNOWN',
    function: 'UNKNOWN'
  }

  for (const [key, pattern] of Object.entries(patterns)) {
    const match = testName.match(pattern)
    if (match) {
      if (key === 'method') {
        info.method = match[1].toUpperCase()
        info.endpoint = match[2]
      } else if (key === 'function') {
        info.function = match[1]
      } else {
        info[key] = match[1]
      }
    }
  }

  return info
}

/**
 * Generate detailed failure report
 */
function generateFailureReport(failure) {
  const endpoint = extractEndpointInfo(failure.testName)

  return {
    test: failure.testName,
    file: failure.file,
    suite: failure.suite,
    endpoint: endpoint.endpoint,
    method: endpoint.method,
    function: endpoint.function,
    error: failure.error,
    expectedStatus: failure.expectedStatus,
    actualStatus: failure.actualStatus,
    timestamp: new Date().toISOString(),

    // Generate curl command for manual testing
    curlCommand: generateCurlCommand(endpoint, failure),

    // Debugging information
    debugging: {
      possibleCauses: analyzePossibleCauses(failure, endpoint),
      recommendations: generateRecommendations(failure, endpoint)
    }
  }
}

/**
 * Generate curl command for manual testing
 */
function generateCurlCommand(endpoint, failure) {
  const baseCmd = `curl -s "${BASE_URL}/.netlify/functions/${endpoint.function}"`

  if (endpoint.method === 'POST') {
    const sampleData = getSamplePostData(endpoint.function)
    return `${baseCmd} -X POST -H "Content-Type: application/json" -d '${JSON.stringify(sampleData)}'`
  } else if (endpoint.method === 'GET' && endpoint.function.includes('progress')) {
    return `${baseCmd}/bhhs/berrypicker/fall-2025`
  }

  return baseCmd
}

/**
 * Get sample POST data for different endpoints
 */
function getSamplePostData(functionName) {
  const samples = {
    'team-verify': {
      code: 'ALPHA01',
      deviceHint: 'test-device'
    },
    'progress-set': {
      orgId: 'bhhs',
      teamId: 'berrypicker',
      huntId: 'fall-2025',
      progress: {
        'covered-bridge': {
          done: true,
          completedAt: new Date().toISOString(),
          revealedHints: 1
        }
      }
    },
    'kv-set': {
      key: 'test-key',
      value: { test: 'data' }
    },
    'settings-set': {
      theme: 'dark',
      notifications: true
    }
  }

  return samples[functionName] || {}
}

/**
 * Analyze possible causes of failure
 */
function analyzePossibleCauses(failure, endpoint) {
  const causes = []

  if (failure.actualStatus === 401) {
    causes.push('Authentication failure - token missing or invalid')
    causes.push('RLS (Row Level Security) blocking access')
  }

  if (failure.actualStatus === 404) {
    causes.push('Function not found or not loaded')
    causes.push('Incorrect endpoint path')
  }

  if (failure.actualStatus === 500) {
    causes.push('Internal server error - check function logs')
    causes.push('Database connection issues')
    causes.push('Missing environment variables')
  }

  if (failure.actualStatus === 400) {
    causes.push('Invalid request data or missing parameters')
    causes.push('Request validation failure')
  }

  if (endpoint.function.includes('progress') || endpoint.function.includes('kv')) {
    causes.push('Storage backend not accessible (blob storage vs Supabase)')
  }

  if (endpoint.function === 'team-verify') {
    causes.push('Team code not found in expected storage system')
  }

  return causes
}

/**
 * Generate debugging recommendations
 */
function generateRecommendations(failure, endpoint) {
  const recommendations = []

  recommendations.push(`Test manually: ${generateCurlCommand(endpoint, failure)}`)
  recommendations.push(`Check function logs in Netlify dev console`)
  recommendations.push(`Verify environment variables are loaded`)

  if (endpoint.function === 'team-verify') {
    recommendations.push('Verify team codes exist in Supabase team_codes table')
    recommendations.push('Check if SupabaseTeamStorage bridge is working')
  }

  if (endpoint.function.includes('progress')) {
    recommendations.push('Check if Supabase progress functions are being used')
    recommendations.push('Verify team exists in Supabase teams table')
  }

  if (failure.actualStatus === 500) {
    recommendations.push('Check health endpoint: curl ' + BASE_URL + '/.netlify/functions/health')
    recommendations.push('Review function source code for error handling')
  }

  return recommendations
}

/**
 * Run E2E tests and capture output
 */
function runE2ETests() {
  return new Promise((resolve, reject) => {
    console.log('🚀 Starting E2E test execution...\n')

    const startTime = Date.now()
    const testProcess = spawn('npm', ['run', 'test:e2e'], {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true,
      env: { ...process.env, TEST_BASE_URL: BASE_URL }
    })

    let stdout = ''
    let stderr = ''
    let currentFailure = null

    testProcess.stdout.on('data', (data) => {
      const output = data.toString()
      stdout += output
      process.stdout.write(output)

      // Parse output line by line
      const lines = output.split('\n')
      for (const line of lines) {
        const parsed = parseTestFailure(line)
        if (parsed) {
          if (parsed.type === 'testName') {
            // Start new failure
            currentFailure = {
              file: parsed.match[1],
              suite: parsed.match[2],
              testName: parsed.match[3],
              duration: parsed.match[4],
              error: '',
              expectedStatus: null,
              actualStatus: null
            }
          } else if (parsed.type === 'error' && currentFailure) {
            currentFailure.error = parsed.match[1]

            // Extract status codes if present
            const statusMatch = currentFailure.error.match(/expected (\d+) to be (\d+)/)
            if (statusMatch) {
              currentFailure.actualStatus = parseInt(statusMatch[1])
              currentFailure.expectedStatus = parseInt(statusMatch[2])
            }

            failures.push(currentFailure)
            currentFailure = null
          }
        }
      }
    })

    testProcess.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    testProcess.on('close', (code) => {
      const duration = Date.now() - startTime

      // Parse final summary
      const summaryMatch = stdout.match(/Tests.*?(\d+) failed.*?(\d+) passed.*?\((\d+)\)/)
      if (summaryMatch) {
        testSummary.failedTests = parseInt(summaryMatch[1])
        testSummary.passedTests = parseInt(summaryMatch[2])
        testSummary.totalTests = parseInt(summaryMatch[3])
      }

      testSummary.duration = duration
      testSummary.exitCode = code

      resolve({ code, stdout, stderr, duration })
    })

    testProcess.on('error', (error) => {
      reject(error)
    })
  })
}

/**
 * Generate detailed log file
 */
function generateLogFile() {
  const logContent = []

  logContent.push('E2E TEST FAILURE ANALYSIS')
  logContent.push('=' .repeat(60))
  logContent.push(`Timestamp: ${testSummary.timestamp}`)
  logContent.push(`Base URL: ${testSummary.baseUrl}`)
  logContent.push(`Total Tests: ${testSummary.totalTests}`)
  logContent.push(`Passed: ${testSummary.passedTests}`)
  logContent.push(`Failed: ${testSummary.failedTests}`)
  logContent.push(`Duration: ${testSummary.duration}ms`)
  logContent.push(`Exit Code: ${testSummary.exitCode}`)
  logContent.push('')

  if (failures.length === 0) {
    logContent.push('🎉 ALL TESTS PASSED!')
    logContent.push('')
  } else {
    logContent.push(`DETAILED FAILURE ANALYSIS (${failures.length} failures)`)
    logContent.push('=' .repeat(60))
    logContent.push('')

    failures.forEach((failure, index) => {
      const report = generateFailureReport(failure)
      testSummary.failures.push(report)

      logContent.push(`FAILURE #${index + 1}`)
      logContent.push('-' .repeat(40))
      logContent.push(`Test: ${report.test}`)
      logContent.push(`File: ${report.file}`)
      logContent.push(`Suite: ${report.suite}`)
      logContent.push(`Endpoint: ${report.method} ${report.endpoint}`)
      logContent.push(`Function: ${report.function}`)
      logContent.push(`Error: ${report.error}`)

      if (report.expectedStatus && report.actualStatus) {
        logContent.push(`Expected Status: ${report.expectedStatus}`)
        logContent.push(`Actual Status: ${report.actualStatus}`)
      }

      logContent.push('')
      logContent.push('MANUAL TEST COMMAND:')
      logContent.push(report.curlCommand)
      logContent.push('')

      logContent.push('POSSIBLE CAUSES:')
      report.debugging.possibleCauses.forEach(cause => {
        logContent.push(`  • ${cause}`)
      })
      logContent.push('')

      logContent.push('RECOMMENDATIONS:')
      report.debugging.recommendations.forEach(rec => {
        logContent.push(`  • ${rec}`)
      })
      logContent.push('')
      logContent.push('=' .repeat(60))
      logContent.push('')
    })
  }

  // Write log file
  writeFileSync(LOG_FILE, logContent.join('\n'))

  // Write JSON summary
  writeFileSync(SUMMARY_FILE, JSON.stringify(testSummary, null, 2))
}

/**
 * Main execution
 */
async function main() {
  try {
    const result = await runE2ETests()

    console.log('\n' + '=' .repeat(60))
    console.log('📊 TEST EXECUTION COMPLETE')
    console.log('=' .repeat(60))
    console.log(`Duration: ${result.duration}ms`)
    console.log(`Exit Code: ${result.code}`)
    console.log(`Failures Detected: ${failures.length}`)

    generateLogFile()

    console.log('\n📝 REPORTS GENERATED:')
    console.log(`  Detailed Log: ${LOG_FILE}`)
    console.log(`  JSON Summary: ${SUMMARY_FILE}`)

    if (failures.length > 0) {
      console.log('\n❌ QUICK FAILURE SUMMARY:')
      failures.forEach((failure, index) => {
        const endpoint = extractEndpointInfo(failure.testName)
        console.log(`  ${index + 1}. ${endpoint.method} ${endpoint.function}: ${failure.error}`)
      })

      console.log('\n🔧 DEBUGGING COMMANDS:')
      console.log(`  View detailed log: cat "${LOG_FILE}"`)
      console.log(`  Test health endpoint: curl "${BASE_URL}/.netlify/functions/health"`)
      console.log(`  Test team verification: curl -X POST "${BASE_URL}/.netlify/functions/team-verify" -H "Content-Type: application/json" -d '{"code":"ALPHA01","deviceHint":"test"}'`)
    } else {
      console.log('\n🎉 ALL TESTS PASSED!')
    }

    process.exit(result.code)
  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message)
    process.exit(1)
  }
}

// Export for use as module
export { runE2ETests, generateFailureReport, extractEndpointInfo }

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}