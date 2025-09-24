const SupabaseStateStore = require('./_lib/supabaseStateStore');

/**
 * DELETE /state-delete?key=state-key&orgId=org1&teamId=team1
 * Deletes a state value from Supabase
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

  if (event.httpMethod !== 'DELETE') {
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

    // Check if state exists before deleting
    const existingValue = await SupabaseStateStore.get(key, context);

    if (existingValue === null) {
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

    // Delete the state
    const success = await SupabaseStateStore.delete(key, context);

    if (!success) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to delete state' })
      };
    }

    console.log(`✅ Deleted state key: ${key} for context:`, context);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        key,
        context,
        deleted_at: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Error deleting value:', error);
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