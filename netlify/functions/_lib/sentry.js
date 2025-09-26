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
    try {
      const res = await handler(event, context)
      return res
    } catch (err) {
      try {
        Sentry.captureException(err, {
          extra: {
            path: event?.path,
            method: event?.httpMethod,
            query: event?.queryStringParameters,
            headers: event?.headers,
          }
        })
        await Sentry.flush(2000)
      } catch {}
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
