import { getStore } from '@netlify/blobs'

export default async (req, context) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }

  // Extract orgId, teamId, huntId from URL
  const url = new URL(req.url)

  // Get the path after the function prefix
  let pathToProcess = url.pathname

  // Remove the function prefix if present
  if (pathToProcess.includes('/.netlify/functions/settings-set/')) {
    pathToProcess = pathToProcess.split('/.netlify/functions/settings-set/')[1]
  } else if (pathToProcess.includes('/api/settings/')) {
    pathToProcess = pathToProcess.split('/api/settings/')[1]
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
  const key = `${orgId}/${teamId}/${huntId}/settings`
  const metadataKey = `${orgId}/${teamId}/${huntId}/metadata`

  try {
    const body = await req.json()
    const { settings, sessionId, timestamp } = body

    if (!settings) {
      return new Response(JSON.stringify({ error: 'Settings data required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }

    const store = getStore({ name: 'hunt-data' })

    // Store settings (shared by all team members)
    const settingsToSave = {
      ...settings,
      lastModifiedBy: sessionId,
      lastModifiedAt: timestamp || new Date().toISOString()
    }

    await store.setJSON(key, settingsToSave)

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

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (error) {
    console.error('Error saving settings:', error)
    return new Response(JSON.stringify({ error: 'Failed to save settings' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
}

export const config = {
  path: '/api/settings/:orgId/:teamId/:huntId',
  method: 'POST'
}