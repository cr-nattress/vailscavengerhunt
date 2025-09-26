const { SupabaseKVStore } = require('./_lib/supabaseKVStore.js');
const { withSentry } = require('./_lib/sentry')

exports.handler = withSentry(async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request for CORS
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
    const { key, value } = JSON.parse(event.body || '{}');

    if (!key) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required parameter: key',
          usage: 'POST /kv-set with JSON body: {"key": "your-key", "value": "your-value"}'
        })
      };
    }

    if (value === undefined) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required parameter: value',
          usage: 'POST /kv-set with JSON body: {"key": "your-key", "value": "your-value"}'
        })
      };
    }

    console.log(`[kv-set] Setting key: ${key}`);

    const success = await SupabaseKVStore.set(key, value);

    if (!success) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Failed to store value',
          key
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        key,
        source: 'supabase',
        stored_at: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('[kv-set] Error:', error);

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