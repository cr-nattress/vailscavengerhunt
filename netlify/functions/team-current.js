/**
 * Team current context Netlify Function
 * Returns current team information based on lock token
 */
const { LockUtils } = require('./_lib/lockUtils')
const { TeamErrorHandler } = require('./_lib/teamErrors')
const { SupabaseTeamStorage } = require('./_lib/supabaseTeamStorage')
const { withSentry } = require('./_lib/sentry')

exports.handler = withSentry(async (event, context) => {
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

    // Get team data from Supabase
    let teamData = null

    try {
      const supabaseResult = await SupabaseTeamStorage.getTeamData(tokenData.teamId)
      teamData = supabaseResult.data
    } catch (supabaseError) {
      console.error('[team-current] Supabase error:', supabaseError)
      const { error, status } = TeamErrorHandler.storageError(supabaseError.message)

      return {
        statusCode: status,
        headers,
        body: JSON.stringify(error)
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
})