/**
 * Migration Script for Team Mappings
 * Migrates team mappings from Netlify Blobs to Supabase
 * Based on STORY-005 requirements
 */

require('dotenv').config();
const { getStore } = require('@netlify/blobs');
const { createClient } = require('@supabase/supabase-js');
const chalk = require('chalk');
const ora = require('ora');

// Configuration
const DRY_RUN = process.argv.includes('--dry-run');
const SPECIFIC_ORG = process.argv.find(arg => arg.startsWith('--org='))?.split('=')[1];
const BATCH_SIZE = 50;

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

// Migration statistics
const stats = {
  total: 0,
  migrated: 0,
  skipped: 0,
  errors: 0,
  duplicates: 0
};

// Audit log
const auditLog = [];

/**
 * Log an audit entry
 */
function audit(action, details) {
  const entry = {
    timestamp: new Date().toISOString(),
    action,
    ...details
  };
  auditLog.push(entry);
  console.log(chalk.gray(`[AUDIT] ${action}: ${JSON.stringify(details)}`));
}

/**
 * Read team mappings from blob storage
 */
async function readTeamMappingsFromBlobs() {
  const spinner = ora('Reading team mappings from blob storage...').start();
  const mappings = [];

  try {
    const store = getStore({
      name: 'team-mappings',
      siteID: process.env.NETLIFY_SITE_ID,
      token: process.env.NETLIFY_AUTH_TOKEN
    });

    // List all blobs
    const { blobs } = await store.list();
    spinner.text = `Found ${blobs.length} team mapping blobs`;

    for (const blob of blobs) {
      try {
        // Filter by organization if specified
        if (SPECIFIC_ORG && !blob.key.startsWith(`${SPECIFIC_ORG}/`)) {
          continue;
        }

        const data = await store.get(blob.key, { type: 'json' });
        if (data) {
          mappings.push({
            key: blob.key,
            data: data,
            metadata: blob.metadata || {}
          });
        }
      } catch (error) {
        console.error(chalk.red(`Error reading blob ${blob.key}:`, error.message));
        stats.errors++;
      }
    }

    spinner.succeed(`Read ${mappings.length} team mappings from blob storage`);
    return mappings;
  } catch (error) {
    spinner.fail('Failed to read from blob storage');
    throw error;
  }
}

/**
 * Validate team mapping data
 */
function validateMapping(mapping) {
  const errors = [];

  if (!mapping.data) {
    errors.push('Missing data object');
    return { valid: false, errors };
  }

  const { teamCode, teamName, orgId, huntId } = mapping.data;

  if (!teamCode) errors.push('Missing teamCode');
  if (!teamName) errors.push('Missing teamName');
  if (!orgId) errors.push('Missing orgId');
  if (!huntId) errors.push('Missing huntId');

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Transform blob data to Supabase schema
 */
function transformToSupabaseSchema(mapping) {
  const { teamCode, teamName, orgId, huntId, ...metadata } = mapping.data;

  return {
    team_code: teamCode.toUpperCase(), // Normalize to uppercase
    team_name: teamName,
    org_id: orgId,
    hunt_id: huntId,
    metadata: metadata,
    created_at: mapping.metadata.created || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

/**
 * Migrate mappings to Supabase in batches
 */
async function migrateMappingsToSupabase(mappings) {
  const spinner = ora(`Migrating ${mappings.length} team mappings to Supabase...`).start();

  // Process in batches
  for (let i = 0; i < mappings.length; i += BATCH_SIZE) {
    const batch = mappings.slice(i, i + BATCH_SIZE);
    spinner.text = `Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(mappings.length / BATCH_SIZE)}`;

    const transformedBatch = [];

    for (const mapping of batch) {
      const validation = validateMapping(mapping);

      if (!validation.valid) {
        console.error(chalk.red(`Invalid mapping ${mapping.key}:`, validation.errors.join(', ')));
        stats.errors++;
        audit('VALIDATION_ERROR', { key: mapping.key, errors: validation.errors });
        continue;
      }

      transformedBatch.push(transformToSupabaseSchema(mapping));
    }

    if (transformedBatch.length > 0 && !DRY_RUN) {
      try {
        // Use upsert to handle duplicates gracefully
        const { data, error } = await supabase
          .from('team_mappings')
          .upsert(transformedBatch, {
            onConflict: 'team_code',
            returning: 'minimal'
          });

        if (error) {
          console.error(chalk.red('Batch insert error:', error.message));
          stats.errors += transformedBatch.length;
          audit('BATCH_ERROR', { error: error.message, count: transformedBatch.length });
        } else {
          stats.migrated += transformedBatch.length;
          audit('BATCH_MIGRATED', { count: transformedBatch.length });
        }
      } catch (error) {
        console.error(chalk.red('Unexpected error:', error.message));
        stats.errors += transformedBatch.length;
      }
    } else if (DRY_RUN) {
      console.log(chalk.yellow(`[DRY RUN] Would migrate ${transformedBatch.length} mappings`));
      stats.skipped += transformedBatch.length;
    }
  }

  spinner.succeed(`Migration completed: ${stats.migrated} migrated, ${stats.errors} errors`);
}

/**
 * Verify migrated data
 */
async function verifyMigration() {
  const spinner = ora('Verifying migrated data...').start();

  try {
    // Count total mappings in Supabase
    const { count, error } = await supabase
      .from('team_mappings')
      .select('*', { count: 'exact', head: true });

    if (error) {
      throw error;
    }

    spinner.succeed(`Verification complete: ${count} team mappings in Supabase`);
    audit('VERIFICATION', { total_count: count });

    // Test a few random lookups
    const { data: samples } = await supabase
      .from('team_mappings')
      .select('*')
      .limit(5);

    if (samples && samples.length > 0) {
      console.log(chalk.green('\nSample migrated mappings:'));
      samples.forEach(s => {
        console.log(`  - ${s.team_code}: ${s.team_name} (${s.org_id}/${s.hunt_id})`);
      });
    }

    return true;
  } catch (error) {
    spinner.fail('Verification failed');
    console.error(chalk.red('Error:', error.message));
    return false;
  }
}

/**
 * Generate migration report
 */
function generateReport() {
  console.log('\n' + chalk.bold.blue('=== Migration Report ==='));
  console.log(chalk.white(`Total mappings processed: ${stats.total}`));
  console.log(chalk.green(`Successfully migrated: ${stats.migrated}`));
  console.log(chalk.yellow(`Skipped (dry run/duplicates): ${stats.skipped + stats.duplicates}`));
  console.log(chalk.red(`Errors: ${stats.errors}`));

  // Save audit log
  const reportPath = `./migration-report-team-mappings-${Date.now()}.json`;
  require('fs').writeFileSync(
    reportPath,
    JSON.stringify({ stats, auditLog }, null, 2)
  );

  console.log(chalk.gray(`\nDetailed audit log saved to: ${reportPath}`));
}

/**
 * Main migration function
 */
async function main() {
  console.log(chalk.bold.blue('Team Mappings Migration Script'));
  console.log(chalk.gray('================================\n'));

  if (DRY_RUN) {
    console.log(chalk.yellow('🔍 Running in DRY RUN mode - no changes will be made\n'));
  }

  if (SPECIFIC_ORG) {
    console.log(chalk.cyan(`📁 Migrating only organization: ${SPECIFIC_ORG}\n`));
  }

  try {
    // Step 1: Read mappings from blobs
    const mappings = await readTeamMappingsFromBlobs();
    stats.total = mappings.length;

    if (mappings.length === 0) {
      console.log(chalk.yellow('No team mappings found to migrate'));
      return;
    }

    // Step 2: Migrate to Supabase
    await migrateMappingsToSupabase(mappings);

    // Step 3: Verify migration
    if (!DRY_RUN) {
      await verifyMigration();
    }

    // Step 4: Generate report
    generateReport();

    console.log(chalk.bold.green('\n✅ Migration completed successfully!'));

    if (!DRY_RUN) {
      console.log(chalk.yellow('\n⚠️  Remember to:'));
      console.log('  1. Keep blob backups for 7 days');
      console.log('  2. Update environment variable USE_SUPABASE_TEAMS=true');
      console.log('  3. Monitor for any issues');
      console.log('  4. Run verification tests');
    }

  } catch (error) {
    console.error(chalk.bold.red('\n❌ Migration failed:'), error.message);
    generateReport();
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  readTeamMappingsFromBlobs,
  migrateMappingsToSupabase,
  verifyMigration
};