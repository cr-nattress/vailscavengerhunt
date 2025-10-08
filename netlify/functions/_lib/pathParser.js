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

// CommonJS exports
module.exports = {
  parseConsolidatedPath,
  parseProgressPath,
  parseTeamPath,
 * @throws {Error} If path format is invalid or missing required params
 */
function parseConsolidatedPath(path) {
  if (!path) {
    throw new Error('Path is required')
  }

  let pathToProcess = path
{{ ... }}
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
{{ ... }}
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
{{ ... }}
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
{{ ... }}
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
{{ ... }}

module.exports = {
  parseConsolidatedPath,
  parseProgressPath,
  parseTeamPath,
  parseGenericPath,
  getQueryParams,
  validateParams
}
