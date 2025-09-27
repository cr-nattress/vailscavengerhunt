/**
 * Test endpoint to simulate 500 errors for testing error handling
 */

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  // Parse query parameters
  const params = event.queryStringParameters || {}

  // Allow controlling the response via query params
  const statusCode = parseInt(params.status || '500')
  const delay = parseInt(params.delay || '0')
  const message = params.message || 'Simulated server error for testing'

  // Add artificial delay if requested
  if (delay > 0) {
    await new Promise(resolve => setTimeout(resolve, delay))
  }

  // Return the requested error status
  return {
    statusCode,
    headers,
    body: JSON.stringify({
      error: message,
      timestamp: new Date().toISOString(),
      testMode: true
    })
  }
}