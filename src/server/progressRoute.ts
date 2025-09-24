import { Router } from 'express'
import { validateProgress, validateStopUpdate, validateOrgId, validateTeamId, validateHuntId, validateSessionId } from '../utils/validation'

const router = Router()

// Mock store for local development
const localProgressStore = new Map<string, any>()
const localMetadataStore = new Map<string, any>()

// Metadata fields that should not be included in progress data
const METADATA_FIELDS = ['lastModifiedBy', 'lastModifiedAt'] as const

// Utility function to clean metadata fields from progress data
function cleanProgressData(progress: any): any {
  const cleaned = { ...progress }
  METADATA_FIELDS.forEach(field => {
    delete cleaned[field]
  })
  return cleaned
}

// GET progress for a team's hunt
router.get('/progress/:orgId/:teamId/:huntId', async (req, res) => {
  const { orgId, teamId, huntId } = req.params

  // URL decode parameters to handle spaces and special characters
  const decodedOrgId = decodeURIComponent(orgId)
  const decodedTeamId = decodeURIComponent(teamId)
  const decodedHuntId = decodeURIComponent(huntId)

  const key = `${decodedOrgId}/${decodedTeamId}/${decodedHuntId}/progress`

  try {
    const progress = localProgressStore.get(key) || {}

    // Clean progress data by removing any metadata fields that shouldn't be there
    const cleanProgress = cleanProgressData(progress)

    res.json(cleanProgress)
  } catch (error) {
    console.error('Error fetching progress:', error)
    res.status(500).json({ error: 'Failed to fetch progress' })
  }
})

// POST progress for a team's hunt
router.post('/progress/:orgId/:teamId/:huntId', async (req, res) => {
  const { orgId, teamId, huntId } = req.params

  // URL decode parameters to handle spaces and special characters
  const decodedOrgId = decodeURIComponent(orgId)
  const decodedTeamId = decodeURIComponent(teamId)
  const decodedHuntId = decodeURIComponent(huntId)

  const key = `${decodedOrgId}/${decodedTeamId}/${decodedHuntId}/progress`
  const metadataKey = `${decodedOrgId}/${decodedTeamId}/${decodedHuntId}/metadata`

  // Validate path parameters - skip team ID validation for now to allow spaces
  if (!validateOrgId(decodedOrgId) || !validateHuntId(decodedHuntId)) {
    return res.status(400).json({ error: 'Invalid path parameters' })
  }

  try {
    const { progress, sessionId, timestamp } = req.body

    if (!progress) {
      return res.status(400).json({ error: 'Progress data required' })
    }

    // Skip session ID validation for now to allow any session ID format
    // if (sessionId && !validateSessionId(sessionId)) {
    //   return res.status(400).json({ error: 'Invalid session ID format' })
    // }

    // Validate progress data
    const validation = validateProgress(progress)
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Invalid progress data',
        details: validation.errors
      })
    }

    // Merge with existing progress (team-shared) - exclude metadata fields
    const existingProgress = localProgressStore.get(key) || {}

    // Clean existing progress by removing any metadata fields that shouldn't be there
    const cleanExistingProgress = cleanProgressData(existingProgress)

    // Merge only the actual progress data (no metadata)
    const mergedProgress = {
      ...cleanExistingProgress,
      ...progress
    }

    localProgressStore.set(key, mergedProgress)

    // Update metadata for audit trail
    const metadata = localMetadataStore.get(metadataKey) || { contributors: [] }

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

    localMetadataStore.set(metadataKey, metadata)

    res.json({ success: true, progress: mergedProgress })
  } catch (error) {
    console.error('Error saving progress:', error)
    res.status(500).json({ error: 'Failed to save progress' })
  }
})

// PATCH progress for a specific stop
router.patch('/progress/:orgId/:teamId/:huntId/stop/:stopId', async (req, res) => {
  const { orgId, teamId, huntId, stopId } = req.params
  const key = `${orgId}/${teamId}/${huntId}/progress`
  const metadataKey = `${orgId}/${teamId}/${huntId}/metadata`

  // Validate path parameters
  if (!validateOrgId(orgId) || !validateTeamId(teamId) || !validateHuntId(huntId)) {
    return res.status(400).json({ error: 'Invalid path parameters' })
  }

  try {
    const { update, sessionId, timestamp } = req.body

    if (!update) {
      return res.status(400).json({ error: 'Update data required' })
    }

    // Validate session ID
    if (sessionId && !validateSessionId(sessionId)) {
      return res.status(400).json({ error: 'Invalid session ID format' })
    }

    // Validate stop update data
    const validation = validateStopUpdate(update)
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Invalid update data',
        details: validation.errors
      })
    }

    // Get existing progress (shared by team)
    const progress = localProgressStore.get(key) || {}

    // Update specific stop
    progress[stopId] = {
      ...progress[stopId],
      ...update,
      lastModifiedBy: sessionId,
      lastModifiedAt: timestamp || new Date().toISOString()
    }

    // Save updated progress
    localProgressStore.set(key, progress)

    // Update metadata
    const metadata = localMetadataStore.get(metadataKey) || { contributors: [] }
    metadata.lastModifiedBy = sessionId
    metadata.lastModifiedAt = new Date().toISOString()
    metadata.totalUpdates = (metadata.totalUpdates || 0) + 1
    localMetadataStore.set(metadataKey, metadata)

    res.json({ success: true })
  } catch (error) {
    console.error('Error updating stop progress:', error)
    res.status(500).json({ error: 'Failed to update stop progress' })
  }
})

export default router