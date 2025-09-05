export interface PathParams {
  location?: string
  event?: string
  team?: string
}

/**
 * Parse `/location/event/team` from a pathname.
 * - Ignores leading/trailing slashes
 * - Requires exactly 3 non-empty segments
 * - Returns {} if segments are missing/blank or on error
 */
export function getPathParams(pathname: string): PathParams {
  try {
    const raw = (pathname || '').trim()
    const cleaned = raw.replace(/^\/+|\/+$/g, '') // trim leading/trailing slashes
    if (!cleaned) return {}

    const parts = cleaned.split('/').filter(Boolean)
    if (parts.length !== 3) return {}

    const [location, event, team] = parts.map((s) => s.trim()).filter((s) => typeof s === 'string')
    if (!location || !event || !team) return {}

    return { location, event, team }
  } catch {
    return {}
  }
}

/**
 * True when all three params are present and non-empty after trimming.
 */
export function isValidParamSet(params: PathParams): boolean {
  return !!(params.location && params.event && params.team)
}

/**
 * Normalize user-provided params.
 * - Trims whitespace
 * - Collapses multiple spaces
 * - Optional mapping for known locations
 */
export function normalizeParams(params: PathParams): PathParams {
  const normalize = (s?: string) =>
    (s ?? '')
      .toString()
      .trim()
      .replace(/\s+/g, ' ')

  const locationMap: Record<string, string> = {
    bhhs: 'BHHS',
    'vail valley': 'Vail Valley',
    'vail village': 'Vail Village',
  }

  const loc = normalize(params.location)
  const evt = normalize(params.event)
  const team = normalize(params.team)

  const locKey = loc.toLowerCase()
  const mappedLocation = locationMap[locKey] ?? loc

  return {
    location: mappedLocation,
    event: evt,
    team,
  }
}
