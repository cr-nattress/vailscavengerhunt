#!/usr/bin/env node
/**
 * Verification script for Supabase migration
 * Tests all migrated functions to ensure they work correctly
 */

const chalk = require('chalk');
const fetch = require('node-fetch');

const BASE_URL = process.env.API_URL || 'http://localhost:3001';
const ORG_ID = 'bhhs';
const TEAM_ID = 'test_team_' + Date.now();
const HUNT_ID = 'fall-2025';

async function testEndpoint(name, method, url, body = null, expectedStatus = 200) {
  console.log(chalk.cyan(`\nTesting ${name}...`));

  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${url}`, options);
    const data = await response.text();

    let jsonData;
    try {
      jsonData = JSON.parse(data);
    } catch {
      jsonData = data;
    }

    if (response.status === expectedStatus) {
      console.log(chalk.green(`✓ ${name} - Status: ${response.status}`));
      return { success: true, data: jsonData };
    } else {
      console.log(chalk.red(`✗ ${name} - Status: ${response.status}, Expected: ${expectedStatus}`));
      console.log(chalk.yellow('Response:', jsonData));
      return { success: false, data: jsonData };
    }
  } catch (error) {
    console.log(chalk.red(`✗ ${name} - Error: ${error.message}`));
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log(chalk.bold.blue('=== Supabase Migration Verification ===\n'));

  const results = [];

  // Test 1: Settings Storage (STORY-004)
  console.log(chalk.bold('\n📝 Testing Settings Storage (STORY-004)'));

  // Set settings
  const settingsData = {
    settings: {
      theme: 'dark',
      notifications: true,
      testTime: new Date().toISOString()
    },
    sessionId: 'test-session-' + Date.now(),
    timestamp: new Date().toISOString()
  };

  results.push(
    await testEndpoint(
      'Settings Set',
      'POST',
      `/.netlify/functions/settings-set/${ORG_ID}/${TEAM_ID}/${HUNT_ID}`,
      settingsData
    )
  );

  // Get settings
  results.push(
    await testEndpoint(
      'Settings Get',
      'GET',
      `/.netlify/functions/settings-get/${ORG_ID}/${TEAM_ID}/${HUNT_ID}`
    )
  );

  // Test 2: KV Store operations
  console.log(chalk.bold('\n🗄️ Testing KV Store Operations'));

  const kvKey = `test/kv/${Date.now()}`;
  const kvValue = { test: 'data', timestamp: new Date().toISOString() };

  // Upsert KV
  results.push(
    await testEndpoint(
      'KV Upsert',
      'POST',
      `/.netlify/functions/kv-upsert`,
      { key: kvKey, value: kvValue }
    )
  );

  // Get KV
  results.push(
    await testEndpoint(
      'KV Get',
      'GET',
      `/.netlify/functions/kv-get?key=${encodeURIComponent(kvKey)}`
    )
  );

  // Test 3: Leaderboard (STORY-007)
  console.log(chalk.bold('\n🏆 Testing Leaderboard (STORY-007)'));

  results.push(
    await testEndpoint(
      'Leaderboard Get',
      'GET',
      `/.netlify/functions/leaderboard-get?orgId=${ORG_ID}&huntId=${HUNT_ID}`
    )
  );

  // Test 4: Progress operations
  console.log(chalk.bold('\n📊 Testing Progress Operations'));

  const progressData = {
    stop1: { done: true, timestamp: new Date().toISOString(), points: 10 },
    stop2: { done: true, timestamp: new Date().toISOString(), points: 15 },
    stop3: { done: false }
  };

  // Set progress
  results.push(
    await testEndpoint(
      'Progress Set',
      'POST',
      `/.netlify/functions/progress-set`,
      {
        orgId: ORG_ID,
        teamId: TEAM_ID,
        huntId: HUNT_ID,
        progress: progressData
      }
    )
  );

  // Get progress
  results.push(
    await testEndpoint(
      'Progress Get',
      'GET',
      `/.netlify/functions/progress-get?orgId=${ORG_ID}&teamId=${TEAM_ID}&huntId=${HUNT_ID}`
    )
  );

  // Test 5: Team verification (uses device locks from STORY-005)
  console.log(chalk.bold('\n👥 Testing Team Operations'));

  // Note: team-verify requires a valid team code to be set up first
  // This is more of a smoke test to ensure the endpoint is available
  results.push(
    await testEndpoint(
      'Team Verify (expect 401 without valid code)',
      'POST',
      `/api/team-verify`,
      { code: 'INVALID_CODE' },
      401 // Expected to fail with invalid code
    )
  );

  // Summary
  console.log(chalk.bold.blue('\n=== Test Summary ==='));

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(chalk.green(`✓ Passed: ${successful}`));
  if (failed > 0) {
    console.log(chalk.red(`✗ Failed: ${failed}`));
  }

  // Check for blob references
  console.log(chalk.bold.blue('\n=== Checking for Netlify Blob References ==='));

  const functionsToCheck = [
    'settings-get-supabase.js',
    'settings-set-supabase.js',
    'kv-get-supabase.js',
    'kv-set-supabase.js',
    'kv-upsert-supabase.js',
    'leaderboard-get-supabase.js',
    'progress-get-supabase.js',
    'progress-set-supabase.js'
  ];

  console.log(chalk.cyan('Checking that Supabase functions don\'t use @netlify/blobs...'));

  const fs = require('fs');
  const path = require('path');
  let hasBlobReferences = false;

  for (const file of functionsToCheck) {
    const filePath = path.join(__dirname, '../netlify/functions', file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('@netlify/blobs')) {
        console.log(chalk.red(`✗ ${file} still references @netlify/blobs`));
        hasBlobReferences = true;
      } else {
        console.log(chalk.green(`✓ ${file} - no blob references`));
      }
    } else {
      console.log(chalk.yellow(`⚠ ${file} not found`));
    }
  }

  // Final result
  console.log(chalk.bold.blue('\n=== Migration Status ==='));

  if (successful === results.length && !hasBlobReferences) {
    console.log(chalk.bold.green('✅ All migrations verified successfully!'));
    console.log(chalk.green('\nNext steps:'));
    console.log('1. Run the app and test user flows');
    console.log('2. Monitor Supabase dashboard for data');
    console.log('3. Check application logs for any errors');
    console.log('4. Consider running load tests');
  } else {
    console.log(chalk.bold.yellow('⚠️ Some issues detected'));
    console.log(chalk.yellow('\nReview the failed tests above and check:'));
    console.log('1. Supabase connection and credentials');
    console.log('2. Database tables and schemas');
    console.log('3. Function implementations');
    console.log('4. Server configuration');
  }
}

// Run tests
runTests().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});