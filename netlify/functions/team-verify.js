/**
 * POST /api/team-verify
 * 
 * Team verification endpoint that validates team codes and issues JWT tokens.
 * Implements device locking to prevent users from joining multiple teams.
 * 
 * Request:  {
 *   code: string (team verification code, e.g., 'team-alpha-2025'),
 *   deviceHint: string (optional device fingerprint for locking)
 * }
 * 
 * Response: {
 *   success: true,
 *   teamId: string (UUID),
 *   teamName: string,
 *   token: string (JWT token for authentication),
 *   organization: Organization,
 *   hunt: Hunt
 * }
 * 
 * Errors:
 *   400 - Missing or invalid team code
 *   401 - Code not found, expired, or inactive
 *   403 - Device already locked to different team
 *   500 - Database query failed or token generation failed
 * 
 * Side effects:
 *   - Creates device_locks record (prevents multi-team joining)
 *   - Creates sessions record (tracks team sessions)
 *   - Generates JWT token (24h expiration)
 * 
 * @ai-purpose: Team authentication and device locking; gateway to app access
 * @ai-dont: Don't bypass device locking; it prevents data corruption from multi-team participation
 * @ai-related-files: /src/features/teamLock/useTeamLock.ts, /src/services/TeamLockService.ts
 */
const { SupabaseTeamStorage } = require('./_lib/supabaseTeamStorage')
const { LockUtils } = require('./_lib/lockUtils')
const { TeamErrorHandler } = require('./_lib/teamErrors')
const { TeamLogger } = require('./_lib/teamLogger')
const { withSentry } = require('./_lib/sentry')

exports.handler = withSentry(async (event, context) => {
  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    }
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Parse and validate request
    const body = JSON.parse(event.body || '{}')
    const { code, deviceHint } = body

    if (!code || typeof code !== 'string') {
      const { error, status } = TeamErrorHandler.createError(
        'INVALID_REQUEST',
        'Team code is required',
        400
      )

      return {
        statusCode: status,
        headers,
        body: JSON.stringify(error)
      }
    }

    const normalizedCode = code.trim().toUpperCase()
    const userAgent = event.headers['user-agent'] || ''
    const ip = event.headers['x-forwarded-for']?.split(',')[0] || 'unknown'

    // Generate device fingerprint
    const deviceFingerprint = LockUtils.generateDeviceHint(userAgent, ip)

    // Check for existing lock conflicts
    const existingLock = await checkDeviceLockConflict(deviceFingerprint, normalizedCode)
    if (existingLock) {
      TeamLogger.logVerificationAttempt(normalizedCode, 'conflict', existingLock.teamId)
      const { error, status } = TeamErrorHandler.teamLockConflict(existingLock.remainingTtl)

      return {
        statusCode: status,
        headers,
        body: JSON.stringify(error)
      }
    }

    // Look up team code mapping from Supabase
    let mapping = null

    try {
      mapping = await SupabaseTeamStorage.getTeamCodeMapping(normalizedCode)
    } catch (supabaseError) {
      console.error('[team-verify] Supabase error:', supabaseError)
      const { error, status } = TeamErrorHandler.storageError(supabaseError.message)

      return {
        statusCode: status,
        headers,
        body: JSON.stringify(error)
      }
    }

    if (!mapping || !mapping.isActive) {
      TeamLogger.logVerificationAttempt(normalizedCode, 'invalid_code')
      const { error, status } = TeamErrorHandler.teamCodeInvalid()

      return {
        statusCode: status,
        headers,
        body: JSON.stringify(error)
      }
    }

    // Ensure team data exists from Supabase
    let teamData = null

    try {
      const supabaseResult = await SupabaseTeamStorage.getTeamData(mapping.teamId)
      teamData = supabaseResult.data
    } catch (supabaseError) {
      console.error('[team-verify] Supabase error for team data:', supabaseError)
      const { error, status } = TeamErrorHandler.storageError(supabaseError.message)

      return {
        statusCode: status,
        headers,
        body: JSON.stringify(error)
      }
    }

    if (!teamData) {
      // Create team if mapping exists but team data doesn't
      try {
        const newTeam = await SupabaseTeamStorage.createTeam(mapping.teamId, mapping.teamName, mapping.organizationId, mapping.huntId)
        if (!newTeam) {
          throw new Error('Team creation returned null')
        }
        teamData = newTeam
      } catch (supabaseError) {
        TeamLogger.logVerificationAttempt(normalizedCode, 'error', mapping.teamId, 'Failed to create team')
        console.error('[team-verify] Failed to create team:', supabaseError)
        const { error, status } = TeamErrorHandler.storageError('Team creation failed: ' + supabaseError.message)

        return {
          statusCode: status,
          headers,
          body: JSON.stringify(error)
        }
      }
    }

    // Generate lock token
    const { token, expiresAt } = LockUtils.generateLockToken(mapping.teamId)
    const ttlSeconds = Math.floor((expiresAt * 1000 - Date.now()) / 1000)

    // Store device lock to prevent conflicts
    await storeDeviceLock(deviceFingerprint, mapping.teamId, expiresAt)

    // Log successful verification
    TeamLogger.logVerificationAttempt(normalizedCode, 'success', mapping.teamId)
    TeamLogger.logLockOperation('issued', mapping.teamId, { deviceFingerprint })

    // Return successful response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        teamId: mapping.teamId,
        teamName: mapping.teamName,
        lockToken: token,
        ttlSeconds
      })
    }

  } catch (error) {
    console.error('[team-verify] Unexpected error:', error)

    const { error: errorResponse, status } = TeamErrorHandler.storageError(error.message)
    return {
      statusCode: status,
      headers,
      body: JSON.stringify(errorResponse)
    }
  }
})

/**
 * Check if device already has a lock for a different team
 */
async function checkDeviceLockConflict(deviceFingerprint, requestedTeamCode) {
  try {
    // Get the requested team mapping first
    let requestedMapping = null
    try {
      const { SupabaseTeamStorage } = require('./_lib/supabaseTeamStorage')
      requestedMapping = await SupabaseTeamStorage.getTeamCodeMapping(requestedTeamCode)
    } catch (error) {
      console.error('[team-verify] Error getting team code mapping in lock check:', error)
    }

    if (!requestedMapping) {
      return null // Can't verify without mapping
    }

    // Use Supabase for device locks
    const { SupabaseDeviceLocks } = require('./_lib/supabaseDeviceLocks')
    return await SupabaseDeviceLocks.checkConflict(deviceFingerprint, requestedMapping.teamId)
  } catch (error) {
    console.error('[team-verify] Failed to check device lock:', error)
    return null // Allow on error to avoid blocking legitimate users
  }
}

/**
 * Store device lock to prevent multi-team participation
 */
async function storeDeviceLock(deviceFingerprint, teamId, expiresAt) {
  try {
    // Use Supabase for device locks
    const { SupabaseDeviceLocks } = require('./_lib/supabaseDeviceLocks')
    await SupabaseDeviceLocks.storeLock(deviceFingerprint, teamId, expiresAt)
  } catch (error) {
    console.error('[team-verify] Failed to store device lock:', error)
    // Don't fail the verification if device lock storage fails
  }
}