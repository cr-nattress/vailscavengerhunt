import { Router } from 'express'

const router = Router()

// Mock store for local development
const localProgressStore = new Map<string, any>()
const localMetadataStore = new Map<string, any>()

// GET progress for a team's hunt
router.get('/progress/:orgId/:teamId/:huntId', async (req, res) => {
  const { orgId, teamId, huntId } = req.params
  const key = `${orgId}/${teamId}/${huntId}/progress`

  try {
    const progress = localProgressStore.get(key) || {}
    res.json(progress)
  } catch (error) {
    console.error('Error fetching progress:', error)
    res.status(500).json({ error: 'Failed to fetch progress' })
  }
})

// POST progress for a team's hunt
router.post('/progress/:orgId/:teamId/:huntId', async (req, res) => {
  const { orgId, teamId, huntId } = req.params
  const key = `${orgId}/${teamId}/${huntId}/progress`
  const metadataKey = `${orgId}/${teamId}/${huntId}/metadata`

  try {
    const { progress, sessionId, timestamp } = req.body

    if (!progress) {
      return res.status(400).json({ error: 'Progress data required' })
    }

    // Merge with existing progress (team-shared)
    const existingProgress = localProgressStore.get(key) || {}
    const mergedProgress = {
      ...existingProgress,
      ...progress,
      lastModifiedBy: sessionId,
      lastModifiedAt: timestamp || new Date().toISOString()
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

  try {
    const { update, sessionId, timestamp } = req.body

    if (!update) {
      return res.status(400).json({ error: 'Update data required' })
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