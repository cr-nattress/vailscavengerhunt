import * as Sentry from '@sentry/react'
import { createSentryPIIRedactor } from './piiRedaction.js'

/**
 * Initialize Sentry for browser if enabled via environment variables
 * Only initializes when VITE_ENABLE_SENTRY is 'true' and VITE_SENTRY_DSN is set
 */
export function maybeInitSentryBrowser(): boolean {
  const enableSentry = import.meta.env.VITE_ENABLE_SENTRY === 'true'
  const dsn = import.meta.env.VITE_SENTRY_DSN

  if (!enableSentry || !dsn) {
    console.debug('[Sentry] Not initializing: enabled =', enableSentry, 'dsn =', !!dsn)
    return false
  }

  try {
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE || 'development',
      release: import.meta.env.VITE_SENTRY_RELEASE,
      tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || '0'),
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

    console.info('[Sentry] Browser client initialized successfully')
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