/**
 * Team setup utility function for development
 * Creates test team code mappings
 */
const { SupabaseTeamStorage } = require('./_lib/supabaseTeamStorage')
const crypto = require('crypto')

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    }
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Parse input and dynamically create team code mappings (no hard-coded codes)
    const body = JSON.parse(event.body || '{}')

    // Supported inputs:
    // - body.mappings: [{ code, teamId, teamName, isActive?, organizationId?, huntId? }]
    // - body.teams: [{ name, teamId?, code? }]
    // - body.generate: { count, prefix?, length? }
    const orgId = body.organizationId || process.env.DEFAULT_ORG_ID || 'bhhs'
    const huntId = body.huntId || process.env.DEFAULT_HUNT_ID || 'fall-2025'
    const defaultIsActive = typeof body.isActive === 'boolean' ? body.isActive : true

    function slugify(value) {
      return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
    }

    function randomCode(len = (body.generate?.length || 6)) {
      const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
      const bytes = crypto.randomBytes(len)
      let out = ''
      for (let i = 0; i < bytes.length; i++) {
        out += chars[bytes[i] % chars.length]
      }
      return (body.generate?.prefix || '') + out
    }

    const mappings = []

    if (Array.isArray(body.mappings) && body.mappings.length > 0) {
      for (const m of body.mappings) {
        const code = String(m.code || m.rowKey || randomCode()).toUpperCase()
        const teamName = m.teamName || m.name || `Team ${code}`
        const teamId = m.teamId || `TEAM_${slugify(teamName)}`
        mappings.push({
          partitionKey: 'team',
          rowKey: code,
          teamId,
          teamName,
          isActive: typeof m.isActive === 'boolean' ? m.isActive : defaultIsActive,
          createdAt: new Date().toISOString(),
          organizationId: m.organizationId || orgId,
          huntId: m.huntId || huntId
        })
      }
    } else if (Array.isArray(body.teams) && body.teams.length > 0) {
      let idx = 1
      for (const t of body.teams) {
        const teamName = t.teamName || t.name || `Team ${idx}`
        const teamId = t.teamId || `TEAM_${slugify(teamName)}_${String(idx).padStart(3, '0')}`
        const code = String(t.code || randomCode()).toUpperCase()
        mappings.push({
          partitionKey: 'team',
          rowKey: code,
          teamId,
          teamName,
          isActive: defaultIsActive,
          createdAt: new Date().toISOString(),
          organizationId: orgId,
          huntId
        })
        idx++
      }
    } else if (body.generate && Number(body.generate.count) > 0) {
      const count = Math.min(Number(body.generate.count), 100)
      for (let i = 1; i <= count; i++) {
        const code = randomCode().toUpperCase()
        const teamName = `Team ${i}`
        const teamId = `TEAM_${slugify(teamName)}_${String(i).padStart(3, '0')}`
        mappings.push({
          partitionKey: 'team',
          rowKey: code,
          teamId,
          teamName,
          isActive: defaultIsActive,
          createdAt: new Date().toISOString(),
          organizationId: orgId,
          huntId
        })
      }
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Provide either mappings[], teams[], or generate { count } in the request body.' })
      }
    }

    const results = []
    for (const mapping of mappings) {
      // Transform the mapping to Supabase format
      const supabaseMapping = {
        teamCode: mapping.rowKey,
        teamId: mapping.teamId,
        teamName: mapping.teamName,
        isActive: mapping.isActive,
        organizationId: mapping.organizationId,
        huntId: mapping.huntId
      }

      const success = await SupabaseTeamStorage.setTeamCodeMapping(supabaseMapping)
      results.push({
        teamCode: mapping.rowKey,
        teamName: mapping.teamName,
        success
      })
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Team mappings created',
        total: results.length,
        results
      })
    }

  } catch (error) {
    console.error('[team-setup] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}