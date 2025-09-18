import { Router } from 'express'
import { validateOrgId, validateHuntId } from '../utils/validation'

const router = Router()

// Mock stores for local development
const localProgressStore = new Map<string, any>()
const localMetadataStore = new Map<string, any>()
const localSettingsStore = new Map<string, any>()

interface LeaderboardEntry {
  teamId: string
  teamName: string
  completedStops: number
  totalStops: number
  completionRate: number
  lastActivity: string
  contributors: number
  totalUpdates: number
}

// GET leaderboard for a hunt across all teams
router.get('/leaderboard/:orgId/:huntId', async (req, res) => {
  const { orgId, huntId } = req.params

  // Validate parameters
  if (!validateOrgId(orgId) || !validateHuntId(huntId)) {
    return res.status(400).json({ error: 'Invalid path parameters' })
  }

  try {
    const leaderboard: LeaderboardEntry[] = []
    const processedTeams = new Set<string>()

    // In production, this would use Netlify Blobs list with prefix
    // For local dev, we'll iterate through our mock stores
    for (const [key, progress] of localProgressStore.entries()) {
      // Check if this key matches our org and hunt pattern
      const keyParts = key.split('/')
      if (keyParts[0] === orgId && keyParts[2] === huntId && key.endsWith('/progress')) {
        const teamId = keyParts[1]

        if (!processedTeams.has(teamId)) {
          processedTeams.add(teamId)

          const metadataKey = `${orgId}/${teamId}/${huntId}/metadata`
          const settingsKey = `${orgId}/${teamId}/${huntId}/settings`
          const metadata = localMetadataStore.get(metadataKey)
          const settings = localSettingsStore.get(settingsKey)

          if (progress) {
            // Filter out metadata fields to get actual stops
            const stops = Object.entries(progress).filter(([k]) =>
              !['lastModifiedBy', 'lastModifiedAt', 'teamName'].includes(k)
            )
            const completedStops = stops.filter(([_, p]: [string, any]) => p.done).length
            const totalStops = stops.length

            leaderboard.push({
              teamId,
              teamName: settings?.teamName || progress.teamName || teamId,
              completedStops,
              totalStops,
              completionRate: totalStops > 0 ? (completedStops / totalStops) * 100 : 0,
              lastActivity: progress.lastModifiedAt || new Date().toISOString(),
              contributors: metadata?.contributors?.length || 1,
              totalUpdates: metadata?.totalUpdates || 0
            })
          }
        }
      }
    }

    // Sort by completion rate (highest first), then by last activity (most recent first)
    leaderboard.sort((a, b) => {
      if (b.completionRate !== a.completionRate) {
        return b.completionRate - a.completionRate
      }
      return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    })

    res.json({
      orgId,
      huntId,
      leaderboard,
      retrievedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    res.status(500).json({ error: 'Failed to fetch leaderboard' })
  }
})

// GET team export - all data for a team's hunt
router.get('/export/:orgId/:teamId/:huntId', async (req, res) => {
  const { orgId, teamId, huntId } = req.params

  // Validate parameters
  if (!validateOrgId(orgId) || !validateHuntId(huntId)) {
    return res.status(400).json({ error: 'Invalid path parameters' })
  }

  try {
    const baseKey = `${orgId}/${teamId}/${huntId}`

    const settings = localSettingsStore.get(`${baseKey}/settings`)
    const progress = localProgressStore.get(`${baseKey}/progress`)
    const metadata = localMetadataStore.get(`${baseKey}/metadata`)

    if (!settings && !progress && !metadata) {
      return res.status(404).json({ error: 'No data found for this team' })
    }

    res.json({
      orgId,
      teamId,
      huntId,
      settings: settings || null,
      progress: progress || {},
      metadata: metadata || null,
      exportedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error exporting team data:', error)
    res.status(500).json({ error: 'Failed to export team data' })
  }
})

// GET contributors for a team's hunt
router.get('/contributors/:orgId/:teamId/:huntId', async (req, res) => {
  const { orgId, teamId, huntId } = req.params

  // Validate parameters
  if (!validateOrgId(orgId) || !validateHuntId(huntId)) {
    return res.status(400).json({ error: 'Invalid path parameters' })
  }

  try {
    const metadataKey = `${orgId}/${teamId}/${huntId}/metadata`
    const metadata = localMetadataStore.get(metadataKey)

    res.json({
      orgId,
      teamId,
      huntId,
      contributors: metadata?.contributors || [],
      lastModifiedBy: metadata?.lastModifiedBy || null,
      lastModifiedAt: metadata?.lastModifiedAt || null,
      totalUpdates: metadata?.totalUpdates || 0
    })
  } catch (error) {
    console.error('Error fetching contributors:', error)
    res.status(500).json({ error: 'Failed to fetch contributors' })
  }
})

// Share stores with other routes for consistency in local development
export function initializeStores(progress: Map<string, any>, metadata: Map<string, any>, settings: Map<string, any>) {
  // Clear and copy data from existing stores
  localProgressStore.clear()
  localMetadataStore.clear()
  localSettingsStore.clear()

  for (const [key, value] of progress.entries()) {
    localProgressStore.set(key, value)
  }
  for (const [key, value] of metadata.entries()) {
    localMetadataStore.set(key, value)
  }
  for (const [key, value] of settings.entries()) {
    localSettingsStore.set(key, value)
  }
}

export default router