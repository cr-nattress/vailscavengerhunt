/**
 * Clear all hunt progress for a specific team
 *
 * Usage:
 *   node scripts/js/clear-team-progress.js <orgId> <teamId> <huntId> --yes
 *
 * Example:
 *   node scripts/js/clear-team-progress.js bhhs teacup fall-2025 --yes
 *
 * Requirements:
 *   - .env with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

function printUsageAndExit() {
  console.log('\nUsage:')
  console.log('  node scripts/js/clear-team-progress.js <orgId> <teamId> <huntId> --yes')
  console.log('\nExamples:')
  console.log('  node scripts/js/clear-team-progress.js bhhs teacup fall-2025 --yes')
  console.log('\nNotes:')
  console.log('  --yes is required to confirm deletion.')
  process.exit(1)
}

async function main() {
  const [orgId, teamId, huntId, confirmFlag] = process.argv.slice(2)

  if (!orgId || !teamId || !huntId) {
    console.error('❌ Missing arguments: orgId, teamId, huntId are required')
    printUsageAndExit()
  }

  if (confirmFlag !== '--yes') {
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

  console.log('\n🧹 Clearing progress for:')
  console.log(`  orgId:  ${orgId}`)
  console.log(`  teamId: ${teamId}`)
  console.log(`  huntId: ${huntId}`)

  // 1) Look up the team UUID
  console.log('\n🔎 Looking up team UUID...')
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('id')
    .eq('organization_id', orgId)
    .eq('team_id', teamId)
    .eq('hunt_id', huntId)
    .single()

  if (teamError || !team) {
    console.error('❌ Team lookup failed:', teamError?.message || 'Team not found')
    process.exit(1)
  }

  console.log('✅ Team UUID:', team.id)

  // 2) Delete progress rows for this team
  console.log('\n🗑️  Deleting rows from hunt_progress...')
  const { error: deleteError, count } = await supabase
    .from('hunt_progress')
    .delete({ count: 'exact' })
    .eq('team_id', team.id)

  if (deleteError) {
    console.error('❌ Failed to delete progress:', deleteError.message)
    process.exit(1)
  }

  console.log(`✅ Deleted ${count ?? 0} row(s) from hunt_progress for team ${teamId}`)

  console.log('\n🎉 Done.')
}

main().catch((err) => {
  console.error('❌ Unhandled error:', err)
  process.exit(1)
})
