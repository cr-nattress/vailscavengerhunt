const { getStore } = require('@netlify/blobs');

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow GET
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      isNetlify: !!process.env.NETLIFY,
      deployId: process.env.DEPLOY_ID || 'local'
    },
    cloudinary: {
      cloudNamePresent: !!process.env.CLOUDINARY_CLOUD_NAME,
      apiKeyPresent: !!process.env.CLOUDINARY_API_KEY,
      apiSecretPresent: !!process.env.CLOUDINARY_API_SECRET,
      uploadFolderPresent: !!process.env.CLOUDINARY_UPLOAD_FOLDER
    },
    blobs: {
      kv: false,
      huntData: false
    },
    checks: {
      cloudinaryConfigured: false,
      blobStoresAccessible: false
    }
  };

  // Check Cloudinary configuration
  health.checks.cloudinaryConfigured =
    health.cloudinary.cloudNamePresent &&
    health.cloudinary.apiKeyPresent &&
    health.cloudinary.apiSecretPresent;

  // Check blob store accessibility
  try {
    // Try to access kv store
    const kvStore = getStore({ name: 'kv' });
    if (kvStore) {
      health.blobs.kv = true;
      // Try a simple operation to verify access
      try {
        await kvStore.get('health-check-' + Date.now());
        // If no error, store is accessible
      } catch (e) {
        // Expected - key doesn't exist, but store is accessible
        if (!e.message.includes('not found')) {
          health.blobs.kv = false;
        }
      }
    }
  } catch (error) {
    console.error('Failed to access kv store:', error.message);
    health.blobs.kv = false;
  }

  try {
    // Try to access hunt-data store
    const huntDataStore = getStore({ name: 'hunt-data' });
    if (huntDataStore) {
      health.blobs.huntData = true;
      // Try a simple operation to verify access
      try {
        await huntDataStore.get('health-check-' + Date.now());
        // If no error, store is accessible
      } catch (e) {
        // Expected - key doesn't exist, but store is accessible
        if (!e.message.includes('not found')) {
          health.blobs.huntData = false;
        }
      }
    }
  } catch (error) {
    console.error('Failed to access hunt-data store:', error.message);
    health.blobs.huntData = false;
  }

  health.checks.blobStoresAccessible = health.blobs.kv && health.blobs.huntData;

  // Overall health status
  if (!health.checks.cloudinaryConfigured || !health.checks.blobStoresAccessible) {
    health.status = 'degraded';
  }

  // Add warnings for missing components
  const warnings = [];
  if (!health.checks.cloudinaryConfigured) {
    warnings.push('Cloudinary not fully configured - photo uploads will fail');
  }
  if (!health.blobs.kv) {
    warnings.push('KV blob store not accessible - state operations may fail');
  }
  if (!health.blobs.huntData) {
    warnings.push('Hunt data blob store not accessible - progress tracking may fail');
  }

  if (warnings.length > 0) {
    health.warnings = warnings;
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(health, null, 2)
  };
};