import { getStore } from '@netlify/blobs'

export default async (req, context) => {
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

  try {
    const store = getStore({ name: 'hunt-data' })
    const progress = await store.get(key, { type: 'json' })

    // Return empty object if no progress found (not an error)
    return new Response(JSON.stringify(progress || {}), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Error fetching progress:', error)
    return new Response(JSON.stringify({ error: 'Failed to fetch progress' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

export const config = {
  path: '/api/progress/:orgId/:teamId/:huntId'
}