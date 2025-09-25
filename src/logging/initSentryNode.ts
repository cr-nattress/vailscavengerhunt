import * as Sentry from '@sentry/node'
import { createSentryPIIRedactor } from './piiRedaction.js'

// Module-level flag to prevent double initialization
let sentryInitialized = false

/**
 * Initialize Sentry for Node.js - always enabled
 * Only initializes once per process (guarded by module-level flag)
 */
export function maybeInitSentryNode(): boolean {
  // Guard against double initialization
  if (sentryInitialized) {
    return true
  }

  // Use environment DSN if available
  const dsn = process.env.SENTRY_DSN

  try {
    Sentry.init({
      dsn: dsn || false, // false disables sending but keeps API functional
      enabled: !!dsn, // Only enable if DSN is provided
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
      release: process.env.SENTRY_RELEASE,
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),

      integrations: [
        // Automatically capture unhandled exceptions and rejections
        // Note: nodeProfilingIntegration may not be available in all versions
      ],

      // Comprehensive PII redaction (US-004)
      beforeSend: createSentryPIIRedactor(),

      // Don't send default PII
      sendDefaultPii: false,
    })

    sentryInitialized = true
    console.info(dsn
      ? '[Sentry] Node client initialized successfully with DSN'
      : '[Sentry] Node client initialized in offline mode (no DSN)')
    return true
  } catch (error) {
    console.error('[Sentry] Failed to initialize Node client:', error)
    return false
  }
}

/**
 * Check if Sentry is initialized and ready
 */
export function isSentryNodeInitialized(): boolean {
  return sentryInitialized
}

/**
 * Capture exception with additional context
 */
export function captureSentryException(error: Error, context?: Record<string, any>): void {
  if (!sentryInitialized) {
    return
  }

  try {
    Sentry.captureException(error, {
      extra: context,
      tags: {
        ...(context?.component && { component: context.component }),
        ...(context?.action && { action: context.action }),
      }
    })
  } catch (captureError) {
    console.warn('[Sentry] Failed to capture exception:', captureError)
  }
}

/**
 * Add breadcrumb for server-side events
 */
export function addSentryBreadcrumb(message: string, category: string, data?: Record<string, any>): void {
  if (!sentryInitialized) {
    return
  }

  try {
    Sentry.addBreadcrumb({
      message,
      category,
      level: 'info',
      data,
      timestamp: Date.now() / 1000,
    })
  } catch (breadcrumbError) {
    console.warn('[Sentry] Failed to add breadcrumb:', breadcrumbError)
  }
}