/**
 * Zod schemas for type-safe API request/response validation
 */
import { z } from 'zod'

// Base schemas for common types
export const DateISOSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/, 'Invalid ISO date format')
export const SlugSchema = z.string().regex(/^[a-z0-9-]+$/, 'Invalid slug format')
export const GuidSchema = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, 'Invalid GUID format')

// Upload metadata schema - includes optional team, location, and event names
export const UploadMetaSchema = z.object({
  dateISO: DateISOSchema,
  locationSlug: SlugSchema,
  teamSlug: SlugSchema.optional(),
  sessionId: GuidSchema,
  eventName: z.string().optional(),
  teamName: z.string().optional(),
  locationName: z.string().optional(),
  locationTitle: z.string().optional()
})

// Photo upload response schema
export const UploadResponseSchema = z.object({
  photoUrl: z.string().url('Invalid photo URL'),
  publicId: z.string().min(1, 'Public ID required'),
  locationSlug: SlugSchema,
  title: z.string().min(1, 'Title required'),
  uploadedAt: DateISOSchema
})

// Photo record schema (extends upload response with locationId)
export const PhotoRecordSchema = UploadResponseSchema.extend({
  locationId: z.string().min(1, 'Location ID required')
})

// Collage creation response schema
export const CollageResponseSchema = z.object({
  collageUrl: z.string().url('Invalid collage URL'),
  uploaded: z.array(z.object({
    publicId: z.string(),
    secureUrl: z.string().url(),
    title: z.string()
  }))
})

// Collage from IDs response schema
export const CollageFromIdsResponseSchema = z.object({
  collageUrl: z.string().url('Invalid collage URL'),
  imageCount: z.number().int().positive('Image count must be positive'),
  publicIds: z.array(z.string())
})

// Key-Value storage schemas
export const KVUpsertSchema = z.object({
  key: z.string().min(1, 'Key required'),
  value: z.any(),
  indexes: z.array(z.object({
    key: z.string(),
    member: z.string()
  })).optional()
})

export const KVGetResponseSchema = z.object({
  key: z.string(),
  value: z.any(),
  exists: z.boolean()
})

export const KVListResponseSchema = z.object({
  keys: z.array(z.string()),
  total: z.number().int().nonnegative()
})

// Session data schema
export const SessionDataSchema = z.object({
  id: GuidSchema,
  location: z.string().min(1, 'Location required'),
  startTime: DateISOSchema,
  userAgent: z.string().optional(),
  teamName: z.string().optional(),
  eventName: z.string().optional()
})

// App settings schema
export const AppSettingsSchema = z.object({
  location: z.string().min(1, 'Location required'),
  team: z.string().optional(),
  event: z.string().optional(),
  updatedAt: DateISOSchema
})

// Error response schema
export const ErrorResponseSchema = z.object({
  error: z.string().min(1, 'Error message required'),
  details: z.string().optional(),
  status: z.number().int().optional()
})

// Export inferred types
export type UploadMeta = z.infer<typeof UploadMetaSchema>
export type UploadResponse = z.infer<typeof UploadResponseSchema>
export type PhotoRecord = z.infer<typeof PhotoRecordSchema>
export type CollageResponse = z.infer<typeof CollageResponseSchema>
export type CollageFromIdsResponse = z.infer<typeof CollageFromIdsResponseSchema>
export type KVUpsert = z.infer<typeof KVUpsertSchema>
export type KVGetResponse = z.infer<typeof KVGetResponseSchema>
export type KVListResponse = z.infer<typeof KVListResponseSchema>
export type SessionData = z.infer<typeof SessionDataSchema>
export type AppSettings = z.infer<typeof AppSettingsSchema>
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>

// Utility function to safely parse and validate data
export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown, context?: string): T {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      throw new Error(`Schema validation failed${context ? ` for ${context}` : ''}: ${errorMessage}`)
    }
    throw error
  }
}