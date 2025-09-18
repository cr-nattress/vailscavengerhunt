/**
 * Validation utilities for API endpoints
 */

export interface ValidationError {
  field: string
  message: string
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
}

/**
 * Validate settings data
 */
export function validateSettings(settings: any): ValidationResult {
  const errors: ValidationError[] = []

  // Required fields for settings (eventName is optional)
  const requiredFields = ['locationName', 'teamName', 'sessionId']

  for (const field of requiredFields) {
    if (!settings || !settings[field]) {
      errors.push({
        field,
        message: `${field} is required`
      })
    }
  }

  // Validate field types if present
  if (settings) {
    if (settings.locationName && typeof settings.locationName !== 'string') {
      errors.push({
        field: 'locationName',
        message: 'locationName must be a string'
      })
    }

    if (settings.teamName && typeof settings.teamName !== 'string') {
      errors.push({
        field: 'teamName',
        message: 'teamName must be a string'
      })
    }

    if (settings.sessionId && typeof settings.sessionId !== 'string') {
      errors.push({
        field: 'sessionId',
        message: 'sessionId must be a string'
      })
    }

    if (settings.eventName !== undefined && typeof settings.eventName !== 'string') {
      errors.push({
        field: 'eventName',
        message: 'eventName must be a string'
      })
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validate progress data
 */
export function validateProgress(progress: any): ValidationResult {
  const errors: ValidationError[] = []

  if (!progress || typeof progress !== 'object') {
    errors.push({
      field: 'progress',
      message: 'progress must be an object'
    })
    return { isValid: false, errors }
  }

  // Progress is a map of stopId to stop progress
  // Each stop progress should have certain fields
  for (const [stopId, stopData] of Object.entries(progress)) {
    // Skip metadata fields
    if (['lastModifiedBy', 'lastModifiedAt', 'teamName'].includes(stopId)) {
      continue
    }

    if (typeof stopData !== 'object') {
      errors.push({
        field: stopId,
        message: `Stop ${stopId} data must be an object`
      })
      continue
    }

    const stop = stopData as any

    // Validate boolean fields
    if (stop.done !== undefined && typeof stop.done !== 'boolean') {
      errors.push({
        field: `${stopId}.done`,
        message: 'done must be a boolean'
      })
    }

    // Validate photo URLs if present
    if (stop.photo !== undefined && stop.photo !== null &&
        typeof stop.photo !== 'string') {
      errors.push({
        field: `${stopId}.photo`,
        message: 'photo must be a string URL or null'
      })
    }

    // Validate timestamp if present
    if (stop.timestamp !== undefined && stop.timestamp !== null) {
      const timestamp = new Date(stop.timestamp)
      if (isNaN(timestamp.getTime())) {
        errors.push({
          field: `${stopId}.timestamp`,
          message: 'timestamp must be a valid date string'
        })
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validate stop update data
 */
export function validateStopUpdate(update: any): ValidationResult {
  const errors: ValidationError[] = []

  if (!update || typeof update !== 'object') {
    errors.push({
      field: 'update',
      message: 'update must be an object'
    })
    return { isValid: false, errors }
  }

  // Validate boolean fields
  if (update.done !== undefined && typeof update.done !== 'boolean') {
    errors.push({
      field: 'done',
      message: 'done must be a boolean'
    })
  }

  // Validate photo URL if present
  if (update.photo !== undefined && update.photo !== null &&
      typeof update.photo !== 'string') {
    errors.push({
      field: 'photo',
      message: 'photo must be a string URL or null'
    })
  }

  // Validate timestamp if present
  if (update.timestamp !== undefined && update.timestamp !== null) {
    const timestamp = new Date(update.timestamp)
    if (isNaN(timestamp.getTime())) {
      errors.push({
        field: 'timestamp',
        message: 'timestamp must be a valid date string'
      })
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validate organization ID format
 */
export function validateOrgId(orgId: string): boolean {
  // Must be alphanumeric with hyphens, 2-50 chars
  return /^[a-z0-9-]{2,50}$/i.test(orgId)
}

/**
 * Validate team ID format
 */
export function validateTeamId(teamId: string): boolean {
  // Must be alphanumeric with hyphens, 2-50 chars
  return /^[a-z0-9-]{2,50}$/i.test(teamId)
}

/**
 * Validate hunt ID format
 */
export function validateHuntId(huntId: string): boolean {
  // Must be alphanumeric with hyphens, 2-50 chars
  return /^[a-z0-9-]{2,50}$/i.test(huntId)
}

/**
 * Validate session ID format (UUID)
 */
export function validateSessionId(sessionId: string): boolean {
  // UUID v4 format
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)
}

/**
 * Create error response for validation errors
 */
export function createValidationErrorResponse(errors: ValidationError[]): Response {
  return new Response(JSON.stringify({
    error: 'Validation failed',
    details: errors
  }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' }
  })
}