/**
 * Write Log Function - Saves debug logs to Netlify Blobs
 */
const { getStore } = require('@netlify/blobs')

exports.handler = async (event, context) => {
  // Handle CORS
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  // Parse body outside try/catch to safely reference in fallback
  let parsedBody
  try {
    parsedBody = JSON.parse(event.body || '{}')
  } catch (_) {
    parsedBody = {}
  }

  try {
    const { filename, data } = parsedBody

    if (!filename || !data) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Filename and data required' })
      }
    }

    // Use Netlify Blobs to store logs
    const store = getStore('logs')
    const timestamp = new Date().toISOString()
    const logKey = `${timestamp}_${filename}`

    // Store the log data
    await store.setJSON(logKey, {
      filename,
      data,
      timestamp,
      headers: event.headers,
      ip: event.headers['x-forwarded-for']?.split(',')[0] || 'unknown'
    })

    console.log(`[write-log] Successfully wrote log: ${logKey}`)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        filename,
        key: logKey,
        timestamp
      })
    }
  } catch (error) {
    console.error('[write-log] Error writing log:', error)

    // In development or if Blobs fail, just log and return success
    // This prevents the app from breaking when logging fails
    console.log('[write-log] Fallback - log data:', {
      filename: parsedBody?.filename,
      dataSize: JSON.stringify(parsedBody?.data || {}).length
    })

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        filename: parsedBody?.filename || 'unknown',
        fallback: true,
        message: 'Log accepted (fallback mode)'
      })
    }
  }
}