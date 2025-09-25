/**
 * Team verification routes for Express server
 * Provides team code verification and team context endpoints
 */
import express from 'express'

const router = express.Router()

// Simulate team storage for development
const teamMappings = new Map([
  // Original test codes
  ['ALPHA01', { teamId: 'TEAM_alpha_001', teamName: 'Team Alpha', isActive: true }],
  ['BETA02', { teamId: 'TEAM_beta_002', teamName: 'Team Beta', isActive: true }],
  ['GAMMA03', { teamId: 'TEAM_gamma_003', teamName: 'Team Gamma', isActive: true }],

  // Common test codes
  ['TEST', { teamId: 'TEAM_test', teamName: 'Test Team', isActive: true }],
  ['DEMO', { teamId: 'TEAM_demo', teamName: 'Demo Team', isActive: true }],
  ['1234', { teamId: 'TEAM_1234', teamName: 'Team 1234', isActive: true }],
  ['0000', { teamId: 'TEAM_0000', teamName: 'Team Zero', isActive: true }],

  // Vail-specific codes
  ['VAIL01', { teamId: 'TEAM_vail_01', teamName: 'Vail Team 1', isActive: true }],
  ['VAIL02', { teamId: 'TEAM_vail_02', teamName: 'Vail Team 2', isActive: true }],
  ['BERRYPICKER', { teamId: 'TEAM_berrypicker', teamName: 'Berry Picker', isActive: true }],

  // Phonetic alphabet codes (commonly used)
  ['GOLF07', { teamId: 'TEAM_golf_07', teamName: 'Golf 7', isActive: true }],
  ['INDIA09', { teamId: 'TEAM_india_09', teamName: 'India 9', isActive: true }],
  ['CHARLIE03', { teamId: 'TEAM_charlie_03', teamName: 'Charlie 3', isActive: true }],
  ['DELTA04', { teamId: 'TEAM_delta_04', teamName: 'Delta 4', isActive: true }],
  ['ECHO05', { teamId: 'TEAM_echo_05', teamName: 'Echo 5', isActive: true }],
  ['FOXTROT06', { teamId: 'TEAM_foxtrot_06', teamName: 'Foxtrot 6', isActive: true }]
])

const teamData = new Map([
  ['TEAM_alpha_001', { teamId: 'TEAM_alpha_001', name: 'Team Alpha', score: 0, huntProgress: {} }],
  ['TEAM_beta_002', { teamId: 'TEAM_beta_002', name: 'Team Beta', score: 0, huntProgress: {} }],
  ['TEAM_gamma_003', { teamId: 'TEAM_gamma_003', name: 'Team Gamma', score: 0, huntProgress: {} }],
  ['TEAM_test', { teamId: 'TEAM_test', name: 'Test Team', score: 0, huntProgress: {} }],
  ['TEAM_demo', { teamId: 'TEAM_demo', name: 'Demo Team', score: 0, huntProgress: {} }],
  ['TEAM_1234', { teamId: 'TEAM_1234', name: 'Team 1234', score: 0, huntProgress: {} }],
  ['TEAM_0000', { teamId: 'TEAM_0000', name: 'Team Zero', score: 0, huntProgress: {} }],
  ['TEAM_vail_01', { teamId: 'TEAM_vail_01', name: 'Vail Team 1', score: 0, huntProgress: {} }],
  ['TEAM_vail_02', { teamId: 'TEAM_vail_02', name: 'Vail Team 2', score: 0, huntProgress: {} }],
  ['TEAM_berrypicker', { teamId: 'TEAM_berrypicker', name: 'Berry Picker', score: 0, huntProgress: {} }],
  ['TEAM_golf_07', { teamId: 'TEAM_golf_07', name: 'Golf 7', score: 0, huntProgress: {} }],
  ['TEAM_india_09', { teamId: 'TEAM_india_09', name: 'India 9', score: 0, huntProgress: {} }],
  ['TEAM_charlie_03', { teamId: 'TEAM_charlie_03', name: 'Charlie 3', score: 0, huntProgress: {} }],
  ['TEAM_delta_04', { teamId: 'TEAM_delta_04', name: 'Delta 4', score: 0, huntProgress: {} }],
  ['TEAM_echo_05', { teamId: 'TEAM_echo_05', name: 'Echo 5', score: 0, huntProgress: {} }],
  ['TEAM_foxtrot_06', { teamId: 'TEAM_foxtrot_06', name: 'Foxtrot 6', score: 0, huntProgress: {} }]
])

// Simple JWT simulation for development
function generateSimpleToken(teamId: string): string {
  const payload = {
    teamId,
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
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