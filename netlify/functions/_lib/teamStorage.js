/**
 * Team storage utilities for Netlify Functions
 * Handles team data and team code mappings using Netlify Blobs
 */
const { getStore } = require('@netlify/blobs')

class TeamStorage {
  static get BLOB_STORE_NAME() {
    return process.env.NETLIFY_BLOBS_STORE_NAME || 'vail-hunt-state'
  }

  static get TABLE_STORE_NAME() {
    return process.env.TEAM_TABLE_NAME || 'team-mappings'
  }

  /**
   * Get team code mapping from Table Storage (simulated with Netlify Blobs)
   */
  static async getTeamCodeMapping(teamCode) {
    try {
      const store = getStore(this.TABLE_STORE_NAME)
      const key = `team:${teamCode}`

      const data = await store.get(key, { type: 'json' })
      if (!data) return null

      // Validate basic structure
      if (!data.teamId || !data.teamName || typeof data.isActive !== 'boolean') {
        console.warn('[TeamStorage] Invalid team code mapping structure')
        return null
      }

      return data
    } catch (error) {
      console.error('[TeamStorage] Failed to get team code mapping:', error)
      return null
    }
  }

  /**
   * Store team code mapping in Table Storage
   */
  static async setTeamCodeMapping(mapping) {
    try {
      // Validate required fields
      if (!mapping.rowKey || !mapping.teamId || !mapping.teamName) {
        throw new Error('Missing required mapping fields')
      }

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
  static async getTeamData(teamId) {
    try {
      const store = getStore(this.BLOB_STORE_NAME)
      const key = `teams/team_${teamId}.json`

      const result = await store.get(key, { type: 'json' })
      if (!result) return { data: null, etag: null }

      // Simple ETag simulation using timestamp
      const etag = result.updatedAt || Date.now().toString()

      return { data: result, etag }
    } catch (error) {
      console.error('[TeamStorage] Failed to get team data:', error)
      return { data: null, etag: null }
    }
  }

  /**
   * Store team data in Blob Storage with ETag support
   */
  static async setTeamData(teamData, expectedEtag) {
    try {
      // Validate required fields
      if (!teamData.teamId || !teamData.name) {
        throw new Error('Missing required team data fields')
      }

      const store = getStore(this.BLOB_STORE_NAME)
      const key = `teams/team_${teamData.teamId}.json`

      // Check ETag for optimistic concurrency if provided
      if (expectedEtag) {
        const { data: currentData } = await this.getTeamData(teamData.teamId)
        if (currentData && currentData.updatedAt !== expectedEtag) {
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

      const newEtag = updatedData.updatedAt

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
  static async createTeam(teamId, teamName) {
    try {
      const teamData = {
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
  static async updateTeamProgress(teamId, progress, expectedEtag) {
    try {
      const { data: currentData, etag: currentEtag } = await this.getTeamData(teamId)
      if (!currentData) {
        console.error('[TeamStorage] Team not found for progress update')
        return { success: false }
      }

      // Use provided ETag or current ETag for concurrency control
      const useEtag = expectedEtag || currentEtag

      const updatedData = {
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

module.exports = { TeamStorage }