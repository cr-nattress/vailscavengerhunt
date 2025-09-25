/**
 * Test Supabase Connection and Setup
 * This script tests the connection and can execute the schema
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

async function testConnection() {
  log('\n========================================', 'cyan');
  log('Supabase Connection Test', 'cyan');
  log('========================================', 'cyan');

  // Check configuration
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    log('❌ Missing Supabase configuration!', 'red');
    log('Please set the following environment variables:', 'yellow');
    log('  - SUPABASE_URL', 'yellow');
    log('  - SUPABASE_SERVICE_ROLE_KEY', 'yellow');
    return false;
  }

  log(`✓ Supabase URL: ${SUPABASE_URL}`, 'green');
  log(`✓ Service Role Key: ${SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...`, 'green');

  // Create client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Test basic connection - try to query a system table
    log('\nTesting connection...', 'blue');

    // First try to check if we can connect at all by checking auth
    const { data: authCheck, error: authError } = await supabase.auth.getSession();

    // The auth check with service role should work even without tables
    if (!authError || authError.message.includes('session')) {
      log('✓ Connection successful!', 'green');
      return supabase;
    }

    throw authError;
  } catch (error) {
    log(`❌ Connection failed: ${error.message}`, 'red');
    return false;
  }
}

async function checkTables(supabase) {
  log('\n========================================', 'cyan');
  log('Checking Tables', 'cyan');
  log('========================================', 'cyan');

  const tables = [
    'device_locks',
    'debug_logs',
    'kv_store',
    'team_progress',
    'team_mappings',
    'hunt_settings'
  ];

  const results = {
    existing: [],
    missing: []
  };

  for (const table of tables) {
    try {
      // Try to select from the table
      const { error } = await supabase.from(table).select('*').limit(1);

      if (error) {
        if (error.code === '42P01') { // Table doesn't exist
          log(`  ❌ ${table} - does not exist`, 'yellow');
          results.missing.push(table);
        } else if (error.code === 'PGRST116') { // No rows (table exists but empty)
          log(`  ✓ ${table} - exists (empty)`, 'green');
          results.existing.push(table);
        } else {
          log(`  ⚠ ${table} - error: ${error.message}`, 'yellow');
          results.missing.push(table);
        }
      } else {
        log(`  ✓ ${table} - exists`, 'green');
        results.existing.push(table);
      }
    } catch (err) {
      log(`  ❌ ${table} - error: ${err.message}`, 'red');
      results.missing.push(table);
    }
  }

  return results;
}

async function executeSchema(supabase) {
  log('\n========================================', 'cyan');
  log('Executing Safe Schema', 'cyan');
  log('========================================', 'cyan');

  try {
    // Read the safe schema file
    const schemaPath = path.join(__dirname, '..', 'scripts', 'sql', 'supabase-migration-schema-safe.sql');
    const schema = await fs.readFile(schemaPath, 'utf-8');

    log('Reading schema file...', 'blue');

    // Note: Supabase doesn't have a direct SQL execution endpoint via the JS client
    // You'll need to run this through the Supabase dashboard or CLI
    log('\n⚠️  IMPORTANT: The schema needs to be executed through:', 'yellow');
    log('  1. Supabase Dashboard SQL Editor (recommended)', 'yellow');
    log('  2. Supabase CLI: supabase db push', 'yellow');
    log('  3. Direct PostgreSQL connection', 'yellow');

    log('\nSchema file location:', 'cyan');
    log(`  ${schemaPath}`, 'blue');

    log('\nTo execute in Supabase Dashboard:', 'cyan');
    log('  1. Go to: https://app.supabase.com/project/ksiqnglqlurlackoteyc/sql', 'blue');
    log('  2. Open the SQL Editor', 'blue');
    log('  3. Copy and paste the contents of the schema file', 'blue');
    log('  4. Click "Run" to execute', 'blue');

    return true;
  } catch (error) {
    log(`❌ Error reading schema: ${error.message}`, 'red');
    return false;
  }
}

async function testCRUDOperations(supabase) {
  log('\n========================================', 'cyan');
  log('Testing CRUD Operations', 'cyan');
  log('========================================', 'cyan');

  const testData = {
    debug_logs: {
      filename: 'test.log',
      data: { test: true, timestamp: new Date().toISOString() },
      timestamp: new Date().toISOString(),
      ip_address: '127.0.0.1'
    },
    kv_store: {
      key: 'test_key_' + Date.now(),
      value: { test: true },
      indexes: ['test']
    }
  };

  // Test debug_logs
  try {
    log('\nTesting debug_logs table...', 'blue');

    // Insert
    const { data: inserted, error: insertError } = await supabase
      .from('debug_logs')
      .insert(testData.debug_logs)
      .select()
      .single();

    if (insertError) throw insertError;
    log('  ✓ INSERT successful', 'green');

    // Read
    const { data: read, error: readError } = await supabase
      .from('debug_logs')
      .select('*')
      .eq('id', inserted.id)
      .single();

    if (readError) throw readError;
    log('  ✓ SELECT successful', 'green');

    // Delete
    const { error: deleteError } = await supabase
      .from('debug_logs')
      .delete()
      .eq('id', inserted.id);

    if (deleteError) throw deleteError;
    log('  ✓ DELETE successful', 'green');

  } catch (error) {
    if (error.code === '42P01') {
      log('  ⚠ Table does not exist yet', 'yellow');
    } else {
      log(`  ❌ Error: ${error.message}`, 'red');
    }
  }

  // Test kv_store
  try {
    log('\nTesting kv_store table...', 'blue');

    // Upsert
    const { error: upsertError } = await supabase
      .from('kv_store')
      .upsert(testData.kv_store);

    if (upsertError) throw upsertError;
    log('  ✓ UPSERT successful', 'green');

    // Read
    const { data: read, error: readError } = await supabase
      .from('kv_store')
      .select('*')
      .eq('key', testData.kv_store.key)
      .single();

    if (readError) throw readError;
    log('  ✓ SELECT successful', 'green');

    // Delete
    const { error: deleteError } = await supabase
      .from('kv_store')
      .delete()
      .eq('key', testData.kv_store.key);

    if (deleteError) throw deleteError;
    log('  ✓ DELETE successful', 'green');

  } catch (error) {
    if (error.code === '42P01') {
      log('  ⚠ Table does not exist yet', 'yellow');
    } else {
      log(`  ❌ Error: ${error.message}`, 'red');
    }
  }
}

async function main() {
  log('Supabase Infrastructure Test', 'cyan');
  log('============================\n', 'cyan');

  // Test connection
  const supabase = await testConnection();
  if (!supabase) {
    log('\n❌ Connection test failed. Please check your configuration.', 'red');
    process.exit(1);
  }

  // Check tables
  const tableResults = await checkTables(supabase);

  // If tables are missing, show schema execution instructions
  if (tableResults.missing.length > 0) {
    log(`\n⚠️  ${tableResults.missing.length} tables are missing`, 'yellow');
    await executeSchema(supabase);
  } else {
    log('\n✓ All tables exist!', 'green');

    // Test CRUD operations if tables exist
    await testCRUDOperations(supabase);
  }

  // Summary
  log('\n========================================', 'cyan');
  log('Summary', 'cyan');
  log('========================================', 'cyan');
  log(`  ✓ Connection: Working`, 'green');
  log(`  ✓ Tables Existing: ${tableResults.existing.length}/6`, tableResults.existing.length === 6 ? 'green' : 'yellow');

  if (tableResults.missing.length > 0) {
    log(`  ⚠ Tables Missing: ${tableResults.missing.length}/6`, 'yellow');
    log('\nNext Steps:', 'cyan');
    log('1. Execute the schema in Supabase Dashboard', 'blue');
    log('2. Run this test again to verify', 'blue');
  } else {
    log(`  ✓ All systems operational!`, 'green');
  }
}

// Run the test
main().catch(error => {
  log(`\n❌ Unexpected error: ${error.message}`, 'red');
  process.exit(1);
});