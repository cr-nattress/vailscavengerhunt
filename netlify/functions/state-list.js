const SupabaseStateStore = require('./_lib/supabaseStateStore');
const { withSentry } = require('./_lib/sentry')

/**
 * GET /state-list?orgId=org1&teamId=team1&type=session
 * Lists all state keys for a context with optional filtering
 * Query params: orgId, teamId, sessionId, type
 */
exports.handler = withSentry(async (event, context) => {
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
    // Parse query parameters
    const { orgId, teamId, sessionId, huntId, type } = event.queryStringParameters || {};

    // Build context for state isolation
    const context = {
      organizationId: orgId || null,
      teamId: teamId || null,
      userSessionId: sessionId || null,
      huntId: huntId || null
    };

    // List all state keys for the context
    const keys = await SupabaseStateStore.list(context, type);

    console.log(`✅ Listed ${keys.length} state keys for context:`, context, 'type:', type);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        keys,
        count: keys.length,
        context,
        type: type || 'all',
        retrieved_at: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Error listing keys:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      })
    };
  }
});