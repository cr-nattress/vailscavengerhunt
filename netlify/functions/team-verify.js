/**
 * Team verification Netlify Function
 * Handles team code validation and lock token issuance
 */
const { TeamStorage } = require('./_lib/teamStorage')
const { SupabaseTeamStorage } = require('./_lib/supabaseTeamStorage')
const { LockUtils } = require('./_lib/lockUtils')
const { TeamErrorHandler } = require('./_lib/teamErrors')
const { TeamLogger } = require('./_lib/teamLogger')

exports.handler = async (event, context) => {
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

    // Look up team code mapping (try Supabase first, fallback to blob storage)
    let mapping = null

    // Try Supabase first, but handle missing configuration gracefully
    try {
      mapping = await SupabaseTeamStorage.getTeamCodeMapping(normalizedCode)
    } catch (supabaseError) {
      console.log('[team-verify] Supabase not available, falling back to blob storage:', supabaseError.message)
    }

    // Fallback to blob storage if Supabase failed or returned no data
    if (!mapping) {
      mapping = await TeamStorage.getTeamCodeMapping(normalizedCode)
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

    // Ensure team data exists (try Supabase first, fallback to blob storage)
    let teamData = null

    // Try Supabase first, but handle missing configuration gracefully
    try {
      const supabaseResult = await SupabaseTeamStorage.getTeamData(mapping.teamId)
      teamData = supabaseResult.data
    } catch (supabaseError) {
      console.log('[team-verify] Supabase not available for team data, falling back to blob storage:', supabaseError.message)
    }

    // Fallback to blob storage if Supabase failed or returned no data
    if (!teamData) {
      const blobResult = await TeamStorage.getTeamData(mapping.teamId)
      teamData = blobResult.data
    }

    if (!teamData) {
      // Create team if mapping exists but team data doesn't
      let newTeam = null

      // Try Supabase first for team creation
      try {
        newTeam = await SupabaseTeamStorage.createTeam(mapping.teamId, mapping.teamName, mapping.organizationId, mapping.huntId)
      } catch (supabaseError) {
        console.log('[team-verify] Supabase not available for team creation:', supabaseError.message)
      }

      if (!newTeam) {
        TeamLogger.logVerificationAttempt(normalizedCode, 'error', mapping.teamId, 'Failed to create team')
        const { error, status } = TeamErrorHandler.storageError('Team creation failed')

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
}

/**
 * Check if device already has a lock for a different team
 */
async function checkDeviceLockConflict(deviceFingerprint, requestedTeamCode) {
  try {
    const { getStore } = require('@netlify/blobs')
    const store = getStore('device-locks')

    const lockData = await store.get(deviceFingerprint, { type: 'json' })
    if (!lockData) return null

    const now = Date.now()
    if (lockData.expiresAt <= now) {
      // Lock expired, clean it up
      await store.delete(deviceFingerprint)
      return null
    }

    // Check if it's for the same team (no conflict)
    // Try Supabase first, then blob storage for backward compatibility
    let requestedMapping = null
    try {
      const { SupabaseTeamStorage } = require('./_lib/supabaseTeamStorage')
      requestedMapping = await SupabaseTeamStorage.getTeamCodeMapping(requestedTeamCode)
    } catch (_) {
      // ignore and fallback
    }
    if (!requestedMapping) {
      requestedMapping = await TeamStorage.getTeamCodeMapping(requestedTeamCode)
    }
    if (requestedMapping && lockData.teamId === requestedMapping.teamId) {
      return null // Same team, no conflict
    }

    return {
      teamId: lockData.teamId,
      remainingTtl: Math.floor((lockData.expiresAt - now) / 1000)
    }
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
    const { getStore } = require('@netlify/blobs')
    const store = getStore('device-locks')

    await store.set(deviceFingerprint, JSON.stringify({
      teamId,
      expiresAt: expiresAt * 1000, // Convert to milliseconds
      createdAt: Date.now()
    }))
  } catch (error) {
    console.error('[team-verify] Failed to store device lock:', error)
    // Don't fail the verification if device lock storage fails
  }
}