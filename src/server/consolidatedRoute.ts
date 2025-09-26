/**
 * Consolidated routes for Express server
 * Provides single endpoints that return multiple data types
 */
import express from 'express'

const router = express.Router()

// GET /api/consolidated/active/:orgId/:teamId/:huntId - Get all active data
router.get('/consolidated/active/:orgId/:teamId/:huntId', async (req, res) => {
  try {
    const { orgId, teamId, huntId } = req.params

    // Dynamically import the Netlify function
    const consolidatedActive = await import('../../netlify/functions/consolidated-active.js')

    // Simulate Netlify function event, ensuring headers are passed
    const event = {
      httpMethod: 'GET',
      path: `/api/consolidated/active/${orgId}/${teamId}/${huntId}`,
      rawUrl: `http://localhost:3001/api/consolidated/active/${orgId}/${teamId}/${huntId}`,
      headers: {
        ...req.headers,
        // Ensure team lock header is passed through if present
        'x-team-lock': req.headers['x-team-lock'] || req.headers['X-Team-Lock']
      }
    }

    // Call the Netlify function handler
    const response = await consolidatedActive.handler(event)

    // Send response
    res.status(response.statusCode)
    Object.entries(response.headers || {}).forEach(([key, value]) => {
      res.setHeader(key, value as string)
    })
    res.send(response.body)

  } catch (error) {
    console.error('[consolidatedRoute] active error:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

export default router