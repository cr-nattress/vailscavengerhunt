/**
 * Write Log Function - Saves debug logs to @logs\ folder
 */

import { promises as fs } from 'fs'
import { join } from 'path'

export default async (req, context) => {
  // Handle CORS
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers
    })
  }

  try {
    const body = await req.json()
    const { filename, data } = body

    if (!filename || !data) {
      return new Response(JSON.stringify({ error: 'Filename and data required' }), {
        status: 400,
        headers
      })
    }

    // Ensure logs directory exists
    const logsDir = join(process.cwd(), 'logs')
    try {
      await fs.mkdir(logsDir, { recursive: true })
    } catch (err) {
      // Directory might already exist, ignore
    }

    // Write log file
    const logPath = join(logsDir, filename)
    const logContent = JSON.stringify(data, null, 2)

    await fs.writeFile(logPath, logContent, 'utf8')

    console.log(`[write-log] Successfully wrote log file: ${filename}`)

    return new Response(JSON.stringify({
      success: true,
      filename,
      path: logPath,
      size: logContent.length
    }), {
      status: 200,
      headers
    })
  } catch (error) {
    console.error('[write-log] Error writing log:', error)
    return new Response(JSON.stringify({
      error: 'Failed to write log',
      details: error.message
    }), {
      status: 500,
      headers
    })
  }
}