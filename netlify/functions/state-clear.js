const SupabaseStateStore = require('./_lib/supabaseStateStore');

/**
 * POST /state-clear
 * Clears state data for a specific context
 * Body: { context: {}, type: string }
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

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse request body
    const { context: requestContext, type } = JSON.parse(event.body || '{}');

    // Build context for state isolation
    const context = {
      organizationId: requestContext?.organizationId || null,
      teamId: requestContext?.teamId || null,
      userSessionId: requestContext?.userSessionId || null,
      huntId: requestContext?.huntId || null
    };

    // Clear all state for the context
    const clearedCount = await SupabaseStateStore.clear(context, type);

    console.log(`⚠️ Cleared ${clearedCount} state entries for context:`, context, 'type:', type);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        cleared_count: clearedCount,
        context,
        type: type || 'all',
        cleared_at: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Error clearing state:', error);
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