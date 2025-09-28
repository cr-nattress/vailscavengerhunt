/**
 * Clear hunt progress for ALL teams in an org + hunt
 *
 * Usage:
 *   node scripts/js/clear-all-team-progress.js <orgId> <huntId> --yes [--dry-run]
 *
 * Examples:
 *   node scripts/js/clear-all-team-progress.js bhhs fall-2025 --yes
 *   node scripts/js/clear-all-team-progress.js bhhs fall-2025 --yes --dry-run
 *
 * Requirements:
 *   - .env with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

function printUsageAndExit() {
  console.log('\nUsage:')
  console.log('  node scripts/js/clear-all-team-progress.js <orgId> <huntId> --yes [--dry-run]')
  console.log('\nExamples:')
  console.log('  node scripts/js/clear-all-team-progress.js bhhs fall-2025 --yes')
  console.log('  node scripts/js/clear-all-team-progress.js bhhs fall-2025 --yes --dry-run')
  console.log('\nNotes:')
  console.log('  --yes is required to confirm deletion.')
  console.log('  --dry-run will not delete anything and only reports counts.')
  process.exit(1)
}

function parseArgs() {
  const args = process.argv.slice(2)
  const [orgId, huntId, ...flags] = args
  const options = new Set(flags)
  return { orgId, huntId, yes: options.has('--yes'), dryRun: options.has('--dry-run') }
}

async function main() {
  const { orgId, huntId, yes, dryRun } = parseArgs()

  if (!orgId || !huntId) {
    console.error('❌ Missing arguments: orgId and huntId are required')
    printUsageAndExit()
  }

  if (!yes) {
    console.error('❌ Refusing to proceed without --yes confirmation flag')
    printUsageAndExit()
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment')
    console.error('   Ensure these are set in your .env file.')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  console.log('\n🧹 Clearing progress for ALL teams:')
  console.log(`  orgId:  ${orgId}`)
  console.log(`  huntId: ${huntId}`)
  if (dryRun) console.log('  mode:   DRY RUN (no changes will be made)')

  // 1) Fetch all team UUIDs for this org + hunt
  console.log('\n🔎 Fetching teams...')
  const { data: teams, error: teamError } = await supabase
    .from('teams')
    .select('id, team_id')
    .eq('organization_id', orgId)
    .eq('hunt_id', huntId)

  if (teamError) {
    console.error('❌ Team fetch failed:', teamError.message)
    process.exit(1)
  }

  if (!teams || teams.length === 0) {
    console.log('ℹ️  No teams found for the specified org/hunt. Nothing to do.')
    process.exit(0)
  }

  const teamIds = teams.map((t) => t.id)
  console.log(`✅ Found ${teams.length} team(s).`)

  // 2) If dry-run, count how many progress rows would be deleted
  if (dryRun) {
    console.log('\n🧪 DRY RUN: Counting rows that would be deleted...')
    const { error: countError, count } = await supabase
      .from('hunt_progress')
      .select('*', { head: true, count: 'exact' })
      .in('team_id', teamIds)

    if (countError) {
      console.error('❌ Failed to count progress rows:', countError.message)
      process.exit(1)
    }

    console.log(`🔎 Would delete ${count ?? 0} row(s) from hunt_progress across ${teams.length} team(s).`)
    console.log('\n🎯 DRY RUN complete. No changes were made.')
    process.exit(0)
  }

  // 3) Delete progress rows for these teams
  console.log('\n🗑️  Deleting rows from hunt_progress for all selected teams...')
  const { error: deleteError, count } = await supabase
    .from('hunt_progress')
    .delete({ count: 'exact' })
    .in('team_id', teamIds)

  if (deleteError) {
    console.error('❌ Failed to delete progress:', deleteError.message)
    process.exit(1)
  }

  console.log(`✅ Deleted ${count ?? 0} row(s) from hunt_progress across ${teams.length} team(s).`)

  // Optional: list the human team_ids impacted
  const humanTeamIds = teams.map((t) => t.team_id).filter(Boolean)
  if (humanTeamIds.length) {
    console.log('👥 Teams impacted:', humanTeamIds.join(', '))
  }

  console.log('\n🎉 Done.')
}

main().catch((err) => {
  console.error('❌ Unhandled error:', err)
  process.exit(1)
})
