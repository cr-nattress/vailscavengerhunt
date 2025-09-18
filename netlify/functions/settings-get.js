import { getStore } from '@netlify/blobs'

export default async (req, context) => {
  // Extract orgId, teamId, huntId from URL
  const url = new URL(req.url)
  const pathParts = url.pathname.replace('/api/settings/', '').split('/')

  if (pathParts.length < 3) {
    return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const [orgId, teamId, huntId] = pathParts
  const key = `${orgId}/${teamId}/${huntId}/settings`

  try {
    const store = getStore({ name: 'hunt-data' })
    const settings = await store.get(key, { type: 'json' })

    if (!settings) {
      return new Response(JSON.stringify({ error: 'Settings not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify(settings), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return new Response(JSON.stringify({ error: 'Failed to fetch settings' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

export const config = {
  path: '/api/settings/:orgId/:teamId/:huntId'
}