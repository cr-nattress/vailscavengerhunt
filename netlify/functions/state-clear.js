import { getStore } from '@netlify/blobs';

/**
 * POST /api/state-clear
 * Clears all key-value pairs from Netlify Blobs store
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
    // Get the Netlify Blobs store
    const store = getStore({
      name: 'vail-hunt-state',
      consistency: 'strong'
    });

    // List all keys first
    const { blobs } = await store.list();
    const keys = blobs.map(blob => blob.key);
    const previousSize = keys.length;

    // Delete all keys
    const deletePromises = keys.map(key => store.delete(key));
    await Promise.all(deletePromises);

    console.log(`⚠️ Cleared all state (${previousSize} entries removed)`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'All state cleared',
        entriesCleared: previousSize,
        timestamp: new Date().toISOString()
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