/**
 * Team verification routes for Express server
 * Provides team code verification and team context endpoints
 */
import express from 'express'

const router = express.Router()

// Dev server proxy to Netlify Functions to avoid hard-coded team codes
// Use local server in development since we're handling Netlify Functions locally
const FUNCTIONS_BASE = process.env.NETLIFY_FUNCTIONS_URL || 'http://localhost:3001/.netlify/functions'

// Helper to proxy to Netlify Functions in dev
async function proxy(path: string, init: RequestInit) {
  const url = `${FUNCTIONS_BASE}${path}`
  const resp = await fetch(url, init)
  const text = await resp.text()
  let data: any
  try {
    data = JSON.parse(text)
  } catch {
    data = text
  }
  return { status: resp.status, data }
}

// POST /api/team-verify - Verify team code and issue lock token
router.post('/team-verify', async (req, res) => {
  try {
    const userAgent = req.get('user-agent') || ''
    const xff = (req.headers['x-forwarded-for'] as string) || req.ip
    const { status, data } = await proxy('/team-verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'user-agent': userAgent,
        'x-forwarded-for': Array.isArray(xff) ? xff[0] : xff
      },
      body: JSON.stringify(req.body || {})
    })
    res.status(status).json(data)
  } catch (error) {
    console.error('[teamRoute] verify proxy error:', error)
    res.status(500).json({
      error: 'Internal server error',
      code: 'STORAGE_ERROR'
    })
  }
})

// GET /api/team-current - Get current team context from lock token
router.get('/team-current', async (req, res) => {
  try {
    let token = (req.headers['x-team-lock'] as string) || ''
    if (!token) {
      const auth = req.get('authorization')
      if (auth && auth.startsWith('Bearer ')) token = auth.slice(7)
    }
    if (!token) {
      return res.status(401).json({
        error: 'Invalid or malformed team lock token',
        code: 'INVALID_TOKEN'
      })
    }

    const { status, data } = await proxy('/team-current', {
      method: 'GET',
      headers: {
        'x-team-lock': token
      }
    })
    res.status(status).json(data)
  } catch (error) {
    console.error('[teamRoute] current proxy error:', error)
    res.status(500).json({
      error: 'Internal server error',
      code: 'STORAGE_ERROR'
    })
  }
})

// POST /api/team-setup - Create test team mappings (development only)
router.post('/team-setup', async (req, res) => {
  try {
    const { status, data } = await proxy('/team-setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body || {})
    })
    res.status(status).json(data)
  } catch (error) {
    console.error('[teamRoute] setup proxy error:', error)
    res.status(500).json({
      error: 'Internal server error',
      code: 'STORAGE_ERROR'
    })
  }
})

export default router