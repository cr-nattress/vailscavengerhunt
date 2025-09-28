import { Router } from 'express'
import fetch from 'node-fetch'

const router = Router()

// Proxy configuration for Netlify functions
// Prefer local Express runner at :3001 by default to eliminate dependency on Netlify Dev (:8888)
const FUNCTIONS_BASE_URL =
  process.env.NETLIFY_FUNCTIONS_URL ||
  process.env.NETLIFY_DEV_URL ||
  'http://localhost:3001'

/**
 * STORY-025: Express Dev Progress Proxy
 *
 * This router now proxies all progress operations to Supabase-backed Netlify functions
 * instead of using in-memory storage. This ensures the database is the single source
 * of truth for progress data.
 *
 * Previous implementation used localProgressStore (Map) which caused divergence
 * between what was stored in memory vs the database.
 */

// Helper to construct the function URL
function getFunctionUrl(path: string): string {
  // Map our routes to the appropriate Netlify functions
  if (path.includes('/progress/')) {
    // Use the Supabase-backed progress functions
    return `${FUNCTIONS_BASE_URL}/.netlify/functions/progress-get-supabase${path.replace('/progress', '')}`
  }
  return `${FUNCTIONS_BASE_URL}/.netlify/functions${path}`
}

// Type-safe error message extractor for unknown catch variables
function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  try {
    return JSON.stringify(err)
  } catch {
    return String(err)
  }
}

// Log warning on startup
console.warn('⚠️  [Progress Route] Now proxying to Supabase-backed Netlify functions')
console.warn('⚠️  [Progress Route] In-memory storage has been removed - DB is the single source of truth')
console.warn(`⚠️  [Progress Route] Proxying to: ${FUNCTIONS_BASE_URL}`)
console.log(`✅  [Progress Route] Ready to proxy requests`)

// GET progress for a team's hunt - Proxy to Supabase
router.get('/progress/:orgId/:teamId/:huntId', async (req, res) => {
  const { orgId, teamId, huntId } = req.params

  // URL decode parameters to handle spaces and special characters
  const decodedOrgId = decodeURIComponent(orgId)
  const decodedTeamId = decodeURIComponent(teamId)
  const decodedHuntId = decodeURIComponent(huntId)

  try {
    console.log(`[Progress Proxy] GET /progress/${decodedOrgId}/${decodedTeamId}/${decodedHuntId}`)

    // Proxy to the Supabase-backed function
    const functionUrl = `${FUNCTIONS_BASE_URL}/.netlify/functions/progress-get-supabase/${decodedOrgId}/${decodedTeamId}/${decodedHuntId}`
    console.log(`[Progress Proxy] Forwarding to: ${functionUrl}`)

    const response = await fetch(functionUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add no-store to prevent caching
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`[Progress Proxy] Function error: ${response.status} - ${error}`)
      return res.status(response.status).json({
        error: 'Failed to fetch progress from database',
        details: error
      })
    }

    const data = await response.json()

    // Add no-store headers to response
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    })

    res.json(data)
  } catch (error) {
    console.error('[Progress Proxy] Error fetching progress:', error)
    res.status(500).json({
      error: 'Failed to fetch progress from database',
      details: getErrorMessage(error)
    })
  }
})

// POST progress for a team's hunt - Proxy to Supabase
router.post('/progress/:orgId/:teamId/:huntId', async (req, res) => {
  const { orgId, teamId, huntId } = req.params

  // URL decode parameters to handle spaces and special characters
  const decodedOrgId = decodeURIComponent(orgId)
  const decodedTeamId = decodeURIComponent(teamId)
  const decodedHuntId = decodeURIComponent(huntId)

  try {
    console.log(`[Progress Proxy] POST /progress/${decodedOrgId}/${decodedTeamId}/${decodedHuntId}`)

    const { progress, sessionId, timestamp } = req.body

    if (!progress) {
      return res.status(400).json({ error: 'Progress data required' })
    }

    // Proxy to the Supabase-backed function
    const functionUrl = `${FUNCTIONS_BASE_URL}/.netlify/functions/progress-set-supabase/${decodedOrgId}/${decodedTeamId}/${decodedHuntId}`
    console.log(`[Progress Proxy] Forwarding to: ${functionUrl}`)

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      },
      body: JSON.stringify({
        orgId: decodedOrgId,
        teamId: decodedTeamId,
        huntId: decodedHuntId,
        progress,
        sessionId,
        timestamp
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`[Progress Proxy] Function error: ${response.status} - ${error}`)
      return res.status(response.status).json({
        error: 'Failed to save progress to database',
        details: error
      })
    }

    const data = await response.json()

    // Add no-store headers to response
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    })

    res.json(data)
  } catch (error) {
    console.error('[Progress Proxy] Error saving progress:', error)
    res.status(500).json({
      error: 'Failed to save progress to database',
      details: getErrorMessage(error)
    })
  }
})

// PATCH progress for a specific stop - Proxy to Supabase
router.patch('/progress/:orgId/:teamId/:huntId/stop/:stopId', async (req, res) => {
  const { orgId, teamId, huntId, stopId } = req.params

  // URL decode parameters
  const decodedOrgId = decodeURIComponent(orgId)
  const decodedTeamId = decodeURIComponent(teamId)
  const decodedHuntId = decodeURIComponent(huntId)
  const decodedStopId = decodeURIComponent(stopId)

  try {
    console.log(`[Progress Proxy] PATCH /progress/${decodedOrgId}/${decodedTeamId}/${decodedHuntId}/stop/${decodedStopId}`)

    const { update, sessionId, timestamp } = req.body

    if (!update) {
      return res.status(400).json({ error: 'Update data required' })
    }

    // For stop updates, we need to get current progress, update it, and save back
    // First get current progress
    const getUrl = `${FUNCTIONS_BASE_URL}/.netlify/functions/progress-get-supabase/${decodedOrgId}/${decodedTeamId}/${decodedHuntId}`
    const getResponse = await fetch(getUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })

    let currentProgress: Record<string, any> = {}
    if (getResponse.ok) {
      currentProgress = (await getResponse.json()) as Record<string, any>
    }

    // Update the specific stop
    currentProgress[decodedStopId] = {
      ...currentProgress[decodedStopId],
      ...update,
      lastModifiedBy: sessionId,
      lastModifiedAt: timestamp || new Date().toISOString()
    }

    // Save the updated progress
    const setUrl = `${FUNCTIONS_BASE_URL}/.netlify/functions/progress-set-supabase/${decodedOrgId}/${decodedTeamId}/${decodedHuntId}`
    const setResponse = await fetch(setUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      },
      body: JSON.stringify({
        orgId: decodedOrgId,
        teamId: decodedTeamId,
        huntId: decodedHuntId,
        progress: currentProgress,
        sessionId,
        timestamp
      })
    })

    if (!setResponse.ok) {
      const error = await setResponse.text()
      console.error(`[Progress Proxy] Function error: ${setResponse.status} - ${error}`)
      return res.status(setResponse.status).json({
        error: 'Failed to update stop progress in database',
        details: error
      })
    }

    // Add no-store headers to response
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    })

    res.json({ success: true })
  } catch (error) {
    console.error('[Progress Proxy] Error updating stop progress:', error)
    res.status(500).json({
      error: 'Failed to update stop progress in database',
      details: getErrorMessage(error)
    })
  }
})

// Health check endpoint
router.get('/progress/health', (req, res) => {
  res.json({
    status: 'healthy',
    mode: 'proxy',
    backend: 'supabase',
    message: 'Progress routes are proxying to Supabase-backed Netlify functions',
    functionsUrl: FUNCTIONS_BASE_URL
  })
})

export default router