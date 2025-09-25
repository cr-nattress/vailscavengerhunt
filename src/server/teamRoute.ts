/**
 * Team verification routes for Express server
 * Provides team code verification and team context endpoints
 */
import express from 'express'

const router = express.Router()

// Dev server proxy to Netlify Functions to avoid hard-coded team codes
const FUNCTIONS_BASE = process.env.NETLIFY_FUNCTIONS_URL || 'http://localhost:8888/.netlify/functions'

// Simple JWT simulation for development
function generateSimpleToken(teamId: string): string {
  const payload = {
    teamId,
    iat: Math.floor(Date.now() / 1000)
  }
  // In development, just use base64 encoding
  return Buffer.from(JSON.stringify(payload)).toString('base64')
}

function verifySimpleToken(token: string): { teamId: string; exp: number } | null {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString())
    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      return null // Expired
    }
    return { teamId: payload.teamId, exp: payload.exp }
  } catch {
    return null
  }
}

// POST /api/team-verify - Verify team code and issue lock token
router.post('/team-verify', (req, res) => {
  try {
    const { code } = req.body

    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        error: 'Team code is required',
        code: 'INVALID_REQUEST'
      })
    }

    const normalizedCode = code.trim().toUpperCase()
    const mapping = teamMappings.get(normalizedCode)

    if (!mapping || !mapping.isActive) {
      console.log(`[team-verify] Invalid code attempt: ${normalizedCode}`)
      return res.status(401).json({
        error: "That code didn't work. Check with your host.",
        code: 'TEAM_CODE_INVALID'
      })
    }

    // Generate lock token
    const lockToken = generateSimpleToken(mapping.teamId)
    const ttlSeconds = 24 * 60 * 60 // 24 hours

    console.log(`[team-verify] Success: ${normalizedCode} -> ${mapping.teamName}`)

    res.json({
      teamId: mapping.teamId,
      teamName: mapping.teamName,
      lockToken,
      ttlSeconds
    })

  } catch (error) {
    console.error('[team-verify] Error:', error)
    res.status(500).json({
      error: 'Internal server error',
      code: 'STORAGE_ERROR'
    })
  }
})

// GET /api/team-current - Get current team context from lock token
router.get('/team-current', (req, res) => {
  try {
    const lockToken = req.headers['x-team-lock'] as string

    if (!lockToken) {
      return res.status(401).json({
        error: 'Invalid or malformed team lock token',
        code: 'INVALID_TOKEN'
      })
    }

    const tokenData = verifySimpleToken(lockToken)
    if (!tokenData) {
      return res.status(401).json({
        error: 'Invalid or malformed team lock token',
        code: 'INVALID_TOKEN'
      })
    }

    const team = teamData.get(tokenData.teamId)
    if (!team) {
      return res.status(500).json({
        error: 'Team data not found',
        code: 'STORAGE_ERROR'
      })
    }

    res.json({
      teamId: team.teamId,
      teamName: team.name
    })

  } catch (error) {
    console.error('[team-current] Error:', error)
    res.status(500).json({
      error: 'Internal server error',
      code: 'STORAGE_ERROR'
    })
  }
})

// POST /api/team-setup - Create test team mappings (development only)
router.post('/team-setup', (req, res) => {
  const results = []

  for (const [code, data] of teamMappings.entries()) {
    results.push({
      teamCode: code,
      teamName: data.teamName,
      success: true
    })
  }

  res.json({
    message: 'Test team mappings available',
    results
  })
})

export default router