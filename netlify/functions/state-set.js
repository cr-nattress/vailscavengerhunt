import { getStore } from '@netlify/blobs';

/**
 * POST /api/state-set
 * Creates or updates a key-value pair in Netlify Blobs
 * Body: { key: string, value: any }
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

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse request body
    const { key, value } = JSON.parse(event.body || '{}');

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

    // Get the Netlify Blobs store
    const store = getStore({
      name: 'vail-hunt-state',
      consistency: 'strong'
    });

    // Check if key already exists
    const existingValue = await store.get(key, { type: 'json' });
    const isUpdate = existingValue !== null;

    // Set the value with metadata
    const dataToStore = {
      value,
      createdAt: isUpdate ? existingValue.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await store.setJSON(key, dataToStore);

    console.log(`✅ ${isUpdate ? 'Updated' : 'Created'} key: ${key}`);

    return {
      statusCode: isUpdate ? 200 : 201,
      headers,
      body: JSON.stringify({
        message: isUpdate ? 'Value updated successfully' : 'Value created successfully',
        key,
        value,
        action: isUpdate ? 'update' : 'create',
        timestamp: new Date().toISOString()
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
};