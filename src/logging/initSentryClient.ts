import * as Sentry from '@sentry/react'
import { createSentryPIIRedactor } from './piiRedaction.js'

/**
 * Initialize Sentry for browser - always enabled
 */
export async function maybeInitSentryBrowser(): Promise<boolean> {
  try {
    // Prefer preloaded config on window to avoid startup race
    const win = window as any
    let cfg = win.__PUBLIC_CONFIG__
    if (!cfg) {
      const mod = await import('../services/PublicConfig')
      cfg = await mod.getPublicConfig()
      win.__PUBLIC_CONFIG__ = cfg
    }

    const dsn: string | undefined = cfg.SENTRY_DSN
    const environment: string = cfg.SENTRY_ENVIRONMENT || (import.meta as any)?.env?.MODE || 'development'
    const release: string = cfg.SENTRY_RELEASE || 'unknown'
    const tracesSampleRate: number = Number(cfg.SENTRY_TRACES_SAMPLE_RATE || 0.1)

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
      beforeSend: createSentryPIIRedactor(),
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