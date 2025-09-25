import * as Sentry from '@sentry/react'

/**
 * Global error handler to ensure all errors are captured
 */
export function setupGlobalErrorHandlers() {
  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason)

    // Send to Sentry
    Sentry.captureException(event.reason || new Error('Unhandled promise rejection'), {
      tags: {
        error_type: 'unhandled_rejection'
      },
      contexts: {
        promise: {
          reason: event.reason?.toString(),
          promise: event.promise?.toString()
        }
      }
    })
  })

  // Capture global errors
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error || event.message)

    // Send to Sentry
    Sentry.captureException(event.error || new Error(event.message), {
      tags: {
        error_type: 'global_error'
      },
      contexts: {
        error_event: {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      }
    })
  })

  // Capture network errors (for fetch failures)
  const originalFetch = window.fetch
  window.fetch = async function(...args) {
    try {
      const response = await originalFetch.apply(this, args)

      // Capture 500 errors
      if (response.status >= 500) {
        const url = args[0]?.toString() || 'unknown'
        const error = new Error(`Server error: ${response.status} ${response.statusText} at ${url}`)

        console.error('Server error detected:', error)

        Sentry.captureException(error, {
          tags: {
            error_type: 'server_error',
            status_code: response.status
          },
          contexts: {
            request: {
              url,
              method: args[1]?.method || 'GET',
              status: response.status,
              statusText: response.statusText
            }
          }
        })
      }

      return response
    } catch (error) {
      // Network errors
      const url = args[0]?.toString() || 'unknown'
      console.error('Network error:', error)

      Sentry.captureException(error, {
        tags: {
          error_type: 'network_error'
        },
        contexts: {
          request: {
            url,
            method: args[1]?.method || 'GET'
          }
        }
      })

      throw error
    }
  }

  console.info('[GlobalErrorHandler] Error handlers installed')
}

/**
 * Manually capture an error with context
 */
export function captureError(error, context = {}) {
  console.error('Captured error:', error, context)

  Sentry.captureException(error, {
    extra: context
  })
}

/**
 * Test Sentry by throwing a test error
 */
export function testSentryError() {
  const testError = new Error('Test error from globalErrorHandler')
  testError.name = 'TestError'

  console.log('Sending test error to Sentry...')

  Sentry.captureException(testError, {
    tags: {
      test: true,
      source: 'global_error_handler'
    }
  })

  // Also test with direct throw
  setTimeout(() => {
    throw new Error('Test uncaught error')
  }, 100)
}