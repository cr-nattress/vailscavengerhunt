const { SupabaseKVStore } = require('./_lib/supabaseKVStore.js')

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  }

  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    }
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { key } = event.queryStringParameters || {}

    if (!key) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required parameter: key',
          usage: 'GET /kv-get-supabase?key=your-key'
        })
      }
    }

    console.log(`[kv-get-supabase] Retrieving key: ${key}`)

    const value = await SupabaseKVStore.get(key)

    if (value === null) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'Key not found',
          key
        })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        key,
        value,
        retrieved_at: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('[kv-get-supabase] Error:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    }
  }
}