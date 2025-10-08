/**
 * Centralized configuration for Netlify functions
 * Single source of truth for environment variables and public config
 */

/**
 * Get public configuration (safe to send to client)
 * This config is exposed via consolidated-active and login-initialize endpoints
 *
 * @returns {object} Public configuration object
 */
function getPublicConfig() {
  return {
    // API Configuration
    API_URL: process.env.API_URL || '',

    // Supabase Configuration
    SUPABASE_URL: process.env.SUPABASE_URL || '',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',

    // Cloudinary Configuration
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
    CLOUDINARY_UPLOAD_PRESET: process.env.CLOUDINARY_UPLOAD_PRESET || '',

    // Feature Flags
    USE_DUAL_WRITE: process.env.USE_DUAL_WRITE === 'true',
    USE_DB_SOURCE: process.env.USE_DB_SOURCE === 'true',
    DISABLE_ANIMATION: process.env.DISABLE_ANIMATION === 'true',

    // Application Settings
    ENABLE_TEAM_LOCK: process.env.ENABLE_TEAM_LOCK !== 'false', // Default true
    LOCK_TIMEOUT_MS: parseInt(process.env.LOCK_TIMEOUT_MS || '300000', 10), // 5 min default

    // Logging & Monitoring
    SENTRY_DSN: process.env.SENTRY_DSN || '',
    SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT || 'production',
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',

    // Image Upload Settings
    CLOUDINARY_IMAGE_WIDTH: parseInt(process.env.CLOUDINARY_IMAGE_WIDTH || '1600', 10),
    CLOUDINARY_IMAGE_HEIGHT: parseInt(process.env.CLOUDINARY_IMAGE_HEIGHT || '1600', 10),
    CLOUDINARY_IMAGE_QUALITY: process.env.CLOUDINARY_IMAGE_QUALITY || 'auto:good',
    CLOUDINARY_FETCH_FORMAT: process.env.CLOUDINARY_FETCH_FORMAT || 'auto',
    CLOUDINARY_CROP_MODE: process.env.CLOUDINARY_CROP_MODE || 'limit',

    // Environment
    NODE_ENV: process.env.NODE_ENV || 'production',
    NETLIFY_DEV: process.env.NETLIFY_DEV === 'true'
  }
}

/**
 * Get server-only configuration (contains secrets, never send to client)
 *
 * @returns {object} Server configuration object
 */
function getServerConfig() {
  return {
    // Supabase Service Role (admin access)
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

    // Cloudinary API Credentials
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',

    // Lock Secret
    LOCK_SECRET: process.env.LOCK_SECRET || 'default-secret-change-me',

    // Rate Limiting
    RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),

    // Retry Configuration
    RETRY_MAX_ATTEMPTS: parseInt(process.env.RETRY_MAX_ATTEMPTS || '3', 10),
    RETRY_DELAY_MS: parseInt(process.env.RETRY_DELAY_MS || '1000', 10),

    // Cache TTL (seconds)
    CACHE_LOCATIONS_TTL: parseInt(process.env.CACHE_LOCATIONS_TTL || '300', 10), // 5 min
    CACHE_SETTINGS_TTL: parseInt(process.env.CACHE_SETTINGS_TTL || '60', 10), // 1 min
    CACHE_SPONSORS_TTL: parseInt(process.env.CACHE_SPONSORS_TTL || '300', 10), // 5 min

    // Environment
    NODE_ENV: process.env.NODE_ENV || 'production',
    NETLIFY_DEV: process.env.NETLIFY_DEV === 'true'
  }
}

/**
 * Get combined configuration (for server use only)
 * Includes both public and server-only config
 *
 * @returns {object} Full configuration object
 */
function getFullConfig() {
  return {
    ...getPublicConfig(),
    ...getServerConfig()
  }
}

/**
 * Validate required environment variables
 * Throws error if critical variables are missing
 *
 * @throws {Error} If required environment variables are missing
 */
function validateRequiredEnvVars() {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET'
  ]

  const missing = required.filter(key => !process.env[key])

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file or Netlify environment variables.'
    )
  }
}

/**
 * Check if running in development mode
 *
 * @returns {boolean} True if in development
 */
function isDevelopment() {
  return process.env.NODE_ENV === 'development' || process.env.NETLIFY_DEV === 'true'
}

/**
 * Check if running in production mode
 *
 * @returns {boolean} True if in production
 */
function isProduction() {
  return process.env.NODE_ENV === 'production' && process.env.NETLIFY_DEV !== 'true'
}

/**
 * Get Cloudinary transformation config for image uploads
 *
 * @returns {object} Cloudinary transformation parameters
 */
function getCloudinaryTransformConfig() {
  return {
    quality: process.env.CLOUDINARY_IMAGE_QUALITY || 'auto:good',
    fetch_format: process.env.CLOUDINARY_FETCH_FORMAT || 'auto',
    width: parseInt(process.env.CLOUDINARY_IMAGE_WIDTH || '1600', 10),
    height: parseInt(process.env.CLOUDINARY_IMAGE_HEIGHT || '1600', 10),
    crop: process.env.CLOUDINARY_CROP_MODE || 'limit'
  }
}

/**
 * Get Cloudinary upload config (credentials + preset)
 *
 * @returns {object} Cloudinary upload configuration
 */
function getCloudinaryUploadConfig() {
  return {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET
  }
}

/**
 * Get team lock configuration
 *
 * @returns {object} Team lock settings
 */
function getTeamLockConfig() {
  return {
    enabled: process.env.ENABLE_TEAM_LOCK !== 'false',
    timeout: parseInt(process.env.LOCK_TIMEOUT_MS || '300000', 10),
    secret: process.env.LOCK_SECRET || 'default-secret-change-me'
  }
}

/**
 * Get logging configuration
 *
 * @returns {object} Logging settings
 */
function getLoggingConfig() {
  return {
    level: process.env.LOG_LEVEL || 'info',
    sentryDsn: process.env.SENTRY_DSN || '',
    sentryEnvironment: process.env.SENTRY_ENVIRONMENT || 'production',
    enableConsole: isDevelopment()
  }
}

// CommonJS exports
module.exports = {
  getPublicConfig,
  getServerConfig,
  getFullConfig,
  validateRequiredEnvVars,
  isDevelopment,
  isProduction,
  getCloudinaryTransformConfig,
  getCloudinaryUploadConfig,
  getTeamLockConfig,
  getLoggingConfig
}
