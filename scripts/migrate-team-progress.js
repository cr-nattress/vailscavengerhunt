/**
 * Migration Script for Team Progress Data
 * Migrates team progress from vail-hunt-state blobs to Supabase
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
  emptyProgress: 0
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
 * Parse blob key to extract org/team/hunt structure
 */
function parseProgressKey(key) {
  // Expected format: org/team/hunt/progress or similar
  const parts = key.split('/');

  if (parts.length < 4) {
    return null;
  }

  return {
    orgId: parts[0],
    teamId: parts[1],
    huntId: parts[2],
    type: parts[3] // 'progress', 'state', etc.
  };
}

/**
 * Calculate progress statistics
 */
function calculateProgressStats(progressData) {
  const stats = {
    completedStops: 0,
    totalStops: 0,
    percentComplete: 0,
    totalScore: 0,
    averageTimePerStop: 0,
    lastActivity: null
  };

  if (!progressData) {
    return stats;
  }

  // Count completed stops
  if (progressData.completedStops) {
    stats.completedStops = Array.isArray(progressData.completedStops)
      ? progressData.completedStops.length
      : 0;
  }

  // Total stops (if available)
  if (progressData.totalStops) {
    stats.totalStops = progressData.totalStops;
  } else if (progressData.stops) {
    stats.totalStops = Object.keys(progressData.stops).length;
  }

  // Calculate percentage
  if (stats.totalStops > 0) {
    stats.percentComplete = Math.round((stats.completedStops / stats.totalStops) * 100);
  }

  // Calculate score
  if (progressData.score) {
    stats.totalScore = progressData.score;
  } else if (progressData.stops) {
    stats.totalScore = Object.values(progressData.stops)
      .filter(stop => stop.completed)
      .reduce((sum, stop) => sum + (stop.points || 0), 0);
  }

  // Last activity
  if (progressData.lastUpdated) {
    stats.lastActivity = progressData.lastUpdated;
  } else if (progressData.timestamps) {
    const timestamps = Object.values(progressData.timestamps);
    if (timestamps.length > 0) {
      stats.lastActivity = timestamps.sort().pop();
    }
  }

  return stats;
}

/**
 * Read team progress from blob storage
 */
async function readTeamProgressFromBlobs() {
  const spinner = ora('Reading team progress from blob storage...').start();
  const progressData = [];

  try {
    const store = getStore({
      name: 'vail-hunt-state',
      siteID: process.env.NETLIFY_SITE_ID,
      token: process.env.NETLIFY_AUTH_TOKEN
    });

    // List all blobs
    const { blobs } = await store.list();
    spinner.text = `Found ${blobs.length} progress blobs`;

    for (const blob of blobs) {
      try {
        const parsed = parseProgressKey(blob.key);

        if (!parsed) {
          console.warn(chalk.yellow(`Skipping invalid key format: ${blob.key}`));
          continue;
        }

        // Filter by organization if specified
        if (SPECIFIC_ORG && parsed.orgId !== SPECIFIC_ORG) {
          continue;
        }

        // Only process progress-related blobs
        if (!['progress', 'state', 'data'].includes(parsed.type)) {
          continue;
        }

        const data = await store.get(blob.key, { type: 'json' });
        if (data) {
          progressData.push({
            key: blob.key,
            ...parsed,
            data: data,
            metadata: blob.metadata || {}
          });
        }
      } catch (error) {
        console.error(chalk.red(`Error reading blob ${blob.key}:`, error.message));
        stats.errors++;
      }
    }

    spinner.succeed(`Read ${progressData.length} team progress records from blob storage`);
    return progressData;
  } catch (error) {
    spinner.fail('Failed to read from blob storage');
    throw error;
  }
}

/**
 * Transform blob data to Supabase schema
 */
function transformToSupabaseSchema(progressRecord) {
  const { orgId, teamId, huntId, data } = progressRecord;
  const stats = calculateProgressStats(data);

  return {
    team_id: teamId,
    org_id: orgId,
    hunt_id: huntId,
    progress_data: data,
    completed_stops: stats.completedStops,
    total_stops: stats.totalStops,
    percent_complete: stats.percentComplete,
    total_score: stats.totalScore,
    latest_activity: stats.lastActivity || new Date().toISOString(),
    version: 1, // Start with version 1 for optimistic locking
    created_at: progressRecord.metadata.created || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

/**
 * Migrate progress to Supabase in batches
 */
async function migrateProgressToSupabase(progressData) {
  const spinner = ora(`Migrating ${progressData.length} team progress records to Supabase...`).start();

  // Process in batches
  for (let i = 0; i < progressData.length; i += BATCH_SIZE) {
    const batch = progressData.slice(i, i + BATCH_SIZE);
    spinner.text = `Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(progressData.length / BATCH_SIZE)}`;

    const transformedBatch = [];

    for (const record of batch) {
      // Skip empty progress
      if (!record.data || Object.keys(record.data).length === 0) {
        stats.emptyProgress++;
        audit('EMPTY_PROGRESS', { key: record.key });
        continue;
      }

      try {
        transformedBatch.push(transformToSupabaseSchema(record));
      } catch (error) {
        console.error(chalk.red(`Transform error for ${record.key}:`, error.message));
        stats.errors++;
        audit('TRANSFORM_ERROR', { key: record.key, error: error.message });
      }
    }

    if (transformedBatch.length > 0 && !DRY_RUN) {
      try {
        // Use upsert to handle existing records
        const { data, error } = await supabase
          .from('team_progress')
          .upsert(transformedBatch, {
            onConflict: 'team_id,hunt_id',
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
      console.log(chalk.yellow(`[DRY RUN] Would migrate ${transformedBatch.length} progress records`));
      stats.skipped += transformedBatch.length;
    }
  }

  spinner.succeed(`Migration completed: ${stats.migrated} migrated, ${stats.errors} errors, ${stats.emptyProgress} empty`);
}

/**
 * Verify migrated data and generate leaderboard
 */
async function verifyMigrationAndLeaderboard() {
  const spinner = ora('Verifying migrated data and generating leaderboard...').start();

  try {
    // Count total progress records in Supabase
    const { count, error: countError } = await supabase
      .from('team_progress')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      throw countError;
    }

    spinner.text = `Found ${count} team progress records in Supabase`;

    // Generate sample leaderboard
    const { data: leaderboard, error: leaderboardError } = await supabase
      .from('team_progress')
      .select('team_id, org_id, hunt_id, percent_complete, total_score, latest_activity')
      .order('total_score', { ascending: false })
      .order('percent_complete', { ascending: false })
      .limit(10);

    if (leaderboardError) {
      throw leaderboardError;
    }

    spinner.succeed(`Verification complete: ${count} team progress records in Supabase`);
    audit('VERIFICATION', { total_count: count, top_teams: leaderboard?.length || 0 });

    if (leaderboard && leaderboard.length > 0) {
      console.log(chalk.green('\n🏆 Top Teams Leaderboard:'));
      leaderboard.forEach((team, index) => {
        console.log(`  ${index + 1}. ${team.team_id}: ${team.total_score} points (${team.percent_complete}% complete)`);
      });
    }

    // Compare with original data
    console.log(chalk.cyan('\n📊 Migration Statistics:'));
    console.log(`  Original records: ${stats.total}`);
    console.log(`  Migrated records: ${stats.migrated}`);
    console.log(`  Empty progress skipped: ${stats.emptyProgress}`);
    console.log(`  Data integrity: ${((stats.migrated / (stats.total - stats.emptyProgress)) * 100).toFixed(1)}%`);

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
  console.log(chalk.white(`Total progress records processed: ${stats.total}`));
  console.log(chalk.green(`Successfully migrated: ${stats.migrated}`));
  console.log(chalk.yellow(`Skipped (dry run): ${stats.skipped}`));
  console.log(chalk.gray(`Empty progress records: ${stats.emptyProgress}`));
  console.log(chalk.red(`Errors: ${stats.errors}`));

  // Save audit log
  const reportPath = `./migration-report-team-progress-${Date.now()}.json`;
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
  console.log(chalk.bold.blue('Team Progress Migration Script'));
  console.log(chalk.gray('================================\n'));

  if (DRY_RUN) {
    console.log(chalk.yellow('🔍 Running in DRY RUN mode - no changes will be made\n'));
  }

  if (SPECIFIC_ORG) {
    console.log(chalk.cyan(`📁 Migrating only organization: ${SPECIFIC_ORG}\n`));
  }

  try {
    // Step 1: Read progress from blobs
    const progressData = await readTeamProgressFromBlobs();
    stats.total = progressData.length;

    if (progressData.length === 0) {
      console.log(chalk.yellow('No team progress found to migrate'));
      return;
    }

    // Step 2: Migrate to Supabase
    await migrateProgressToSupabase(progressData);

    // Step 3: Verify migration and show leaderboard
    if (!DRY_RUN) {
      await verifyMigrationAndLeaderboard();
    }

    // Step 4: Generate report
    generateReport();

    console.log(chalk.bold.green('\n✅ Migration completed successfully!'));

    if (!DRY_RUN) {
      console.log(chalk.yellow('\n⚠️  Remember to:'));
      console.log('  1. Keep blob backups for 7 days');
      console.log('  2. Enable optimistic locking in the application');
      console.log('  3. Monitor performance metrics');
      console.log('  4. Run full E2E tests');
      console.log('  5. Update leaderboard queries to use Supabase');
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
  readTeamProgressFromBlobs,
  migrateProgressToSupabase,
  verifyMigrationAndLeaderboard,
  calculateProgressStats
};