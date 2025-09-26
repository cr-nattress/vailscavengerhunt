import * as Sentry from '@sentry/react'

/**
 * Initialize Sentry for browser - always enabled
 */
export async function maybeInitSentryBrowser(): Promise<boolean> {
  try {
    // Read from build-time environment only; do not call public-config API
    const env: any = (import.meta as any)?.env || {}
    const dsn: string | undefined = env.VITE_SENTRY_DSN
    const environment: string = env.VITE_SENTRY_ENVIRONMENT || env.MODE || 'development'
    const release: string = env.VITE_SENTRY_RELEASE || 'unknown'
    const tracesSampleRate: number = Number(env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0.1)

    Sentry.init({
      dsn: dsn || undefined,
      enabled: !!dsn,
      environment,
      release,
      tracesSampleRate,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: false,
          blockAllMedia: false,
        }),
      ],
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      sendDefaultPii: true,
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