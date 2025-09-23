# Task 001.03: Build Storage Utility Functions

## Problem
Need storage helper functions for Table Storage (team code mappings) and Blob Storage (team data) that follow existing patterns from the Netlify Functions.

## Solution
Create storage utilities that integrate with existing Netlify storage patterns and provide type-safe team data operations.

## Implementation

### 1. Create Storage Helper Module
```typescript
// netlify/functions/_lib/teamStorage.ts
import { getStore } from '@netlify/blobs'
import { TeamCodeMapping, TeamData, TeamCodeMappingSchema, TeamDataSchema, validateSchema } from '../../../src/types/schemas'

export class TeamStorage {
  private static readonly BLOB_STORE_NAME = process.env.NETLIFY_BLOBS_STORE_NAME || 'vail-hunt-state'
  private static readonly TABLE_STORE_NAME = process.env.TEAM_TABLE_NAME || 'team-mappings'

  /**
   * Get team code mapping from Table Storage
   */
  static async getTeamCodeMapping(teamCode: string): Promise<TeamCodeMapping | null> {
    try {
      // In production, this would use actual Table Storage
      // For now, simulate with Netlify Blobs using table-like keys
      const store = getStore(this.TABLE_STORE_NAME)
      const key = `team:${teamCode}`

      const data = await store.get(key, { type: 'json' })
      if (!data) return null

      return validateSchema(TeamCodeMappingSchema, data, 'team code mapping')
    } catch (error) {
      console.error('[TeamStorage] Failed to get team code mapping:', error)
      return null
    }
  }

  /**
   * Store team code mapping in Table Storage
   */
  static async setTeamCodeMapping(mapping: TeamCodeMapping): Promise<boolean> {
    try {
      // Validate before storing
      validateSchema(TeamCodeMappingSchema, mapping, 'team code mapping')

      const store = getStore(this.TABLE_STORE_NAME)
      const key = `team:${mapping.rowKey}`

      await store.set(key, JSON.stringify(mapping))
      console.log(`[TeamStorage] Team code mapping stored: ${mapping.rowKey}`)
      return true
    } catch (error) {
      console.error('[TeamStorage] Failed to store team code mapping:', error)
      return false
    }
  }

  /**
   * Get team data from Blob Storage
   */
  static async getTeamData(teamId: string): Promise<{ data: TeamData | null, etag: string | null }> {
    try {
      const store = getStore(this.BLOB_STORE_NAME)
      const key = `teams/team_${teamId}.json`

      const result = await store.get(key, { type: 'json' })
      if (!result) return { data: null, etag: null }

      // Netlify Blobs provides ETag-like functionality via metadata
      const etag = await store.getMetadata(key).then(meta => meta?.etag || null)

      const data = validateSchema(TeamDataSchema, result, 'team data')
      return { data, etag }
    } catch (error) {
      console.error('[TeamStorage] Failed to get team data:', error)
      return { data: null, etag: null }
    }
  }

  /**
   * Store team data in Blob Storage with ETag support
   */
  static async setTeamData(teamData: TeamData, expectedEtag?: string): Promise<{ success: boolean, etag?: string }> {
    try {
      // Validate before storing
      validateSchema(TeamDataSchema, teamData, 'team data')

      const store = getStore(this.BLOB_STORE_NAME)
      const key = `teams/team_${teamData.teamId}.json`

      // Check ETag for optimistic concurrency
      if (expectedEtag) {
        const currentMeta = await store.getMetadata(key)
        if (currentMeta?.etag && currentMeta.etag !== expectedEtag) {
          console.warn('[TeamStorage] ETag mismatch, concurrent modification detected')
          return { success: false }
        }
      }

      // Update timestamp
      const updatedData = {
        ...teamData,
        updatedAt: new Date().toISOString()
      }

      await store.set(key, JSON.stringify(updatedData))

      // Get new ETag
      const newMeta = await store.getMetadata(key)
      const newEtag = newMeta?.etag || Date.now().toString()

      console.log(`[TeamStorage] Team data stored: ${teamData.teamId}`)
      return { success: true, etag: newEtag }
    } catch (error) {
      console.error('[TeamStorage] Failed to store team data:', error)
      return { success: false }
    }
  }

  /**
   * Create new team with initial data
   */
  static async createTeam(teamId: string, teamName: string): Promise<TeamData | null> {
    try {
      const teamData: TeamData = {
        teamId,
        name: teamName,
        score: 0,
        huntProgress: {},
        updatedAt: new Date().toISOString()
      }

      const result = await this.setTeamData(teamData)
      return result.success ? teamData : null
    } catch (error) {
      console.error('[TeamStorage] Failed to create team:', error)
      return null
    }
  }

  /**
   * Update team progress with optimistic concurrency
   */
  static async updateTeamProgress(
    teamId: string,
    progress: Record<string, any>,
    expectedEtag?: string
  ): Promise<{ success: boolean, etag?: string }> {
    try {
      const { data: currentData, etag: currentEtag } = await this.getTeamData(teamId)
      if (!currentData) {
        console.error('[TeamStorage] Team not found for progress update')
        return { success: false }
      }

      // Use provided ETag or current ETag for concurrency control
      const useEtag = expectedEtag || currentEtag

      const updatedData: TeamData = {
        ...currentData,
        huntProgress: progress,
        updatedAt: new Date().toISOString()
      }

      return await this.setTeamData(updatedData, useEtag)
    } catch (error) {
      console.error('[TeamStorage] Failed to update team progress:', error)
      return { success: false }
    }
  }
}
```

### 2. Create Team Service Integration
```typescript
// src/services/TeamService.ts
import { TeamVerifyRequest, TeamVerifyResponse, validateSchema, TeamVerifyRequestSchema } from '../types/schemas'

export class TeamService {
  private static readonly BASE_URL = '/api'

  /**
   * Verify team code and get lock token
   */
  static async verifyTeamCode(request: TeamVerifyRequest): Promise<TeamVerifyResponse | null> {
    try {
      // Validate request
      validateSchema(TeamVerifyRequestSchema, request, 'team verify request')

      const response = await fetch(`${this.BASE_URL}/team-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        throw new Error(`Team verification failed: ${response.statusText}`)
      }

      const data = await response.json()
      return validateSchema(TeamVerifyResponseSchema, data, 'team verify response')
    } catch (error) {
      console.error('[TeamService] Team verification failed:', error)
      return null
    }
  }

  /**
   * Get current team context from lock token
   */
  static async getCurrentTeam(): Promise<{ teamId: string, teamName: string } | null> {
    const lockToken = TeamLockService.getLockToken()
    if (!lockToken) return null

    try {
      const response = await fetch(`${this.BASE_URL}/team-current`, {
        headers: {
          'X-Team-Lock': lockToken
        }
      })

      if (!response.ok) return null

      const data = await response.json()
      return {
        teamId: data.teamId,
        teamName: data.teamName
      }
    } catch (error) {
      console.error('[TeamService] Failed to get current team:', error)
      return null
    }
  }
}
```

## Benefits
- Type-safe storage operations with validation
- ETag-based optimistic concurrency control
- Integration with existing Netlify Blobs patterns
- Clear separation between Table Storage (mappings) and Blob Storage (data)

## Success Criteria
- [ ] Storage helpers follow existing Netlify Functions patterns
- [ ] Type validation using established schemas
- [ ] ETag support for conflict resolution
- [ ] Error handling with appropriate logging
- [ ] Integration with existing storage infrastructure

## Files Created
- `netlify/functions/_lib/teamStorage.ts` - Storage utilities
- `src/services/TeamService.ts` - Client-side team operations

## Dependencies
- Existing `@netlify/blobs` integration
- Schema validation utilities
- TeamLockService for token management

## Environment Variables Used
- `NETLIFY_BLOBS_STORE_NAME` - Blob storage container
- `TEAM_TABLE_NAME` - Table storage name (simulated with blobs)