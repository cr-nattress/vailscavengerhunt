/**
 * Redaction utilities removed per request. This module is intentionally empty.
 */

export {}
/*
/**
 * Comprehensive PII (Personally Identifiable Information) redaction utilities
 * US-004: Implement PII redaction and compliance
 */

// Common PII patterns (regex-based detection)
const PII_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b(\+?1[-.\s]?)?(\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})\b/g,
  ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,
  creditCard: /\b(?:\d{4}[-.\s]?){3}\d{4}\b/g,
  ipAddress: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
  // Common ID patterns
  uuid: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
  // URLs with tokens or API keys
  urlWithToken: /([?&](?:token|key|secret|auth|api_key|access_token|refresh_token)=)[^&\s]+/gi,
  // Potential API keys (long alphanumeric strings)
  apiKey: /\b[A-Za-z0-9]{32,}\b/g,
}

// Sensitive field names that should be redacted regardless of content
const SENSITIVE_FIELD_NAMES = [
  'password', 'passwd', 'pwd',
  'secret', 'key', 'token', 'auth', 'authorization',
  'api_key', 'apikey', 'access_token', 'refresh_token',
  'session', 'sessionid', 'session_id',
  'credit_card', 'creditcard', 'cc_number',
  'ssn', 'social_security', 'social_security_number',
  'email', 'phone', 'telephone', 'mobile',
  'address', 'street', 'city', 'zip', 'zipcode', 'postal',
  'name', 'firstname', 'lastname', 'fullname',
  'dob', 'date_of_birth', 'birthday',
  'signature', 'pin', 'cvv', 'cvc',
]

/**
 * Redact PII from a string value
 */
export function redactStringPII(value: string): string {
  if (typeof value !== 'string') return value

  let redacted = value

  // Apply pattern-based redaction
  Object.entries(PII_PATTERNS).forEach(([type, pattern]) => {
    redacted = redacted.replace(pattern, `[${type.toUpperCase()}_REDACTED]`)
  })

  return redacted
}

/**
 * Check if a field name indicates sensitive data
 */
export function isSensitiveFieldName(fieldName: string): boolean {
  const normalizedName = fieldName.toLowerCase()
  return SENSITIVE_FIELD_NAMES.some(sensitive =>
    normalizedName.includes(sensitive) || normalizedName === sensitive
  )
}

/**
 * Redact PII from any data structure (objects, arrays, primitives)
 */
export function redactPII(data: any, maxDepth: number = 10, currentDepth: number = 0): any {
  // Prevent infinite recursion
  if (currentDepth >= maxDepth) {
    return '[MAX_DEPTH_REACHED]'
  }

  if (data === null || data === undefined) {
    return data
  }

  // Handle strings
  if (typeof data === 'string') {
    // Check for size limits
    if (data.length > 5000) {
      return '[LARGE_STRING_REDACTED]'
    }
    return redactStringPII(data)
  }

  // Handle other primitives
  if (typeof data !== 'object') {
    return data
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map((item, index) => {
      // Limit array processing to prevent performance issues
      if (index > 100) return '[ARRAY_TRUNCATED]'
      return redactPII(item, maxDepth, currentDepth + 1)
    })
  }

  // Handle objects
  const redactedObj: any = {}
  let processedKeys = 0

  for (const [key, value] of Object.entries(data)) {
    // Limit object processing to prevent performance issues
    if (processedKeys > 100) {
      redactedObj['[MORE_FIELDS_TRUNCATED]'] = true
      break
    }

    processedKeys++

    // Always redact sensitive field names
    if (isSensitiveFieldName(key)) {
      redactedObj[key] = '[PII_REDACTED]'
      continue
    }

    // Recursively process the value
    redactedObj[key] = redactPII(value, maxDepth, currentDepth + 1)
  }

  return redactedObj
}

/**
 * Redact URLs by removing query parameters and fragments
 */
export function redactURL(url: string): string {
  if (!url || typeof url !== 'string') return url

  try {
    const parsedUrl = new URL(url)

    // Remove query parameters and fragments
    parsedUrl.search = ''
    parsedUrl.hash = ''

    // If there were query params, indicate they were redacted
    const originalHadQuery = url.includes('?')
    if (originalHadQuery) {
      return parsedUrl.toString() + '?[QUERY_REDACTED]'
    }

    return parsedUrl.toString()
  } catch {
    // If URL parsing fails, try basic string manipulation
    const baseUrl = url.split('?')[0].split('#')[0]
    const hadQuery = url.includes('?') || url.includes('#')
    return hadQuery ? baseUrl + '?[QUERY_REDACTED]' : baseUrl
  }
}

/**
 * Redact request/response data for HTTP contexts
 */
export function redactHttpContext(context: any): any {
  if (!context || typeof context !== 'object') return context

  const redacted = { ...context }

  // Redact URLs
  if (redacted.url) {
    redacted.url = redactURL(redacted.url)
  }

  // Redact headers
  if (redacted.headers && typeof redacted.headers === 'object') {
    const redactedHeaders: any = {}
    Object.entries(redacted.headers).forEach(([name, value]) => {
      const normalizedName = name.toLowerCase()
      if (isSensitiveFieldName(normalizedName) ||
          normalizedName.includes('authorization') ||
          normalizedName.includes('cookie') ||
          normalizedName.includes('x-api-key')) {
        redactedHeaders[name] = '[HEADER_REDACTED]'
      } else if (typeof value === 'string') {
        redactedHeaders[name] = redactStringPII(value)
      } else {
        redactedHeaders[name] = value
      }
    })
    redacted.headers = redactedHeaders
  }

  // Redact body/data
  if (redacted.data || redacted.body) {
    const bodyData = redacted.data || redacted.body
    if (typeof bodyData === 'string') {
      try {
        // Try to parse as JSON and redact
        const parsed = JSON.parse(bodyData)
        redacted.data = JSON.stringify(redactPII(parsed))
        delete redacted.body
      } catch {
        // Not JSON, treat as string
        redacted.data = redactStringPII(bodyData)
        delete redacted.body
      }
    } else {
      redacted.data = redactPII(bodyData)
      delete redacted.body
    }
  }

  return redacted
}

/**
 * Create a comprehensive PII redaction function for Sentry beforeSend
 */
export function createSentryPIIRedactor() {
  return (event: any, hint: any) => {
    if (!event) return event

    // Redact request context
    if (event.request) {
      event.request = redactHttpContext(event.request)
    }

    // Redact response context
    if (event.contexts?.response) {
      event.contexts.response = redactHttpContext(event.contexts.response)
    }

    // Redact breadcrumbs
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((breadcrumb: any) => ({
        ...breadcrumb,
        data: breadcrumb.data ? redactPII(breadcrumb.data) : breadcrumb.data,
        message: breadcrumb.message ? redactStringPII(breadcrumb.message) : breadcrumb.message,
      }))
    }

    // Redact extra data
    if (event.extra) {
      event.extra = redactPII(event.extra)
    }

    // Redact user context (keep ID but redact sensitive fields)
    if (event.user) {
      const redactedUser = { ...event.user }
      Object.keys(redactedUser).forEach(key => {
        if (isSensitiveFieldName(key) && key !== 'id') {
          redactedUser[key] = '[USER_PII_REDACTED]'
        } else if (typeof redactedUser[key] === 'string') {
          redactedUser[key] = redactStringPII(redactedUser[key])
        }
      })
      event.user = redactedUser
    }

    // Redact exception details (keep stack trace structure but redact values)
    if (event.exception?.values) {
      event.exception.values = event.exception.values.map((exception: any) => ({
        ...exception,
        value: exception.value ? redactStringPII(exception.value) : exception.value,
        // Keep stack trace but redact file paths that might contain sensitive info
        stacktrace: exception.stacktrace ? {
          ...exception.stacktrace,
          frames: exception.stacktrace.frames?.map((frame: any) => ({
            ...frame,
            filename: frame.filename ? redactURL(frame.filename) : frame.filename,
          }))
        } : exception.stacktrace
      }))
    }

    // Check overall event size and truncate if necessary
    const eventSize = JSON.stringify(event).length
    if (eventSize > 50000) {
      // Remove less critical data to reduce size
      delete event.modules
      delete event.contexts?.device
      delete event.contexts?.os

      // If still too large, truncate extra data
      if (JSON.stringify(event).length > 50000) {
        event.extra = { '[EXTRA_TRUNCATED]': 'Event too large, extra data removed' }
      }
    }

    return event
  }
}