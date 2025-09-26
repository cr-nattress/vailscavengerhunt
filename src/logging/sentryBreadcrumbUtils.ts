import * as Sentry from '@sentry/react'

/**
 * Utility functions for adding Sentry breadcrumbs without breaking the app
 * if Sentry is not initialized
 */

interface ApiRequestData {
  method: string
  url: string
  status?: number
  duration?: number
  error?: string
  size?: number
}

/**
 * Add a breadcrumb for an API request start
 */
export function addApiRequestBreadcrumb(data: ApiRequestData): void {
  try {
    if (!isSentryAvailable()) return

    // Use raw URL without sanitization
    const sanitizedUrl = data.url

    Sentry.addBreadcrumb({
      category: 'http',
      message: `${data.method} ${sanitizedUrl}`,
      level: 'info',
      data: {
        method: data.method,
        url: sanitizedUrl,
        ...(data.status && { status: data.status }),
        ...(data.duration && { duration_ms: data.duration }),
        ...(data.error && { error: data.error }),
        ...(data.size && { response_size: data.size }),
      },
      timestamp: Date.now() / 1000,
    })
  } catch (error) {
    // Fail silently - don't break the app for breadcrumb issues
    console.debug('[Sentry] Failed to add API breadcrumb:', error)
  }
}

/**
 * Add a breadcrumb for a successful API response
 */
export function addApiResponseBreadcrumb(method: string, url: string, status: number, duration: number, size?: number): void {
  addApiRequestBreadcrumb({
    method,
    url,
    status,
    duration,
    size
  })
}

/**
 * Add a breadcrumb for a failed API request
 */
export function addApiErrorBreadcrumb(method: string, url: string, error: string, duration?: number): void {
  addApiRequestBreadcrumb({
    method,
    url,
    error,
    duration
  })
}

/**
 * Check if Sentry is available and initialized
 */
function isSentryAvailable(): boolean {
  try {
    return Sentry.getCurrentScope() !== undefined
  } catch {
    return false
  }
}

// Note: previously sanitized URLs; now intentionally left as-is