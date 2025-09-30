/**
 * Environment variable validation and typed exports using Zod
 * 
 * This file centralizes all environment variable access with runtime validation.
 * All env vars are validated on app startup to fail fast if misconfigured.
 * 
 * @ai-purpose: Type-safe environment configuration with Zod validation
 * @ai-dont: Don't access import.meta.env directly; always use exports from this file
 * @ai-related-files: /vite.config.js, /.env, /netlify.toml
 * @stable
 */
import { z } from 'zod'

// ============================================================================
// SCHEMA DEFINITIONS
// ============================================================================

/**
 * Client-side environment variables (VITE_ prefix)
 * These are embedded in the client bundle and publicly accessible
 */
const clientEnvSchema = z.object({
  // Sentry Configuration (Optional - for error tracking)
  // Enable Sentry error tracking and performance monitoring
  VITE_ENABLE_SENTRY: z.string().optional().default('false'),
  
  // Sentry DSN - Data Source Name for browser error reporting
  // Format: https://PUBLIC_KEY@o123456.ingest.sentry.io/PROJECT_ID
  VITE_SENTRY_DSN: z.string().url().optional(),
  
  // Environment name for Sentry context (development, staging, production)
  VITE_SENTRY_ENVIRONMENT: z.string().optional().default('development'),
  
  // Release version for Sentry tracking (e.g., 1.0.0, git SHA)
  VITE_SENTRY_RELEASE: z.string().optional(),
  
  // Traces sample rate (0.0 to 1.0) - percentage of transactions to capture
  // Lower values reduce overhead; 0.1 = 10% sampling
  VITE_SENTRY_TRACES_SAMPLE_RATE: z.string().optional().default('0.1'),
  
  // API Configuration (Optional overrides)
  // Base URL for API requests - overrides auto-detection
  // Must not include trailing slash
  VITE_API_BASE: z.string().url().optional(),
  
  // Force Netlify API usage (true/false) - useful for local dev against deployed functions
  VITE_USE_NETLIFY_API: z.string().optional().default('false'),
})

/**
 * Server-side environment variables (no VITE_ prefix)
 * These are only available in Netlify Functions and never exposed to client
 */
const serverEnvSchema = z.object({
  // Supabase Configuration (Required)
  // Supabase project URL - found in project settings
  // Format: https://your-project.supabase.co
  SUPABASE_URL: z.string().url(),
  
  // Supabase service role key - grants full database access (keep secret!)
  // Used only in backend functions, never exposed to client
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  
  // Cloudinary Configuration (Required for photo uploads)
  // Cloudinary cloud name - found in Cloudinary dashboard
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  
  // Cloudinary API key for authenticated requests
  CLOUDINARY_API_KEY: z.string().min(1),
  
  // Cloudinary API secret (keep secret!)
  CLOUDINARY_API_SECRET: z.string().min(1),
  
  // Sentry Configuration (Optional - server-side error tracking)
  // Sentry DSN for Node.js error reporting
  SENTRY_DSN: z.string().url().optional(),
  
  // Environment name for server-side Sentry context
  SENTRY_ENVIRONMENT: z.string().optional().default('development'),
  
  // Release version for server-side Sentry tracking
  SENTRY_RELEASE: z.string().optional(),
  
  // Traces sample rate for server-side performance monitoring
  SENTRY_TRACES_SAMPLE_RATE: z.string().optional().default('0.1'),
  
  // Sentry auth token for uploading source maps (build-time only)
  SENTRY_AUTH_TOKEN: z.string().optional(),
  
  // Sentry organization slug (for source map uploads)
  SENTRY_ORG: z.string().optional(),
  
  // Sentry project slug (for source map uploads)
  SENTRY_PROJECT: z.string().optional(),
  
  // Development Server Configuration (Optional)
  // Port for Express dev server (default: 3001)
  PORT: z.string().optional().default('3001'),
})

// ============================================================================
// VALIDATION & PARSING
// ============================================================================

/**
 * Parse and validate client environment variables
 * Runs in browser context; uses import.meta.env
 */
function parseClientEnv() {
  const env = typeof window !== 'undefined' 
    ? (import.meta as any)?.env || {}
    : {}
  
  try {
    return clientEnvSchema.parse(env)
  } catch (error) {
    console.error('❌ Client environment validation failed:', error)
    throw new Error('Invalid client environment configuration')
  }
}

/**
 * Parse and validate server environment variables
 * Runs in Node.js context (Netlify Functions); uses process.env
 * 
 * Note: This validation is lenient for client-side imports.
 * Server functions should call validateServerEnv() explicitly.
 */
function parseServerEnv() {
  // In browser context, return empty object (server vars not accessible)
  if (typeof window !== 'undefined') {
    return {} as z.infer<typeof serverEnvSchema>
  }
  
  // In Node.js context, validate process.env
  try {
    return serverEnvSchema.parse(process.env)
  } catch (error) {
    console.error('❌ Server environment validation failed:', error)
    throw new Error('Invalid server environment configuration')
  }
}

/**
 * Explicit server environment validation
 * Call this at the start of Netlify Functions to fail fast
 */
export function validateServerEnv(): z.infer<typeof serverEnvSchema> {
  if (typeof window !== 'undefined') {
    throw new Error('validateServerEnv() must only be called in server context')
  }
  return serverEnvSchema.parse(process.env)
}

// ============================================================================
// TYPED EXPORTS
// ============================================================================

// Parse environments on module load
const clientEnv = parseClientEnv()
const serverEnv = parseServerEnv()

// Client Environment Exports (safe to use in browser)
export const ENABLE_SENTRY = clientEnv.VITE_ENABLE_SENTRY === 'true'
export const SENTRY_DSN_CLIENT = clientEnv.VITE_SENTRY_DSN
export const SENTRY_ENVIRONMENT_CLIENT = clientEnv.VITE_SENTRY_ENVIRONMENT
export const SENTRY_RELEASE_CLIENT = clientEnv.VITE_SENTRY_RELEASE
export const SENTRY_TRACES_SAMPLE_RATE_CLIENT = parseFloat(clientEnv.VITE_SENTRY_TRACES_SAMPLE_RATE)
export const API_BASE_OVERRIDE = clientEnv.VITE_API_BASE
export const USE_NETLIFY_API = clientEnv.VITE_USE_NETLIFY_API === 'true'

// Server Environment Exports (only available in Netlify Functions)
export const SUPABASE_URL = serverEnv.SUPABASE_URL
export const SUPABASE_SERVICE_ROLE_KEY = serverEnv.SUPABASE_SERVICE_ROLE_KEY
export const CLOUDINARY_CLOUD_NAME = serverEnv.CLOUDINARY_CLOUD_NAME
export const CLOUDINARY_API_KEY = serverEnv.CLOUDINARY_API_KEY
export const CLOUDINARY_API_SECRET = serverEnv.CLOUDINARY_API_SECRET
export const SENTRY_DSN_SERVER = serverEnv.SENTRY_DSN
export const SENTRY_ENVIRONMENT_SERVER = serverEnv.SENTRY_ENVIRONMENT
export const SENTRY_RELEASE_SERVER = serverEnv.SENTRY_RELEASE
export const SENTRY_TRACES_SAMPLE_RATE_SERVER = serverEnv.SENTRY_TRACES_SAMPLE_RATE 
  ? parseFloat(serverEnv.SENTRY_TRACES_SAMPLE_RATE)
  : 0.1
export const SENTRY_AUTH_TOKEN = serverEnv.SENTRY_AUTH_TOKEN
export const SENTRY_ORG = serverEnv.SENTRY_ORG
export const SENTRY_PROJECT = serverEnv.SENTRY_PROJECT
export const PORT = parseInt(serverEnv.PORT || '3001', 10)

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if running in production environment
 */
export function isProduction(): boolean {
  return SENTRY_ENVIRONMENT_CLIENT === 'production' || 
         SENTRY_ENVIRONMENT_SERVER === 'production'
}

/**
 * Check if running in development environment
 */
export function isDevelopment(): boolean {
  return SENTRY_ENVIRONMENT_CLIENT === 'development' || 
         SENTRY_ENVIRONMENT_SERVER === 'development'
}

/**
 * Get environment name (client or server context)
 */
export function getEnvironment(): string {
  return typeof window !== 'undefined'
    ? SENTRY_ENVIRONMENT_CLIENT
    : SENTRY_ENVIRONMENT_SERVER
}

/**
 * Debug helper: log current environment configuration (redacts secrets)
 */
export function logEnvironmentInfo(): void {
  if (typeof window !== 'undefined') {
    console.log('🌍 Client Environment:', {
      sentryEnabled: ENABLE_SENTRY,
      sentryDsn: SENTRY_DSN_CLIENT ? '***configured***' : 'not set',
      environment: SENTRY_ENVIRONMENT_CLIENT,
      release: SENTRY_RELEASE_CLIENT || 'not set',
      apiBaseOverride: API_BASE_OVERRIDE || 'auto-detect',
      useNetlifyApi: USE_NETLIFY_API,
    })
  } else {
    console.log('🌍 Server Environment:', {
      supabaseUrl: SUPABASE_URL,
      cloudinaryCloud: CLOUDINARY_CLOUD_NAME,
      sentryDsn: SENTRY_DSN_SERVER ? '***configured***' : 'not set',
      environment: SENTRY_ENVIRONMENT_SERVER,
      port: PORT,
    })
  }
}
