/**
 * Path parsing utilities for Netlify functions (CommonJS)
 * Handles various path formats for extracting orgId, teamId, huntId parameters
 */

function parseConsolidatedPath(path) {
  if (!path) {
    throw new Error('Path is required')
  }

  let pathToProcess = path

  const prefixes = [
    '/.netlify/functions/consolidated-active/',
    '/.netlify/functions/consolidated-history/',
    '/.netlify/functions/consolidated-rankings/',
    '/.netlify/functions/consolidated-updates/',
    '/consolidated-active/',
    '/consolidated-history/',
    '/consolidated-rankings/',
    '/consolidated-updates/',
    '/api/consolidated/active/',
    '/api/consolidated/history/',
    '/api/consolidated/rankings/',
    '/api/consolidated/updates/'
  ]

  for (const prefix of prefixes) {
    if (pathToProcess.includes(prefix)) {
      pathToProcess = pathToProcess.split(prefix)[1]
      break
    }
  }

  const pathParts = pathToProcess.replace(/^\/+|\/+$/g, '').split('/')

  if (pathParts.length < 3) {
    throw new Error(
      `Invalid path format: expected 3 parts (orgId/teamId/huntId), got ${pathParts.length}: ${pathParts.join('/')}`
    )
  }

  const [orgId, teamId, huntId] = pathParts

  if (!orgId || !teamId || !huntId) {
    throw new Error(
      `Missing required path parameters: orgId=${orgId}, teamId=${teamId}, huntId=${huntId}`
    )
  }

  return { orgId, teamId, huntId }
}

function parseProgressPath(path) {
  if (!path) {
    throw new Error('Path is required')
  }

  let pathToProcess = path

  const prefixes = [
    '/.netlify/functions/progress-get-supabase/',
    '/.netlify/functions/progress-set-supabase/',
    '/.netlify/functions/progress-patch-supabase/',
    '/api/progress/'
  ]

  for (const prefix of prefixes) {
    if (pathToProcess.includes(prefix)) {
      pathToProcess = pathToProcess.split(prefix)[1]
      break
    }
  }

  const pathParts = pathToProcess.replace(/^\/+|\/+$/g, '').split('/')

  if (pathParts.length < 3) {
    throw new Error(
      `Invalid progress path: expected 3 parts, got ${pathParts.length}`
    )
  }

  const [orgId, teamId, huntId] = pathParts

  if (!orgId || !teamId || !huntId) {
    throw new Error('Missing required path parameters for progress')
  }

  return { orgId, teamId, huntId }
}

function parseTeamPath(path, requireHuntId = true) {
  if (!path) {
    throw new Error('Path is required')
  }

  let pathToProcess = path

  const prefixes = [
    '/.netlify/functions/team-verify/',
    '/.netlify/functions/team-setup/',
    '/.netlify/functions/team-current/',
    '/api/team/'
  ]

  for (const prefix of prefixes) {
    if (pathToProcess.includes(prefix)) {
      pathToProcess = pathToProcess.split(prefix)[1]
      break
    }
  }

  const pathParts = pathToProcess.replace(/^\/+|\/+$/g, '').split('/')

  const minParts = requireHuntId ? 3 : 2
  if (pathParts.length < minParts) {
    throw new Error(
      `Invalid team path: expected ${minParts} parts, got ${pathParts.length}`
    )
  }

  const [orgId, teamId, huntId] = pathParts

  if (!orgId || !teamId) {
    throw new Error('Missing required path parameters: orgId and teamId')
  }

  if (requireHuntId && !huntId) {
    throw new Error('Missing required path parameter: huntId')
  }

  return huntId ? { orgId, teamId, huntId } : { orgId, teamId }
}

function parseGenericPath(path, functionName = 'function') {
  if (!path) {
    throw new Error(`[${functionName}] Path is required`)
  }

  let cleanPath = path
  if (path.includes('/.netlify/functions/')) {
    const parts = path.split('/.netlify/functions/')
    if (parts[1]) {
      const afterFunction = parts[1].split('/').slice(1).join('/')
      cleanPath = afterFunction
    }
  }

  const pathParts = cleanPath.replace(/^\/+|\/+$/g, '').split('/')

  if (pathParts.length >= 3) {
    const [orgId, teamId, huntId] = pathParts
    if (orgId && teamId && huntId) {
      return { orgId, teamId, huntId }
    }
  }

  throw new Error(
    `[${functionName}] Invalid path format: expected orgId/teamId/huntId, got: ${cleanPath}`
  )
}

function getQueryParams(event) {
  return event.queryStringParameters || {}
}

function validateParams(params, required = []) {
  const missing = required.filter(key => !params[key])
  if (missing.length > 0) {
    throw new Error(`Missing required parameters: ${missing.join(', ')}`)
  }
}

module.exports = {
  parseConsolidatedPath,
  parseProgressPath,
  parseTeamPath,
  parseGenericPath,
  getQueryParams,
  validateParams
}
