/**
 * Team setup utility function for development
 * Creates test team code mappings
 */
const { TeamStorage } = require('./_lib/teamStorage')

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
    // Create test team mappings
    const testMappings = [
      {
        partitionKey: 'team',
        rowKey: 'ALPHA01',
        teamId: 'TEAM_alpha_001',
        teamName: 'Team Alpha',
        isActive: true,
        createdAt: new Date().toISOString(),
        eventId: 'vail-hunt-2024'
      },
      {
        partitionKey: 'team',
        rowKey: 'BETA02',
        teamId: 'TEAM_beta_002',
        teamName: 'Team Beta',
        isActive: true,
        createdAt: new Date().toISOString(),
        eventId: 'vail-hunt-2024'
      },
      {
        partitionKey: 'team',
        rowKey: 'GAMMA03',
        teamId: 'TEAM_gamma_003',
        teamName: 'Team Gamma',
        isActive: true,
        createdAt: new Date().toISOString(),
        eventId: 'vail-hunt-2024'
      }
    ]

    const results = []
    for (const mapping of testMappings) {
      const success = await TeamStorage.setTeamCodeMapping(mapping)
      results.push({
        teamCode: mapping.rowKey,
        teamName: mapping.teamName,
        success
      })
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Test team mappings created',
        results
      })
    }

  } catch (error) {
    console.error('[team-setup] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}