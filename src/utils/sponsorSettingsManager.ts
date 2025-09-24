/**
 * Sponsor Settings Manager
 * Utility class for managing sponsor layout configuration
 * Integrates with existing settings system
 */

import { SponsorLayout, isSponsorLayout, DEFAULT_LAYOUT } from '../types/sponsors'

export class SponsorSettingsManager {
  /**
   * Update sponsor layout for an event
   * This could be called from an admin interface
   */
  static async updateLayout(
    organizationId: string,
    huntId: string,
    layout: SponsorLayout
  ): Promise<void> {
    if (!isSponsorLayout(layout)) {
      throw new Error(`Invalid layout: ${layout}. Must be one of: 1x1, 1x2, 1x3`)
    }

    try {
      // Check if settings-set endpoint exists, otherwise use generic API
      const response = await fetch('/.netlify/functions/settings-set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          huntId,
          key: 'sponsor_layout',
          value: layout
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to update layout: ${response.status} ${response.statusText}`)
      }

      console.log(`[SponsorSettingsManager] Layout updated to ${layout} for ${organizationId}/${huntId}`)

      // Clear any cached sponsor data for this org/hunt
      const { SponsorsService } = await import('../services/SponsorsService')
      SponsorsService.clearCacheFor(organizationId, huntId)

    } catch (error) {
      console.error('[SponsorSettingsManager] Failed to update layout:', error)
      throw error
    }
  }

  /**
   * Get current sponsor layout configuration
   */
  static async getLayout(
    organizationId: string,
    huntId: string
  ): Promise<SponsorLayout> {
    try {
      // Try to get from settings-get endpoint
      const response = await fetch('/.netlify/functions/settings-get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          huntId,
          key: 'sponsor_layout'
        })
      })

      if (!response.ok) {
        console.warn('[SponsorSettingsManager] Failed to get layout, using default')
        return DEFAULT_LAYOUT
      }

      const data = await response.json()
      const layout = data.value

      if (isSponsorLayout(layout)) {
        return layout
      }

      console.warn(`[SponsorSettingsManager] Invalid layout value: ${layout}, using default`)
      return DEFAULT_LAYOUT

    } catch (error) {
      console.warn('[SponsorSettingsManager] Error getting layout:', error)
      return DEFAULT_LAYOUT
    }
  }

  /**
   * Set layout directly via SQL (for admin scripts)
   * This method is for direct database access scenarios
   */
  static generateSetLayoutSQL(
    organizationId: string,
    huntId: string,
    layout: SponsorLayout
  ): string {
    if (!isSponsorLayout(layout)) {
      throw new Error(`Invalid layout: ${layout}. Must be one of: 1x1, 1x2, 1x3`)
    }

    return `
      INSERT INTO settings (organization_id, hunt_id, key, value, description)
      VALUES ('${organizationId}', '${huntId}', 'sponsor_layout', '${layout}', 'Sponsor card grid layout: 1x1, 1x2, or 1x3')
      ON CONFLICT (organization_id, hunt_id, key)
      DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = now()
      WHERE settings.organization_id = '${organizationId}'
        AND settings.hunt_id = '${huntId}'
        AND settings.key = 'sponsor_layout';
    `.trim()
  }

  /**
   * Validate layout value
   */
  static isValidLayout(layout: string): layout is SponsorLayout {
    return isSponsorLayout(layout)
  }

  /**
   * Get all valid layout options with descriptions
   */
  static getLayoutOptions() {
    return [
      {
        value: '1x1' as const,
        label: 'Single Column (1x1)',
        description: 'One sponsor per row - best for single major sponsor or large detailed logos'
      },
      {
        value: '1x2' as const,
        label: 'Two Columns (1x2)',
        description: 'Two sponsors per row - balanced desktop/mobile experience (default)'
      },
      {
        value: '1x3' as const,
        label: 'Three Columns (1x3)',
        description: 'Three sponsors per row - best for 3+ sponsors with simple logos'
      }
    ]
  }

  /**
   * Recommend layout based on number of sponsors
   */
  static recommendLayout(sponsorCount: number): SponsorLayout {
    if (sponsorCount === 1) {
      return '1x1'
    } else if (sponsorCount <= 4) {
      return '1x2'
    } else {
      return '1x3'
    }
  }

  /**
   * Validate feature flag status
   */
  static isFeatureEnabled(): boolean {
    // Check environment variable (works in both browser and Node.js)
    const browserEnv = typeof window !== 'undefined' && (window as any).VITE_ENABLE_SPONSOR_CARD
    const nodeEnv = typeof process !== 'undefined' && process.env.VITE_ENABLE_SPONSOR_CARD

    return browserEnv === 'true' || nodeEnv === 'true'
  }

  /**
   * Batch update layouts for multiple events
   */
  static async batchUpdateLayouts(
    updates: Array<{
      organizationId: string
      huntId: string
      layout: SponsorLayout
    }>
  ): Promise<{ successes: number; failures: number; errors: string[] }> {
    const results = {
      successes: 0,
      failures: 0,
      errors: [] as string[]
    }

    for (const update of updates) {
      try {
        await this.updateLayout(update.organizationId, update.huntId, update.layout)
        results.successes++
      } catch (error) {
        results.failures++
        results.errors.push(
          `${update.organizationId}/${update.huntId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }

    console.log(`[SponsorSettingsManager] Batch update complete: ${results.successes} successes, ${results.failures} failures`)
    return results
  }

  /**
   * Export current layout configurations (for backup/migration)
   */
  static async exportLayouts(): Promise<Array<{
    organizationId: string
    huntId: string
    layout: SponsorLayout
  }>> {
    // This would need to be implemented based on your settings storage system
    // For now, returns empty array as placeholder
    console.warn('[SponsorSettingsManager] exportLayouts not implemented - depends on settings system')
    return []
  }

  /**
   * Debug helper - get all sponsor-related settings
   */
  static async debugSettings(organizationId?: string, huntId?: string): Promise<any> {
    const params = {
      ...(organizationId && { organizationId }),
      ...(huntId && { huntId }),
      keyPrefix: 'sponsor_'
    }

    try {
      const response = await fetch('/.netlify/functions/settings-debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      })

      if (response.ok) {
        return await response.json()
      } else {
        console.warn('[SponsorSettingsManager] Debug endpoint not available')
        return { message: 'Debug endpoint not available' }
      }
    } catch (error) {
      console.warn('[SponsorSettingsManager] Debug request failed:', error)
      return { error: error instanceof Error ? error.message : 'Debug failed' }
    }
  }
}