import { z } from 'zod'
import { SupabaseTeamStorage } from './_lib/supabaseTeamStorage.js'
import { serverLogger } from './_lib/serverLogger.js'

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
    return new Response(JSON.stringify({
      error: 'Missing required parameters',
      expected: 'POST /progress-set/{orgId}/{teamId}/{huntId}',
      received: `POST ${url.pathname}`,
      pathParts: pathParts,
      usage: 'Include orgId, teamId, and huntId in URL path'
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }

  const [orgId, teamId, huntId] = pathParts
  const key = `${orgId}/${teamId}/${huntId}/progress`

  try {
    let body
    try {
      body = await req.json()
    } catch (jsonError) {
      console.error('JSON parsing error:', jsonError)
      return new Response(JSON.stringify({
        error: 'Invalid JSON payload',
        message: jsonError.message,
        usage: 'Send valid JSON with progress data'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }

    const { progress, sessionId, timestamp } = body

    if (!progress) {
      serverLogger.error('progress-set', 'missing_progress_data', {
        received: Object.keys(body),
        expected: 'Object with progress property containing stop data'
      })
      return new Response(JSON.stringify({
        error: 'Progress data required',
        received: Object.keys(body),
        expected: 'Object with progress property containing stop data'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }

    // Log progress data received with photo URLs
    const progressWithPhotos = Object.entries(progress).filter(([_, data]) => data?.photo)
    console.log(`[progress-set] Received progress data with ${progressWithPhotos.length} photo URLs:`,
      progressWithPhotos.map(([stopId, data]) => ({
        stopId,
        photo: data.photo?.substring(0, 50) + '...',
        done: data.done
      })))

    serverLogger.info('progress-set', 'request_received', {
      orgId,
      teamId,
      huntId,
      sessionId,
      totalStops: Object.keys(progress).length,
      stopsWithPhotos: progressWithPhotos.length,
      progressData: Object.entries(progress).reduce((acc, [stopId, data]) => {
        acc[stopId] = {
          done: data.done,
          hasPhoto: !!data.photo,
          photo: data.photo?.substring(0, 100) + '...' || null,
          completedAt: data.completedAt
        }
        return acc
      }, {})
    })

    // Filter out metadata fields from progress data before validation
    const { lastModifiedBy, lastModifiedAt, ...cleanProgressForValidation } = progress

    // Validate progress payload shape with detailed error reporting
    const parsedProgress = ProgressDataSchema.safeParse(cleanProgressForValidation)
    if (!parsedProgress.success) {
      const details = parsedProgress.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')
      console.error('Progress validation failed:', {
        errors: parsedProgress.error.issues,
        receivedProgress: progress
      })

      return new Response(JSON.stringify({
        error: 'Invalid progress payload',
        details,
        receivedKeys: Object.keys(progress || {}),
        sampleValidProgress: {
          "stop-id": {
            done: true,
            completedAt: "2025-09-23T22:00:00.000Z",
            revealedHints: 1
          }
        }
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }

    // Validate team exists in Supabase
    console.log(`[progress-set] Validating team exists: ${orgId}/${teamId}/${huntId}`)
    const teamExists = await SupabaseTeamStorage.validateTeamExists(orgId, teamId, huntId)

    if (!teamExists) {
      console.error(`[progress-set] Team not found in Supabase: ${orgId}/${teamId}/${huntId}`)
      return new Response(JSON.stringify({
        error: 'Team not found',
        message: `Team ${teamId} not found in organization ${orgId} for hunt ${huntId}`
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }

    console.log(`[progress-set] Team validated successfully: ${orgId}/${teamId}/${huntId}`)

    // Get existing progress from Supabase
    const existingProgress = await SupabaseTeamStorage.getTeamProgress(teamId) || {}

    // Merge with new progress
    const mergedProgress = {
      ...existingProgress,
      ...parsedProgress.data,
      lastModifiedBy: sessionId || 'unknown',
      lastModifiedAt: timestamp || new Date().toISOString()
    }

    // Clean merged progress data to remove metadata fields before sending to Supabase
    const cleanedProgress = { ...mergedProgress }
    delete cleanedProgress.lastModifiedBy
    delete cleanedProgress.lastModifiedAt

    console.log(`[progress-set] Cleaned progress data before Supabase:`, Object.keys(cleanedProgress))
    const cleanedProgressWithPhotos = Object.entries(cleanedProgress).filter(([_, data]) => data?.photo)
    console.log(`[progress-set] Cleaned progress with photos (${cleanedProgressWithPhotos.length}):`,
      cleanedProgressWithPhotos.map(([k, v]) => ({ [k]: { done: v.done, hasPhoto: !!v.photo, photoUrl: v.photo?.substring(0, 50) + '...' } })))

    serverLogger.info('progress-set', 'supabase_save_attempt', {
      orgId,
      teamId,
      huntId,
      totalStops: Object.keys(cleanedProgress).length,
      stopsWithPhotos: cleanedProgressWithPhotos.length,
      cleanedProgressData: Object.entries(cleanedProgress).reduce((acc, [stopId, data]) => {
        acc[stopId] = {
          done: data.done,
          hasPhoto: !!data.photo,
          photo: data.photo?.substring(0, 100) + '...' || null,
          completedAt: data.completedAt
        }
        return acc
      }, {})
    })

    console.log(`[progress-set] About to call SupabaseTeamStorage.updateTeamProgress...`)
    const supabaseResult = await SupabaseTeamStorage.updateTeamProgress(orgId, teamId, huntId, cleanedProgress)
    console.log(`[progress-set] Supabase call result:`, supabaseResult)

    if (!supabaseResult.success) {
      console.error('[progress-set] Failed to save progress to Supabase')
      return new Response(JSON.stringify({
        error: 'Failed to save progress',
        message: 'Could not save progress to database'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }

    serverLogger.info('progress-set', 'supabase_save_success', {
      orgId,
      teamId,
      huntId,
      stopsWithPhotos: cleanedProgressWithPhotos.length
    })

    // Metadata for audit trail is now handled in Supabase

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