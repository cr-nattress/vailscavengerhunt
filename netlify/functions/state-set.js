const SupabaseStateStore = require('./_lib/supabaseStateStore');
const { withSentry } = require('./_lib/sentry')

/**
 * POST /state-set
 * Creates or updates a state value in Supabase
 * Body: { key: string, value: any, context: {}, type: string, ttlSeconds: number }
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

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse request body
    const { key, value, context: requestContext, type, ttlSeconds } = JSON.parse(event.body || '{}');

    if (!key) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Key is required in request body' })
      };
    }

    if (value === undefined) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Value is required in request body' })
      };
    }

    // Build context for state isolation
    const context = {
      organizationId: requestContext?.organizationId || null,
      teamId: requestContext?.teamId || null,
      userSessionId: requestContext?.userSessionId || null,
      huntId: requestContext?.huntId || null,
      stateType: type || 'session'
    };

    // Check if state already exists
    const existingValue = await SupabaseStateStore.get(key, context);
    const isUpdate = existingValue !== null;

    // Set the state value in Supabase
    const success = await SupabaseStateStore.set(key, value, context, ttlSeconds);

    if (!success) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to store state value' })
      };
    }

    console.log(`✅ ${isUpdate ? 'Updated' : 'Created'} state key: ${key} for context:`, context);

    return {
      statusCode: isUpdate ? 200 : 201,
      headers,
      body: JSON.stringify({
        success: true,
        key,
        value,
        context,
        type: context.stateType,
        action: isUpdate ? 'update' : 'create',
        stored_at: new Date().toISOString(),
        ttl_seconds: ttlSeconds || null
      })
    };

  } catch (error) {
    console.error('Error setting value:', error);
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