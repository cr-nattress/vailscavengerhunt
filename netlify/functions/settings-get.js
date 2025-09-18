import { getStore } from '@netlify/blobs'

export default async (req, context) => {
  // Extract orgId, teamId, huntId from URL
  const url = new URL(req.url)

  // Get the path after the function prefix
  let pathToProcess = url.pathname

  // Remove the function prefix if present
  if (pathToProcess.includes('/.netlify/functions/settings-get/')) {
    pathToProcess = pathToProcess.split('/.netlify/functions/settings-get/')[1]
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
  console.log('Fetching settings with key:', key)

  try {
    const store = getStore({ name: 'hunt-data' })
    const settings = await store.get(key, { type: 'json' })

    if (!settings) {
      return new Response(JSON.stringify({ error: 'Settings not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }

    return new Response(JSON.stringify(settings), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return new Response(JSON.stringify({ error: 'Failed to fetch settings' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
}

export const config = {
  path: '/api/settings/:orgId/:teamId/:huntId'
}