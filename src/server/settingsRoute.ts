import { Router } from 'express'
import { getStore } from '@netlify/blobs'
import { validateSettings, validateOrgId, validateTeamId, validateHuntId, validateSessionId } from '../utils/validation'

const router = Router()

// Mock Netlify Blobs for local development
const localStore = new Map<string, any>()

// GET settings for a team's hunt
router.get('/settings/:orgId/:teamId/:huntId', async (req, res) => {
  const { orgId, teamId, huntId } = req.params
  const key = `${orgId}/${teamId}/${huntId}/settings`

  try {
    // In local dev, use in-memory store
    const settings = localStore.get(key)

    if (!settings) {
      return res.status(404).json({ error: 'Settings not found' })
    }

    res.json(settings)
  } catch (error) {
    console.error('Error fetching settings:', error)
    res.status(500).json({ error: 'Failed to fetch settings' })
  }
})

// POST settings for a team's hunt
router.post('/settings/:orgId/:teamId/:huntId', async (req, res) => {
  const { orgId, teamId, huntId } = req.params
  const key = `${orgId}/${teamId}/${huntId}/settings`
  const metadataKey = `${orgId}/${teamId}/${huntId}/metadata`

  // Validate path parameters
  if (!validateOrgId(orgId) || !validateTeamId(teamId) || !validateHuntId(huntId)) {
    return res.status(400).json({ error: 'Invalid path parameters' })
  }

  try {
    const { settings, sessionId, timestamp } = req.body

    if (!settings) {
      return res.status(400).json({ error: 'Settings data required' })
    }

    // Validate session ID
    if (sessionId && !validateSessionId(sessionId)) {
      return res.status(400).json({ error: 'Invalid session ID format' })
    }

    // Validate settings data
    const validation = validateSettings(settings)
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Invalid settings data',
        details: validation.errors
      })
    }

    // Store settings (shared by all team members)
    const settingsToSave = {
      ...settings,
      lastModifiedBy: sessionId,
      lastModifiedAt: timestamp || new Date().toISOString()
    }

    localStore.set(key, settingsToSave)

    // Update metadata for audit trail
    const metadata = localStore.get(metadataKey) || { contributors: [] }

    // Update contributor tracking
    const contributorIndex = metadata.contributors.findIndex((c: any) => c.sessionId === sessionId)

    if (contributorIndex >= 0) {
      metadata.contributors[contributorIndex].lastActive = new Date().toISOString()
    } else {
      metadata.contributors.push({
        sessionId,
        firstActive: new Date().toISOString(),
        lastActive: new Date().toISOString()
      })
    }

    metadata.lastModifiedBy = sessionId
    metadata.lastModifiedAt = new Date().toISOString()
    metadata.totalUpdates = (metadata.totalUpdates || 0) + 1

    localStore.set(metadataKey, metadata)

    res.json({ success: true })
  } catch (error) {
    console.error('Error saving settings:', error)
    res.status(500).json({ error: 'Failed to save settings' })
  }
})

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

export default router