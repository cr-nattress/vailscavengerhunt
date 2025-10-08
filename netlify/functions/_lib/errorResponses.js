/**
 * Standardized error response builders for Netlify functions
 * Provides consistent error formats across all endpoints
 */

/**
 * Standard headers for all responses
 */
const STANDARD_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Pragma': 'no-cache'
}

/**
 * Build standardized error response
 *
 * @param {number} statusCode - HTTP status code
 * @param {string} error - Main error message
 * @param {string|object|null} details - Additional error details (optional)
 * @param {string|null} requestId - Request correlation ID (optional)
 * @returns {object} Netlify function response object
 */
function errorResponse(statusCode, error, details = null, requestId = null) {
  const body = {
    error,
    statusCode,
    timestamp: new Date().toISOString()
  }

  if (details) {
    body.details = typeof details === 'string' ? details : JSON.stringify(details)
  }

  if (requestId) {
    body.requestId = requestId
  }

  return {
    statusCode,
    headers: {
      ...STANDARD_HEADERS,
      ...(requestId && { 'X-Request-ID': requestId })
    },
    body: JSON.stringify(body)
  }
}

/**
 * 400 Bad Request - Invalid input
 */
function badRequestResponse(message = 'Invalid request', details = null, requestId = null) {
  return errorResponse(400, message, details, requestId)
}

/**
 * 401 Unauthorized - Authentication required
 */
function unauthorizedResponse(message = 'Unauthorized', details = null, requestId = null) {
  return errorResponse(401, message, details, requestId)
}

/**
 * 403 Forbidden - Insufficient permissions
 */
function forbiddenResponse(message = 'Forbidden', details = null, requestId = null) {
  return errorResponse(403, message, details, requestId)
}

/**
 * 404 Not Found - Resource doesn't exist
 */
function notFoundResponse(message = 'Not found', details = null, requestId = null) {
  return errorResponse(404, message, details, requestId)
}

/**
 * 409 Conflict - Resource conflict
 */
function conflictResponse(message = 'Conflict', details = null, requestId = null) {
  return errorResponse(409, message, details, requestId)
}

/**
 * 422 Unprocessable Entity - Validation error
 */
function validationErrorResponse(message = 'Validation failed', errors = null, requestId = null) {
  return errorResponse(422, message, errors, requestId)
}

/**
 * 429 Too Many Requests - Rate limit exceeded
 */
function rateLimitResponse(message = 'Rate limit exceeded', retryAfter = null, requestId = null) {
  const response = errorResponse(429, message, retryAfter ? `Retry after ${retryAfter} seconds` : null, requestId)

  if (retryAfter) {
    response.headers['Retry-After'] = String(retryAfter)
  }

  return response
}

/**
 * 500 Internal Server Error - Generic server error
 */
function internalErrorResponse(message = 'Internal server error', details = null, requestId = null) {
  // Don't expose internal details in production
  const sanitizedDetails = process.env.NODE_ENV === 'production' ? null : details
  return errorResponse(500, message, sanitizedDetails, requestId)
}

/**
 * 502 Bad Gateway - Upstream service error
 */
function badGatewayResponse(service = 'upstream service', details = null, requestId = null) {
  return errorResponse(502, `${service} is unavailable`, details, requestId)
}

/**
 * 503 Service Unavailable - Service temporarily down
 */
function serviceUnavailableResponse(message = 'Service unavailable', retryAfter = null, requestId = null) {
  const response = errorResponse(503, message, null, requestId)

  if (retryAfter) {
    response.headers['Retry-After'] = String(retryAfter)
  }

  return response
}

/**
 * 504 Gateway Timeout - Upstream timeout
 */
function gatewayTimeoutResponse(service = 'upstream service', requestId = null) {
  return errorResponse(504, `${service} timeout`, 'Request took too long to complete', requestId)
}

/**
 * Build successful response with optional warnings
 *
 * @param {object} data - Response data
 * @param {string[]} warnings - Non-fatal warnings (optional)
 * @param {number} statusCode - HTTP status code (default: 200)
 * @param {string|null} requestId - Request correlation ID (optional)
 * @returns {object} Netlify function response object
 */
function successResponse(data, warnings = [], statusCode = 200, requestId = null) {
  const body = {
    ...data,
    timestamp: new Date().toISOString()
  }

  // Include warnings if any
  if (warnings && warnings.length > 0) {
    body.warnings = warnings
  }

  if (requestId) {
    body.requestId = requestId
  }

  return {
    statusCode,
    headers: {
      ...STANDARD_HEADERS,
      ...(requestId && { 'X-Request-ID': requestId })
    },
    body: JSON.stringify(body)
  }
}

/**
 * Handle common error types and convert to appropriate response
 *
 * @param {Error} error - The error to handle
 * @param {string|null} requestId - Request correlation ID (optional)
 * @returns {object} Appropriate error response
 */
function handleError(error, requestId = null) {
  // Path parsing errors
  if (error.message.includes('Invalid path') || error.message.includes('Missing required path')) {
    return badRequestResponse('Invalid request path', error.message, requestId)
  }

  // Validation errors (from Zod or custom validation)
  if (error.name === 'ZodError' || error.message.includes('Validation')) {
    const details = error.issues ? error.issues.map(i => i.message).join(', ') : error.message
    return validationErrorResponse('Input validation failed', details, requestId)
  }

  // Supabase errors
  if (error.message.includes('Supabase') || error.code?.startsWith('PGRST')) {
    return badGatewayResponse('Database', error.message, requestId)
  }

  // Cloudinary errors
  if (error.message.includes('Cloudinary')) {
    return badGatewayResponse('Image service', error.message, requestId)
  }

  // Timeout errors
  if (error.message.includes('timeout') || error.code === 'ETIMEDOUT') {
    return gatewayTimeoutResponse('External service', requestId)
  }

  // Default to 500
  return internalErrorResponse('An unexpected error occurred', error.message, requestId)
}

/**
 * Create CORS headers for responses
 *
 * @param {string|null} origin - Request origin
 * @returns {object} CORS headers
 */
function getCorsHeaders(origin = null) {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*']

  const isAllowed = origin && (
    allowedOrigins.includes('*') ||
    allowedOrigins.includes(origin)
  )

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
    'Access-Control-Max-Age': '86400'
  }
}

/**
 * Handle OPTIONS preflight request
 *
 * @param {object} event - Netlify function event
 * @returns {object} CORS preflight response
 */
function handleCorsPreflightResponse(event) {
  const origin = event.headers.origin || event.headers.Origin

  return {
    statusCode: 204,
    headers: {
      ...getCorsHeaders(origin),
      'Content-Length': '0'
    },
    body: ''
  }
}

// CommonJS exports
module.exports = {
  errorResponse,
  badRequestResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  conflictResponse,
  validationErrorResponse,
  rateLimitResponse,
  internalErrorResponse,
  badGatewayResponse,
  serviceUnavailableResponse,
  gatewayTimeoutResponse,
  successResponse,
  handleError,
  getCorsHeaders,
  handleCorsPreflightResponse
}
