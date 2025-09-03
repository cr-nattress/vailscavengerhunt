import { getStore } from '@netlify/blobs';

/**
 * DELETE /api/state-delete/:key
 * Deletes a key-value pair from Netlify Blobs
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

  if (event.httpMethod !== 'DELETE') {
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

    if (!key || key === 'state-delete') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Key parameter is required' })
      };
    }

    // Get the Netlify Blobs store
    const store = getStore({
      name: 'vail-hunt-state',
      consistency: 'strong'
    });

    // Check if key exists before deleting
    const existingValue = await store.get(key, { type: 'json' });
    
    if (existingValue === null) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          error: 'Key not found', 
          key 
        })
      };
    }

    // Delete the key
    await store.delete(key);

    console.log(`✅ Deleted key: ${key}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Value deleted successfully',
        key,
        timestamp: new Date().toISOString()
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