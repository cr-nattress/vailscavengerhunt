const { withSentry } = require('./_lib/sentry')
// Blobs removed for local/dev. Health will not attempt blob access.

exports.handler = withSentry(async (event, context) => {
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

  // Blob stores skipped in dev/no-blobs mode
  health.blobs.kv = false;
  health.blobs.huntData = false;

  health.checks.blobStoresAccessible = false;

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
});