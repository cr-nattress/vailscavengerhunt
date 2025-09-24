/**
 * useHuntStops - React hook for managing hunt stops and progress
 */

import { useState, useEffect, useCallback } from 'react'
import { HuntConfigService } from '../services/HuntConfigService'
import { HuntStopWithProgress, UseHuntStopsReturn } from '../types/hunt-system'

export function useHuntStops(
  supabaseClient: any,
  orgId: string,
  huntId: string,
  teamId?: string
): UseHuntStopsReturn {
  const [stops, setStops] = useState<HuntStopWithProgress[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>()

  const huntService = new HuntConfigService(supabaseClient)

  const fetchStops = useCallback(async () => {
    if (!orgId || !huntId) return

    try {
      setIsLoading(true)
      setError(undefined)

      const stopsData = await huntService.getHuntStops(orgId, huntId, teamId)
      setStops(stopsData)
    } catch (err) {
      console.error('[useHuntStops] Error fetching stops:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch hunt stops')
    } finally {
      setIsLoading(false)
    }
  }, [orgId, huntId, teamId])

  const refreshStops = useCallback(async () => {
    await fetchStops()
  }, [fetchStops])

  useEffect(() => {
    fetchStops()
  }, [fetchStops])

  // Calculate derived values
  const completedStops = stops.filter(stop => stop.is_completed).length
  const totalStops = stops.length
  const completionPercentage = totalStops > 0 ? Math.round((completedStops / totalStops) * 100) : 0

  // Find current and next stops
  const currentStop = stops.find(stop => !stop.is_completed)
  const nextStopIndex = currentStop ? stops.findIndex(s => s.stop_id === currentStop.stop_id) + 1 : -1
  const nextStop = nextStopIndex >= 0 && nextStopIndex < stops.length ? stops[nextStopIndex] : undefined

  return {
    stops,
    currentStop,
    nextStop,
    totalStops,
    completedStops,
    completionPercentage,
    isLoading,
    error,
    refreshStops
  }
}

/**
 * useHuntConfig - Hook for managing hunt configuration
 */
export function useHuntConfig(
  supabaseClient: any,
  orgId: string,
  huntId: string
) {
  const [config, setConfig] = useState<any>()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>()

  const huntService = new HuntConfigService(supabaseClient)

  const fetchConfig = useCallback(async () => {
    if (!orgId || !huntId) return

    try {
      setIsLoading(true)
      setError(undefined)

      const { data, error: configError } = await supabaseClient
        .from('hunt_ordering_config')
        .select('*')
        .eq('organization_id', orgId)
        .eq('hunt_id', huntId)
        .single()

      if (configError && configError.code !== 'PGRST116') {
        throw configError
      }

      setConfig(data)
    } catch (err) {
      console.error('[useHuntConfig] Error fetching config:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch hunt config')
    } finally {
      setIsLoading(false)
    }
  }, [orgId, huntId, supabaseClient])

  const updateOrderingStrategy = useCallback(async (strategy: 'fixed' | 'randomized') => {
    try {
      await huntService.updateHuntOrdering({
        organization_id: orgId,
        hunt_id: huntId,
        ordering_strategy: strategy
      })
      await fetchConfig() // Refresh config
    } catch (err) {
      console.error('[useHuntConfig] Error updating strategy:', err)
      throw err
    }
  }, [orgId, huntId, huntService, fetchConfig])

  const regenerateTeamOrders = useCallback(async () => {
    try {
      // Get all teams in this hunt
      const { data: teams, error } = await supabaseClient
        .from('teams')
        .select('id')
        .eq('organization_id', orgId)
        .eq('hunt_id', huntId)

      if (error) throw error

      // Regenerate order for each team
      for (const team of teams || []) {
        await huntService.regenerateTeamOrder(team.id, orgId, huntId)
      }
    } catch (err) {
      console.error('[useHuntConfig] Error regenerating team orders:', err)
      throw err
    }
  }, [orgId, huntId, huntService, supabaseClient])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  return {
    config,
    isLoading,
    error,
    updateOrderingStrategy,
    regenerateTeamOrders
  }
}

/**
 * useTeamProgress - Hook for team progress tracking
 */
export function useTeamProgress(
  supabaseClient: any,
  teamId: string
) {
  const [progress, setProgress] = useState<any>()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>()

  const huntService = new HuntConfigService(supabaseClient)

  const fetchProgress = useCallback(async () => {
    if (!teamId) return

    try {
      setIsLoading(true)
      setError(undefined)

      const progressData = await huntService.getTeamProgress(teamId)
      setProgress(progressData)
    } catch (err) {
      console.error('[useTeamProgress] Error fetching progress:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch team progress')
    } finally {
      setIsLoading(false)
    }
  }, [teamId, huntService])

  useEffect(() => {
    fetchProgress()
  }, [fetchProgress])

  return {
    progress,
    isLoading,
    error,
    refreshProgress: fetchProgress
  }
}