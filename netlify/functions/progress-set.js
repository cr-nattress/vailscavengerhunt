import { getStore } from '@netlify/blobs'

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
  const pathParts = url.pathname.replace('/api/progress/', '').split('/')

  if (pathParts.length < 3) {
    return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const [orgId, teamId, huntId] = pathParts
  const key = `${orgId}/${teamId}/${huntId}/progress`
  const metadataKey = `${orgId}/${teamId}/${huntId}/metadata`

  try {
    const body = await req.json()
    const { progress, sessionId, timestamp } = body

    if (!progress) {
      return new Response(JSON.stringify({ error: 'Progress data required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const store = getStore({ name: 'hunt-data' })

    // Merge with existing progress (in case multiple team members are updating)
    const existingProgress = await store.get(key, { type: 'json' }) || {}
    const mergedProgress = {
      ...existingProgress,
      ...progress,
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
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Error saving progress:', error)
    return new Response(JSON.stringify({ error: 'Failed to save progress' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

export const config = {
  path: '/api/progress/:orgId/:teamId/:huntId',
  method: 'POST'
}