const { SupabaseKVStore } = require('./_lib/supabaseKVStore.js');
const { withSentry } = require('./_lib/sentry')

exports.handler = withSentry(async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { key } = event.queryStringParameters || {};

    if (!key) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required parameter: key',
          usage: 'GET /kv-get?key=your-key'
        })
      };
    }

    console.log(`[kv-get] Retrieving key: ${key}`);

    // Try Supabase first (new storage system)
    const supabaseValue = await SupabaseKVStore.get(key);

    if (supabaseValue !== null) {
      console.log(`[kv-get] Found in Supabase: ${key}`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          key,
          value: supabaseValue,
          source: 'supabase',
          retrieved_at: new Date().toISOString()
        })
      };
    }

    // If not found in Supabase, return 404
    console.log(`[kv-get] Key not found in Supabase: ${key}`);
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        error: 'Key not found',
        key,
        source: 'supabase'
      })
    };

  } catch (error) {
    console.error('[kv-get] Error:', error);

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