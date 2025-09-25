/**
 * Team current context Netlify Function
 * Returns current team information based on lock token
 */
const { LockUtils } = require('./_lib/lockUtils')
const { TeamStorage } = require('./_lib/teamStorage')
const { TeamErrorHandler } = require('./_lib/teamErrors')
const { SupabaseTeamStorage } = require('./_lib/supabaseTeamStorage')

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Team-Lock',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  }

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    }
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Get lock token from header
    const lockToken = event.headers['x-team-lock']
    if (!lockToken) {
      const { error, status } = TeamErrorHandler.invalidToken()

      return {
        statusCode: status,
        headers,
        body: JSON.stringify(error)
      }
    }

    // Verify lock token
    const tokenData = LockUtils.verifyLockToken(lockToken)
    if (!tokenData) {
      const { error, status } = TeamErrorHandler.invalidToken()

      return {
        statusCode: status,
        headers,
        body: JSON.stringify(error)
      }
    }

    // Check if token is expired
    if (LockUtils.isTokenExpired(tokenData.exp)) {
      const { error, status } = TeamErrorHandler.teamLockExpired()

      return {
        statusCode: status,
        headers,
        body: JSON.stringify(error)
      }
    }

    // Get team data (prefer Supabase, fallback to blob storage)
    let teamData = null

    // Try Supabase first, but handle missing configuration gracefully
    try {
      const supabaseResult = await SupabaseTeamStorage.getTeamData(tokenData.teamId)
      teamData = supabaseResult.data
    } catch (supabaseError) {
      console.log('[team-current] Supabase not available, falling back to blob storage:', supabaseError.message)
    }

    // Fall back to blob storage if Supabase failed or returned no data
    if (!teamData) {
      try {
        const blobResult = await TeamStorage.getTeamData(tokenData.teamId)
        teamData = blobResult.data
      } catch (blobError) {
        console.error('[team-current] Blob storage error:', blobError)
      }
    }

    if (!teamData) {
      const { error, status } = TeamErrorHandler.storageError('Team data not found')

      return {
        statusCode: status,
        headers,
        body: JSON.stringify(error)
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        teamId: teamData.teamId,
        teamName: teamData.name
      })
    }

  } catch (error) {
    console.error('[team-current] Unexpected error:', error)

    const { error: errorResponse, status } = TeamErrorHandler.storageError(error.message)
    return {
      statusCode: status,
      headers,
      body: JSON.stringify(errorResponse)
    }
  }
}