import { getStore } from '@netlify/blobs';

/**
 * GET /api/state-list
 * Lists all keys in Netlify Blobs store with optional values
 * Query params: includeValues=true to include values
 */
export const handler = async (event, context) => {
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
    // Get the Netlify Blobs store
    const store = getStore({
      name: 'vail-hunt-state',
      consistency: 'strong'
    });

    // Parse query parameters
    const { includeValues } = event.queryStringParameters || {};

    // List all keys
    const { blobs } = await store.list();
    const keys = blobs.map(blob => blob.key);

    if (includeValues === 'true') {
      // Fetch all values
      const entries = {};
      
      for (const key of keys) {
        try {
          const data = await store.get(key, { type: 'json' });
          entries[key] = data ? data.value : null;
        } catch (error) {
          console.warn(`Failed to retrieve value for key ${key}:`, error);
          entries[key] = null;
        }
      }

      console.log(`✅ Listed ${keys.length} keys with values`);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          count: keys.length,
          data: entries,
          timestamp: new Date().toISOString()
        })
      };
    } else {
      console.log(`✅ Listed ${keys.length} keys`);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          count: keys.length,
          keys,
          timestamp: new Date().toISOString()
        })
      };
    }

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
};