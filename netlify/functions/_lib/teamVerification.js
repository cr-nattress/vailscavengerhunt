const crypto = require('crypto')
const { LockUtils } = require('./lockUtils')

/**
 * Team verification and lock management utilities
 */

/**
 * Verify a team code against the database
 */
async function verifyTeamCode(supabase, orgId, huntId, teamCode) {
  try {
    const normalizedCode = teamCode.trim().toUpperCase()

    // First try the team_codes table (same as team-verify endpoint)
    const { data: codeMapping, error: codeError } = await supabase
      .from('team_codes')
      .select(`
        code,
        team_id,
        is_active,
        teams!inner(
          team_id,
          display_name,
          organization_id,
          hunt_id
        )
      `)
      .eq('code', normalizedCode)
      .eq('is_active', true)
      .single()

    if (!codeError && codeMapping) {
      // Found in team_codes table
      return {
        success: true,
        teamId: codeMapping.teams.team_id,
        teamName: codeMapping.teams.display_name
      }
    }

    // Fallback to old hash-based lookup for backward compatibility
    const hashedCode = crypto
      .createHash('sha256')
      .update(teamCode.toLowerCase().trim())
      .digest('hex')

    // Look up team by hashed code
    const { data: team, error } = await supabase
      .from('teams')
      .select('id, name, organization_id, hunt_id')
      .eq('code_hash', hashedCode)
      .eq('organization_id', orgId)
      .eq('hunt_id', huntId)
      .eq('is_active', true)
      .single()

    if (error || !team) {
      console.log('[teamVerification] Team not found for code:', normalizedCode)
      return {
        success: false,
        error: 'Invalid team code'
      }
    }

    return {
      success: true,
      teamId: team.id,
      teamName: team.name
    }
  } catch (error) {
    console.error('[teamVerification] Error verifying team code:', error)
    return {
      success: false,
      error: 'Verification failed'
    }
  }
}

/**
 * Validate an existing team lock token
 */
async function validateTeamLock(supabase, lockToken) {
  try {
    // Parse the lock token
    const tokenParts = lockToken.split('.')
    if (tokenParts.length !== 2) {
      return null
    }

    const [teamId, tokenHash] = tokenParts

    // Look up the lock in the database
    const { data: lock, error } = await supabase
      .from('team_locks')
      .select('*')
      .eq('team_id', teamId)
      .eq('lock_token_hash', tokenHash)
      .eq('is_active', true)
      .single()

    if (error || !lock) {
      return null
    }

    // Check if lock has expired (24 hours)
    const lockAge = Date.now() - new Date(lock.created_at).getTime()
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours

    if (lockAge > maxAge) {
      // Mark as inactive
      await supabase
        .from('team_locks')
        .update({ is_active: false })
        .eq('id', lock.id)

      return null
    }

    // Get team info
    const { data: team } = await supabase
      .from('teams')
      .select('id, name')
      .eq('id', teamId)
      .single()

    if (!team) {
      return null
    }

    // Update last used timestamp
    await supabase
      .from('team_locks')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', lock.id)

    return {
      teamId: team.id,
      teamName: team.name,
      lockId: lock.id
    }
  } catch (error) {
    console.error('[teamVerification] Error validating lock token:', error)
    return null
  }
}

/**
 * Create a new team lock token
 */
async function createTeamLock(supabase, teamId, sessionId, deviceFingerprint) {
  try {
    // Generate JWT-based lock token (same as team-verify endpoint)
    const { token, expiresAt } = LockUtils.generateLockToken(teamId)

    // Optionally store device lock for conflict detection
    // (This is optional since team_locks table doesn't exist)
    // In the future, we could store this in a different table or use in-memory cache

    return token
  } catch (error) {
    console.error('[teamVerification] Error creating team lock:', error)
    return null
  }
}

/**
 * Revoke a team lock token
 */
async function revokeTeamLock(supabase, lockToken) {
  try {
    const tokenParts = lockToken.split('.')
    if (tokenParts.length !== 2) {
      return false
    }

    const [teamId, tokenHash] = tokenParts

    const { error } = await supabase
      .from('team_locks')
      .update({ is_active: false })
      .eq('team_id', teamId)
      .eq('lock_token_hash', tokenHash)

    return !error
  } catch (error) {
    console.error('[teamVerification] Error revoking lock:', error)
    return false
  }
}

module.exports = {
  verifyTeamCode,
  validateTeamLock,
  createTeamLock,
  revokeTeamLock
}