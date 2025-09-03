import { getStore } from '@netlify/blobs';

/**
 * GET /api/state/:key
 * Retrieves a value by its key from Netlify Blobs
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
    // Extract key from path
    const pathParts = event.path.split('/');
    const key = pathParts[pathParts.length - 1];

    if (!key || key === 'state-get') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Key parameter is required' })
      };
    }

    // Get the Netlify Blobs store
    const store = getStore({
      name: 'vail-hunt-state',
      consistency: 'strong' // Ensures immediate consistency
    });

    // Retrieve the value
    const value = await store.get(key, { type: 'json' });

    if (value === null) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          error: 'Key not found', 
          key 
        })
      };
    }

    console.log(`✅ Retrieved key: ${key}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        key,
        value,
        timestamp: new Date().toISOString()
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