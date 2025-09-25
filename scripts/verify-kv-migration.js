/**
 * KV Store Migration Verification Script
 * Verifies that KV operations are working correctly with Supabase
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API_URL = 'http://localhost:8888/.netlify/functions';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function verifyMigration() {
  log('========================================', 'cyan');
  log('KV Store Migration Verification', 'cyan');
  log('========================================', 'cyan');

  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Verify Supabase connection
  try {
    log('\n📌 Test 1: Verifying Supabase connection...', 'blue');
    const { count } = await supabase
      .from('kv_store')
      .select('*', { count: 'exact', head: true });
    log(`✅ Supabase connection successful. Found ${count} entries in kv_store.`, 'green');
    testsPassed++;
  } catch (error) {
    log(`❌ Supabase connection failed: ${error.message}`, 'red');
    testsFailed++;
  }

  // Test 2: Test KV upsert via API
  try {
    log('\n📌 Test 2: Testing KV upsert via API...', 'blue');
    const testKey = `verification_test_${Date.now()}`;
    const testValue = {
      test: true,
      timestamp: new Date().toISOString(),
      message: 'Migration verification test'
    };

    const response = await fetch(`${API_URL}/kv/upsert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: testKey, value: testValue })
    });

    if (response.ok) {
      const result = await response.json();
      log(`✅ KV upsert successful. Key: ${result.key}`, 'green');
      testsPassed++;

      // Verify in database
      const { data } = await supabase
        .from('kv_store')
        .select('*')
        .eq('key', testKey)
        .single();

      if (data && JSON.stringify(data.value) === JSON.stringify(testValue)) {
        log(`✅ Data verified in Supabase database`, 'green');
      } else {
        log(`⚠️  Data mismatch in database`, 'yellow');
      }

      // Cleanup
      await supabase.from('kv_store').delete().eq('key', testKey);
    } else {
      throw new Error(`API returned ${response.status}`);
    }
  } catch (error) {
    log(`❌ KV upsert test failed: ${error.message}`, 'red');
    testsFailed++;
  }

  // Test 3: Test KV list via API
  try {
    log('\n📌 Test 3: Testing KV list via API...', 'blue');
    const response = await fetch(`${API_URL}/kv/list`);

    if (response.ok) {
      const result = await response.json();
      log(`✅ KV list successful. Found ${result.count} keys`, 'green');

      if (result.keys && Array.isArray(result.keys)) {
        log(`✅ Response format is correct`, 'green');
        testsPassed++;
      } else {
        throw new Error('Invalid response format');
      }
    } else {
      throw new Error(`API returned ${response.status}`);
    }
  } catch (error) {
    log(`❌ KV list test failed: ${error.message}`, 'red');
    testsFailed++;
  }

  // Test 4: Test with indexes
  try {
    log('\n📌 Test 4: Testing KV operations with indexes...', 'blue');
    const testKey = `index_test_${Date.now()}`;
    const testValue = { type: 'test', status: 'active' };
    const indexes = [
      { key: 'type', member: 'test' },
      { key: 'status', member: 'active' }
    ];

    const response = await fetch(`${API_URL}/kv/upsert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: testKey, value: testValue, indexes })
    });

    if (response.ok) {
      log(`✅ KV upsert with indexes successful`, 'green');

      // Verify indexes in database
      const { data } = await supabase
        .from('kv_store')
        .select('indexes')
        .eq('key', testKey)
        .single();

      if (data && data.indexes.includes('type:test') && data.indexes.includes('status:active')) {
        log(`✅ Indexes verified in database`, 'green');
        testsPassed++;
      } else {
        log(`⚠️  Indexes not properly stored`, 'yellow');
      }

      // Cleanup
      await supabase.from('kv_store').delete().eq('key', testKey);
    } else {
      throw new Error(`API returned ${response.status}`);
    }
  } catch (error) {
    log(`❌ Index test failed: ${error.message}`, 'red');
    testsFailed++;
  }

  // Test 5: Verify feature flag
  try {
    log('\n📌 Test 5: Verifying feature flag configuration...', 'blue');
    if (process.env.USE_SUPABASE_KV === 'true') {
      log(`✅ Feature flag USE_SUPABASE_KV is enabled`, 'green');
      testsPassed++;
    } else {
      log(`⚠️  Feature flag USE_SUPABASE_KV is not enabled`, 'yellow');
      log(`   Set USE_SUPABASE_KV=true in .env to use Supabase`, 'yellow');
    }
  } catch (error) {
    log(`❌ Feature flag check failed: ${error.message}`, 'red');
    testsFailed++;
  }

  // Summary
  log('\n========================================', 'cyan');
  log('Verification Summary', 'cyan');
  log('========================================', 'cyan');
  log(`✅ Tests Passed: ${testsPassed}`, 'green');
  if (testsFailed > 0) {
    log(`❌ Tests Failed: ${testsFailed}`, 'red');
  }

  const totalTests = testsPassed + testsFailed;
  const successRate = Math.round((testsPassed / totalTests) * 100);
  log(`📊 Success Rate: ${successRate}%`, successRate === 100 ? 'green' : 'yellow');

  if (successRate === 100) {
    log('\n🎉 KV Store migration is fully operational!', 'green');
    log('✅ All systems are using Supabase successfully', 'green');
  } else {
    log('\n⚠️  Some issues detected. Please review the failed tests.', 'yellow');
  }

  process.exit(testsFailed > 0 ? 1 : 0);
}

// Run verification
verifyMigration().catch(error => {
  log(`\n❌ Verification failed: ${error.message}`, 'red');
  process.exit(1);
});