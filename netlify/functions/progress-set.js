import { getStore } from '@netlify/blobs'
import { z } from 'zod'

// Zod schemas mirroring client-side definitions (kept local to avoid TS imports)
const DateISOSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/, 'Invalid ISO date format')
const StopProgressSchema = z.object({
  done: z.boolean(),
  notes: z.string().optional(),
  photo: z.string().url().nullable().optional(),
  revealedHints: z.number().int().nonnegative().optional(),
  completedAt: DateISOSchema.optional(),
  lastModifiedBy: z.string().optional(),
})
const ProgressDataSchema = z.record(z.string(), StopProgressSchema)

export default async (req, context) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Extract orgId, teamId, huntId from URL
  const url = new URL(req.url)

  // Get the path after the function prefix
  let pathToProcess = url.pathname

  // Remove the function prefix if present
  if (pathToProcess.includes('/.netlify/functions/progress-set/')) {
    pathToProcess = pathToProcess.split('/.netlify/functions/progress-set/')[1]
  } else if (pathToProcess.includes('/api/progress/')) {
    pathToProcess = pathToProcess.split('/api/progress/')[1]
  }

  const pathParts = pathToProcess ? pathToProcess.split('/').filter(Boolean) : []

  if (pathParts.length < 3) {
    console.error('Missing parameters. Path parts:', pathParts, 'URL:', url.pathname)
    return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }

  const [orgId, teamId, huntId] = pathParts
  const key = `${orgId}/${teamId}/${huntId}/progress`
  const metadataKey = `${orgId}/${teamId}/${huntId}/metadata`

  try {
    const body = await req.json()
    const { progress, sessionId, timestamp } = body

    // Validate progress payload shape
    const parsedProgress = ProgressDataSchema.safeParse(progress)
    if (!parsedProgress.success) {
      const details = parsedProgress.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')
      return new Response(JSON.stringify({ error: 'Invalid progress payload', details }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (!progress) {
      return new Response(JSON.stringify({ error: 'Progress data required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const store = getStore({ name: 'hunt-data' })

    // Merge with existing progress (in case multiple team members are updating)
    const existingProgress = (await store.get(key, { type: 'json' })) || {}
    const mergedProgress = {
      ...existingProgress,
      ...parsedProgress.data,
      lastModifiedBy: sessionId,
      lastModifiedAt: timestamp || new Date().toISOString()
    }

    await store.setJSON(key, mergedProgress)

    // Update metadata for audit trail
    const metadata = await store.get(metadataKey, { type: 'json' }) || { contributors: [] }

    // Update contributor tracking
    const contributorIndex = metadata.contributors.findIndex(c => c.sessionId === sessionId)

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

    await store.setJSON(metadataKey, metadata)

    return new Response(JSON.stringify({ success: true, progress: mergedProgress }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (error) {
    console.error('Error saving progress:', error)
    return new Response(JSON.stringify({ error: 'Failed to save progress' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
}