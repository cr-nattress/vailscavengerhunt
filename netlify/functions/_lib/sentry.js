// Shared Sentry initialization and wrapper for Netlify Functions
const Sentry = require('@sentry/node')

let initialized = false

function initSentry() {
  if (initialized) return
  try {
    const dsn = process.env.SENTRY_DSN
    Sentry.init({
      dsn: dsn || undefined,
      enabled: !!dsn,
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
      release: process.env.SENTRY_RELEASE,
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
      // Serverless best practices: keep lightweight integrations
      sendDefaultPii: true,
    })
    initialized = true
    if (dsn) console.info('[Sentry] Functions initialized')
  } catch (e) {
    console.warn('[Sentry] Functions init failed:', e && e.message)
  }
}

function withSentry(handler) {
  initSentry()
  return async (event, context) => {
    const startTime = Date.now()

    // Log incoming request as breadcrumb
    try {
      const requestData = {
        method: event?.httpMethod,
        path: event?.path,
        query: event?.queryStringParameters,
        // Redact sensitive headers
        headers: event?.headers ? Object.keys(event.headers).reduce((acc, key) => {
          const lowerKey = key.toLowerCase()
          if (lowerKey.includes('authorization') || lowerKey.includes('cookie') || lowerKey.includes('token')) {
            acc[key] = '[REDACTED]'
          } else {
            acc[key] = event.headers[key]
          }
          return acc
        }, {}) : {},
        bodySize: event?.body ? event.body.length : 0,
        isBase64Encoded: event?.isBase64Encoded || false,
        functionName: context?.functionName,
        remainingTime: context?.getRemainingTimeInMillis ? context.getRemainingTimeInMillis() : null,
      }

      // Parse body if it's JSON (but don't include sensitive data)
      if (event?.body && !event.isBase64Encoded) {
        try {
          const bodyObj = JSON.parse(event.body)
          // Only log safe fields from body
          const safeBodyFields = ['action', 'type', 'teamId', 'teamCode', 'challengeId', 'photoId']
          requestData.bodyFields = Object.keys(bodyObj).filter(key => safeBodyFields.includes(key)).reduce((acc, key) => {
            acc[key] = typeof bodyObj[key] === 'string' ? bodyObj[key].substring(0, 100) : bodyObj[key]
            return acc
          }, {})
        } catch {
          // Not JSON, just log that we have a body
          requestData.bodyType = 'non-json'
        }
      }

      Sentry.addBreadcrumb({
        category: 'function.request',
        message: `${event?.httpMethod || 'UNKNOWN'} ${event?.path || 'unknown-path'}`,
        level: 'info',
        data: requestData,
        timestamp: Date.now() / 1000,
      })
    } catch (e) {
      // Don't let logging errors break the function
      console.warn('[Sentry] Failed to log request:', e?.message)
    }

    let result
    let errorOccurred = false

    try {
      result = await handler(event, context)

      // Log response as breadcrumb
      try {
        const duration = Date.now() - startTime
        const responseData = {
          statusCode: result?.statusCode,
          headers: result?.headers,
          bodySize: result?.body ? result.body.length : 0,
          duration: `${duration}ms`,
          functionName: context?.functionName,
        }

        // Parse response body if it's JSON to log structure (not content)
        if (result?.body) {
          try {
            const bodyObj = JSON.parse(result.body)
            responseData.bodyKeys = Object.keys(bodyObj)
            responseData.hasError = 'error' in bodyObj
          } catch {
            responseData.bodyType = 'non-json'
          }
        }

        Sentry.addBreadcrumb({
          category: 'function.response',
          message: `Response ${result?.statusCode || 'unknown'} (${duration}ms)`,
          level: result?.statusCode >= 400 ? 'warning' : 'info',
          data: responseData,
          timestamp: Date.now() / 1000,
        })
      } catch (e) {
        console.warn('[Sentry] Failed to log response:', e?.message)
      }

      return result
    } catch (err) {
      errorOccurred = true
      const duration = Date.now() - startTime

      try {
        // Log error response as breadcrumb before capturing exception
        Sentry.addBreadcrumb({
          category: 'function.error',
          message: `Error after ${duration}ms: ${err?.message || 'Unknown error'}`,
          level: 'error',
          data: {
            errorName: err?.name,
            errorMessage: err?.message,
            duration: `${duration}ms`,
            functionName: context?.functionName,
          },
          timestamp: Date.now() / 1000,
        })

        // Capture the exception with full context
        Sentry.captureException(err, {
          tags: {
            function: context?.functionName,
            path: event?.path,
            method: event?.httpMethod,
            statusCode: '500',
          },
          extra: {
            path: event?.path,
            method: event?.httpMethod,
            query: event?.queryStringParameters,
            headers: event?.headers,
            requestBody: event?.body ? event.body.substring(0, 1000) : null,
            duration: `${duration}ms`,
            remainingTime: context?.getRemainingTimeInMillis ? context.getRemainingTimeInMillis() : null,
          },
          fingerprint: [
            context?.functionName || 'unknown-function',
            err?.name || 'Error',
            err?.message || 'unknown-error',
          ],
        })

        await Sentry.flush(2000)
      } catch (sentryErr) {
        console.error('[Sentry] Failed to capture exception:', sentryErr?.message)
      }

      // Return a generic 500 to the client
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Internal server error' })
      }
    }
  }
}

module.exports = { withSentry, initSentry }
