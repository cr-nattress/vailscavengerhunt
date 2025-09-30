#!/usr/bin/env tsx

/**
 * Simple Supabase Data Export Script
 *
 * Exports all table data from Supabase to a SQL file for version control.
 * This focuses on exporting actual data rather than schema (which can be
 * maintained separately in version control).
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Tables to export (in dependency order for proper restoration)
const TABLES = [
  'organizations',
  'hunts',
  'hunt_stops',
  'hunt_configurations',
  'hunt_ordering_config',
  'teams',
  'team_codes',
  'team_stop_orders',
  'hunt_progress',
  'settings',
  'hunt_settings',
  'sponsor_assets',
  'kv_store',
  'key_value_store'
];

/**
 * Escape SQL string values
 */
function escapeSQLValue(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'number') return String(val);
  if (val instanceof Date) return `'${val.toISOString()}'`;
  if (typeof val === 'object') {
    return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  }
  // String value
  return `'${String(val).replace(/'/g, "''")}'`;
}

/**
 * Generate INSERT statement for a row
 */
function generateInsert(tableName: string, row: any): string {
  const columns = Object.keys(row);
  const values = columns.map(col => escapeSQLValue(row[col]));

  return `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT DO NOTHING;`;
}

/**
 * Export table data
 */
async function exportTable(tableName: string): Promise<string> {
  console.log(`   - ${tableName}`);

  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.warn(`     ⚠️  Error: ${error.message}`);
      return `-- ⚠️ Could not export ${tableName}: ${error.message}\n\n`;
    }

    if (!data || data.length === 0) {
      console.log(`     ℹ️  No data`);
      return `-- No data in ${tableName}\n\n`;
    }

    console.log(`     ✓ ${data.length} rows`);

    let sql = `-- Data for table: ${tableName} (${data.length} rows)\n`;
    sql += `TRUNCATE TABLE ${tableName} CASCADE;\n`;

    for (const row of data) {
      sql += generateInsert(tableName, row) + '\n';
    }

    return sql + '\n';

  } catch (error: any) {
    console.warn(`     ⚠️  Error: ${error.message}`);
    return `-- ⚠️ Could not export ${tableName}: ${error.message}\n\n`;
  }
}

/**
 * Main export function
 */
async function main() {
  console.log('🚀 Starting Supabase data export...\n');

  const timestamp = new Date().toISOString();
  const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || 'unknown';

  let output = `-- Supabase Data Export
-- Generated: ${timestamp}
-- Project: ${projectRef}
-- Database: ${SUPABASE_URL}
--
-- This file contains data snapshots from all tables.
-- To restore: Execute this file against your Supabase instance.
--
-- ⚠️  WARNING: This file contains TRUNCATE statements.
--     Only run this on a fresh database or backup your data first!

-- Disable triggers during import for performance
SET session_replication_role = replica;

`;

  console.log('📦 Exporting table data...\n');

  for (const tableName of TABLES) {
    output += await exportTable(tableName);
  }

  output += `-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- Update sequences (if needed)
SELECT setval(pg_get_serial_sequence('teams', 'id'), COALESCE(MAX(id::bigint), 1)) FROM teams;

-- Vacuum and analyze for performance
VACUUM ANALYZE;
`;

  // Write output file
  const outputDir = path.join(process.cwd(), 'scripts', 'sql');
  const timestamp_file = timestamp.replace(/[:.]/g, '-').substring(0, 19);
  const outputFile = path.join(outputDir, `supabase-data-export-${timestamp_file}.sql`);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputFile, output, 'utf8');

  console.log('\n✅ Export complete!');
  console.log(`📄 Output: ${outputFile}`);
  console.log(`📊 Size: ${(fs.statSync(outputFile).size / 1024).toFixed(2)} KB`);
  console.log(`\n💡 To restore this data:`);
  console.log(`   psql <connection_string> < ${outputFile}`);
}

main().catch(error => {
  console.error('\n❌ Export failed:', error.message);
  process.exit(1);
});