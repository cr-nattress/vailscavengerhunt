/**
 * Progress Set Function with Supabase Bridge
 * Handles updating progress data in Supabase hunt_progress table
 */

import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

// Zod schemas for validation
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
  // Handle CORS
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers
    })
  }

  try {
    const body = await req.json()
    const { orgId, teamId, huntId, progress, sessionId, timestamp } = body

    if (!orgId || !teamId || !huntId || !progress) {
      return new Response(JSON.stringify({
        error: 'Missing required parameters',
        required: ['orgId', 'teamId', 'huntId', 'progress']
      }), {
        status: 400,
        headers
      })
    }

    // Validate progress payload shape
    const parsedProgress = ProgressDataSchema.safeParse(progress)
    if (!parsedProgress.success) {
      const details = parsedProgress.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')
      return new Response(JSON.stringify({ error: 'Invalid progress payload', details }), {
        status: 400,
        headers
      })
    }

    console.log('Updating Supabase progress for:', { orgId, teamId, huntId, stopCount: Object.keys(progress).length })

    // Initialize Supabase client with service role for write operations
    const supabaseUrl = process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get team UUID from team_id
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .select('id')
      .eq('team_id', teamId)
      .eq('organization_id', orgId)
      .eq('hunt_id', huntId)
      .single()

    if (teamError) {
      console.error('Team lookup error:', teamError)
      return new Response(JSON.stringify({
        error: 'Team not found',
        details: teamError.message
      }), {
        status: 404,
        headers
      })
    }

    // Convert progress data to hunt_progress records
    const updates = []
    for (const [stopId, stopProgress] of Object.entries(progress)) {
      updates.push({
        team_id: teamData.id,
        location_id: stopId,
        done: stopProgress.done || false,
        revealed_hints: stopProgress.revealedHints || 0,
        completed_at: stopProgress.completedAt || (stopProgress.done ? new Date().toISOString() : null),
        notes: stopProgress.notes || null,
        photo_url: stopProgress.photo || null // Fixed: Include photo URL
      })
    }

    // Upsert progress records
    const { error: upsertError } = await supabase
      .from('hunt_progress')
      .upsert(updates, {
        onConflict: 'team_id,location_id',
        ignoreDuplicates: false
      })

    if (upsertError) {
      console.error('Progress update error:', upsertError)
      return new Response(JSON.stringify({
        error: 'Failed to update progress',
        details: upsertError.message
      }), {
        status: 500,
        headers
      })
    }

    console.log(`✅ Updated progress for team ${teamId}: ${updates.length} stops`)

    return new Response(JSON.stringify({
      success: true,
      updatedStops: updates.length,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers
    })
  } catch (error) {
    console.error('Error updating Supabase progress:', error)
    return new Response(JSON.stringify({
      error: 'Failed to update progress',
      details: error.message
    }), {
      status: 500,
      headers
    })
  }
}