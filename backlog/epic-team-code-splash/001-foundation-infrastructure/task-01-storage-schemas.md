# Task 001.01: Define Storage Schemas and Validation

## Problem
Need to establish the data structures for team code mappings, team data, and client lock state that align with existing schema patterns in the codebase.

## Solution
Create TypeScript interfaces and Zod schemas following the existing patterns in `src/types/schemas.ts`.

## Implementation

### 1. Add Team Lock Schemas to schemas.ts
```typescript
// Team code mapping (Table Storage)
export const TeamCodeMappingSchema = z.object({
  partitionKey: z.literal('team'),
  rowKey: z.string().min(1, 'Team code required'), // teamCode
  teamId: z.string().min(1, 'Team ID required'),
  teamName: z.string().min(1, 'Team name required'),
  isActive: z.boolean(),
  createdAt: DateISOSchema,
  eventId: z.string().optional()
})

// Team data (Blob Storage)
export const TeamDataSchema = z.object({
  teamId: z.string().min(1, 'Team ID required'),
  name: z.string().min(1, 'Team name required'),
  score: z.number().int().nonnegative().default(0),
  huntProgress: ProgressDataSchema.default({}),
  updatedAt: DateISOSchema
})

// Client lock state (localStorage)
export const TeamLockSchema = z.object({
  teamId: z.string().min(1, 'Team ID required'),
  issuedAt: z.number().int().positive('Issue timestamp required'),
  expiresAt: z.number().int().positive('Expiry timestamp required'),
  teamCodeHash: z.string().min(1, 'Team code hash required'),
  lockToken: z.string().min(1, 'Lock token required')
})

// Lock token payload (server-side)
export const LockTokenPayloadSchema = z.object({
  teamId: z.string().min(1),
  exp: z.number().int().positive(),
  iat: z.number().int().positive(),
  sub: z.literal('team-lock')
})

// Export inferred types
export type TeamCodeMapping = z.infer<typeof TeamCodeMappingSchema>
export type TeamData = z.infer<typeof TeamDataSchema>
export type TeamLock = z.infer<typeof TeamLockSchema>
export type LockTokenPayload = z.infer<typeof LockTokenPayloadSchema>
```

### 2. Add API Request/Response Schemas
```typescript
// Team verification request
export const TeamVerifyRequestSchema = z.object({
  code: z.string().min(1, 'Team code required'),
  deviceHint: z.string().optional()
})

// Team verification response
export const TeamVerifyResponseSchema = z.object({
  teamId: z.string().min(1),
  teamName: z.string().min(1),
  lockToken: z.string().min(1),
  ttlSeconds: z.number().int().positive()
})

// Export inferred types
export type TeamVerifyRequest = z.infer<typeof TeamVerifyRequestSchema>
export type TeamVerifyResponse = z.infer<typeof TeamVerifyResponseSchema>
```

## Benefits
- Type safety across team lock system
- Consistent validation with existing patterns
- Runtime validation prevents data corruption
- Clear documentation of data structures

## Success Criteria
- [ ] All schemas added to `src/types/schemas.ts`
- [ ] Schemas follow existing patterns (GuidSchema, DateISOSchema, etc.)
- [ ] TypeScript types exported for use in services
- [ ] Validation functions work with existing `validateSchema` utility
- [ ] No breaking changes to existing schemas

## Files Modified
- `src/types/schemas.ts` - Add new schemas and types

## Dependencies
- Uses existing schema utilities (DateISOSchema, ProgressDataSchema)
- Follows validation patterns established in codebase