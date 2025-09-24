const SupabaseStateStore = require('./_lib/supabaseStateStore');

/**
 * GET /state-get?key=state-key&orgId=org1&teamId=team1&sessionId=session-123
 * Retrieves a state value by its key from Supabase
 */
exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Extract parameters from query string
    const { key, orgId, teamId, sessionId, huntId } = event.queryStringParameters || {};

    if (!key) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Key parameter is required' })
      };
    }

    // Build context for state isolation
    const context = {
      organizationId: orgId || null,
      teamId: teamId || null,
      userSessionId: sessionId || null,
      huntId: huntId || null
    };

    // Retrieve the value from Supabase
    const value = await SupabaseStateStore.get(key, context);

    if (value === null) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'State not found',
          key,
          context
        })
      };
    }

    console.log(`✅ Retrieved state key: ${key} for context:`, context);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        key,
        value,
        context,
        retrieved_at: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Error retrieving value:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      })
    };
  }
};