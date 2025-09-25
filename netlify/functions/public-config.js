/**
 * Public configuration endpoint for client
 * Returns SAFE, non-secret environment values for the browser
 */

exports.handler = async () => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  }

  // Only expose NON-SECRET values needed by the client
  const body = {
    API_URL: process.env.API_URL || '',
    SUPABASE_URL: process.env.SUPABASE_URL || '',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
    SENTRY_DSN: process.env.SENTRY_DSN || '',
    SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT || '',
    SENTRY_RELEASE: process.env.SENTRY_RELEASE || '',

    // Feature flags and client settings
    SPONSOR_CARD_ENABLED: process.env.SPONSOR_CARD_ENABLED === 'true',
    MAX_UPLOAD_BYTES: Number(process.env.MAX_UPLOAD_BYTES || '10485760'),
    ALLOW_LARGE_UPLOADS: process.env.ALLOW_LARGE_UPLOADS === 'true',
    ENABLE_UNSIGNED_UPLOADS: process.env.ENABLE_UNSIGNED_UPLOADS === 'true',
    DISABLE_CLIENT_RESIZE: process.env.DISABLE_CLIENT_RESIZE === 'true',

    // Cloudinary unsigned upload (safe to expose)
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
    CLOUDINARY_UNSIGNED_PRESET: process.env.CLOUDINARY_UNSIGNED_PRESET || '',
    CLOUDINARY_UPLOAD_FOLDER: process.env.CLOUDINARY_UPLOAD_FOLDER || 'scavenger/entries'
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(body)
  }
}
