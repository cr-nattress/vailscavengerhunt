/**
 * Supabase Database Schema Setup Script
 * Reads and executes the SQL schema file to set up the database
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function setupSchema() {
  console.log('🗄️  Setting up Supabase database schema...\n');

  // Validate environment variables
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Error: Missing required environment variables');
    console.error('   - SUPABASE_URL: Supabase project URL');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY: Service role key for admin operations');
    console.error('\nPlease set these variables in your .env file');
    process.exit(1);
  }

  try {
    // Create Supabase client with service role key (admin access)
    console.log('🔗 Connecting to Supabase with admin privileges...');
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Read SQL schema file
    console.log('📖 Reading database schema...');
    const schemaPath = join(__dirname, 'supabase-schema.sql');
    const schemaSql = readFileSync(schemaPath, 'utf8');

    // Split SQL into individual statements (rough split on semicolons)
    const statements = schemaSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📋 Found ${statements.length} SQL statements to execute\n`);

    // Execute statements one by one
    let successCount = 0;
    let skipCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'; // Add back the semicolon

      // Log progress for major statements
      if (statement.includes('CREATE TABLE')) {
        const tableName = statement.match(/CREATE TABLE (\w+)/)?.[1];
        console.log(`📦 Creating table: ${tableName}`);
      } else if (statement.includes('CREATE INDEX')) {
        const indexName = statement.match(/CREATE INDEX (\w+)/)?.[1];
        console.log(`🔍 Creating index: ${indexName}`);
      } else if (statement.includes('CREATE VIEW')) {
        const viewName = statement.match(/CREATE VIEW (\w+)/)?.[1];
        console.log(`👁️  Creating view: ${viewName}`);
      } else if (statement.includes('CREATE TRIGGER')) {
        const triggerName = statement.match(/CREATE TRIGGER (\w+)/)?.[1];
        console.log(`⚡ Creating trigger: ${triggerName}`);
      } else if (statement.includes('INSERT INTO')) {
        const tableName = statement.match(/INSERT INTO (\w+)/)?.[1];
        console.log(`📝 Inserting sample data into: ${tableName}`);
      }

      try {
        const { data, error } = await supabase.rpc('exec_sql', { sql: statement });

        if (error) {
          // Check if it's a harmless "already exists" error
          if (error.message.includes('already exists') ||
              error.message.includes('relation') && error.message.includes('already exists')) {
            console.log(`   ⚠️  Already exists - skipping`);
            skipCount++;
            continue;
          }
          throw error;
        }

        successCount++;
      } catch (error) {
        console.error(`   ❌ Failed to execute statement:`, error.message);

        // Continue with other statements unless it's a critical error
        if (error.message.includes('permission denied') ||
            error.message.includes('authentication')) {
          throw error;
        }
      }
    }

    console.log('\n📊 Schema Setup Summary:');
    console.log(`   ✅ Successfully executed: ${successCount} statements`);
    console.log(`   ⚠️  Skipped (already exists): ${skipCount} statements`);

    // Verify tables were created
    console.log('\n🔍 Verifying table creation...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', [
        'organizations', 'hunts', 'teams', 'team_codes',
        'hunt_progress', 'sessions', 'settings'
      ]);

    if (tablesError) {
      console.error('❌ Could not verify tables:', tablesError.message);
    } else {
      console.log('✅ Core tables verified:');
      tables.forEach(table => {
        console.log(`   ✓ ${table.table_name}`);
      });
    }

    // Test leaderboard view
    console.log('\n👁️  Testing leaderboard view...');
    const { data: leaderboard, error: viewError } = await supabase
      .from('leaderboard')
      .select('*')
      .limit(1);

    if (viewError) {
      console.error('❌ Leaderboard view test failed:', viewError.message);
    } else {
      console.log('✅ Leaderboard view working correctly');
    }

    console.log('\n🎉 Database schema setup completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Set up Row Level Security policies');
    console.log('   2. Generate TypeScript types');
    console.log('   3. Test database connectivity from app');

  } catch (error) {
    console.error('\n❌ Schema setup failed:', error.message);

    if (error.message.includes('permission denied')) {
      console.error('   Check your SUPABASE_SERVICE_ROLE_KEY permissions');
    } else if (error.message.includes('function exec_sql does not exist')) {
      console.error('   This method requires direct SQL execution in Supabase dashboard');
      console.error('   Please copy scripts/supabase-schema.sql and run it in:');
      console.error('   Supabase Dashboard > SQL Editor > New Query');
    }

    process.exit(1);
  }
}

// Export for use in other scripts
export { setupSchema };

// Run setup if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupSchema().catch(console.error);
}