import * as Sentry from '@sentry/react'
import { createSentryPIIRedactor } from './piiRedaction.js'

/**
 * Initialize Sentry for browser - always enabled
 */
export function maybeInitSentryBrowser(): boolean {
  // Use environment DSN if available
  const dsn = import.meta.env.VITE_SENTRY_DSN

  try {
    // Initialize Sentry with or without DSN
    // When DSN is not provided, Sentry runs in "noop" mode
    Sentry.init({
      dsn: dsn || false, // false disables sending but keeps API functional
      enabled: !!dsn, // Only enable if DSN is provided
      environment: import.meta.env.MODE || 'development',
      release: import.meta.env.VITE_SENTRY_RELEASE || 'unknown',
      tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || '0.1'),
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: false,
          blockAllMedia: false,
        }),
      ],
      // Session Replay sampling
      replaysSessionSampleRate: 0.1, // 10% of sessions
      replaysOnErrorSampleRate: 1.0, // 100% of sessions with an error

      // Comprehensive PII redaction (US-004)
      beforeSend: createSentryPIIRedactor(),

      // Don't send default PII
      sendDefaultPii: false,
    })

    console.info(dsn
      ? '[Sentry] Browser client initialized successfully with DSN'
      : '[Sentry] Browser client initialized in offline mode (no DSN)')
    return true
  } catch (error) {
    console.error('[Sentry] Failed to initialize:', error)
    return false
  }
}

/**
 * Check if Sentry is initialized and ready
 */
export function isSentryInitialized(): boolean {
  return Sentry.getCurrentScope() !== undefined
}