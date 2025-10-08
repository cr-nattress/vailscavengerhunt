/**
 * Path parsing utilities for Netlify functions
 * Handles various path formats for extracting orgId, teamId, huntId parameters
 */

/**
 * Parse consolidated endpoint path formats
 * Supports:
 * - /consolidated-active/org/team/hunt
 * - /.netlify/functions/consolidated-active/org/team/hunt
 * - /api/consolidated/active/org/team/hunt
 *
 * @param {string} path - The request path
 * @returns {{ orgId: string, teamId: string, huntId: string }}
 * @throws {Error} If path format is invalid or missing required params
 */
function parseConsolidatedPath(path) {
  if (!path) {
    throw new Error('Path is required')
  }

  let pathToProcess = path

  // Strip common prefixes
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

  // Remove leading/trailing slashes and split
  const pathParts = pathToProcess.replace(/^\/|\/$/g, '').split('/')

  if (pathParts.length < 3) {
    throw new Error(
      `Invalid path format: expected 3 parts (orgId/teamId/huntId), got ${pathParts.length}: ${pathParts.join('/')}`
    )
  }

  const [orgId, teamId, huntId] = pathParts

  // Validate required params
  if (!orgId || !teamId || !huntId) {
    throw new Error(
      `Missing required path parameters: orgId=${orgId}, teamId=${teamId}, huntId=${huntId}`
    )
  }

  return { orgId, teamId, huntId }
}

/**
 * Parse progress endpoint path formats
 * Supports:
 * - /progress/:orgId/:teamId/:huntId
 * - /.netlify/functions/progress-get-supabase/:orgId/:teamId/:huntId
 *
 * @param {string} path - The request path
 * @returns {{ orgId: string, teamId: string, huntId: string }}
 * @throws {Error} If path format is invalid
 */
function parseProgressPath(path) {
  if (!path) {
    throw new Error('Path is required')
  }

  let pathToProcess = path

  // Strip function prefixes
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

  const pathParts = pathToProcess.replace(/^\/|\/$/g, '').split('/')

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

/**
 * Parse team endpoint path formats
 * Supports:
 * - /team/:orgId/:teamId/:huntId
 * - /team/:orgId/:teamId
 *
 * @param {string} path - The request path
 * @param {boolean} requireHuntId - Whether huntId is required (default: true)
 * @returns {{ orgId: string, teamId: string, huntId?: string }}
 * @throws {Error} If path format is invalid
 */
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

  const pathParts = pathToProcess.replace(/^\/|\/$/g, '').split('/')

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

/**
 * Parse generic 3-part path (orgId/teamId/huntId)
 * More lenient parser for endpoints with varying formats
 *
 * @param {string} path - The request path
 * @param {string} functionName - Name of the function for error messages
 * @returns {{ orgId: string, teamId: string, huntId: string }}
 */
function parseGenericPath(path, functionName = 'function') {
  if (!path) {
    throw new Error(`[${functionName}] Path is required`)
  }

  // Remove /.netlify/functions/{name}/ prefix if present
  let cleanPath = path
  if (path.includes('/.netlify/functions/')) {
    const parts = path.split('/.netlify/functions/')
    if (parts[1]) {
      const afterFunction = parts[1].split('/').slice(1).join('/')
      cleanPath = afterFunction
    }
  }

  const pathParts = cleanPath.replace(/^\/|\/$/g, '').split('/')

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

/**
 * Extract query parameters from event
 *
 * @param {object} event - Netlify function event
 * @returns {object} Query parameters object
 */
function getQueryParams(event) {
  return event.queryStringParameters || {}
}

/**
 * Validate path parameters match expected pattern
 *
 * @param {object} params - Parsed parameters
 * @param {string[]} required - Required parameter names
 * @throws {Error} If any required parameter is missing
 */
function validateParams(params, required = []) {
  const missing = required.filter(key => !params[key])

  if (missing.length > 0) {
    throw new Error(`Missing required parameters: ${missing.join(', ')}`)
  }
}

// CommonJS exports for Netlify functions
module.exports = {
  parseConsolidatedPath,
  parseProgressPath,
  parseTeamPath,
  parseGenericPath,
  getQueryParams,
  validateParams
}
