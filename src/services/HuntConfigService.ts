/**
 * HuntConfigService - Manages configurable hunt stops and ordering
 */

import { SupabaseClient } from '@supabase/supabase-js'
import {
  HuntStop,
  HuntStopWithProgress,
  CreateStopRequest,
  UpdateStopRequest,
  AddStopToHuntRequest,
  UpdateHuntOrderingRequest,
  TeamProgressSummary,
  HuntAdminConfig,
  OrderingStrategy,
  HuntConfigService as IHuntConfigService
} from '../types/hunt-system'

export class HuntConfigService implements IHuntConfigService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get ordered stops for a hunt with optional team progress
   */
  async getHuntStops(
    orgId: string,
    huntId: string,
    teamId?: string
  ): Promise<HuntStopWithProgress[]> {
    const { data, error } = await this.supabase.rpc('get_hunt_stops', {
      p_organization_id: orgId,
      p_hunt_id: huntId,
      p_team_id: teamId || null
    })

    if (error) {
      console.error('[HuntConfigService] Error fetching hunt stops:', error)
      throw new Error(`Failed to fetch hunt stops: ${error.message}`)
    }

    return data || []
  }

  /**
   * Create a new hunt stop
   */
  async createStop(stop: CreateStopRequest): Promise<HuntStop> {
    const { data, error } = await this.supabase
      .from('hunt_stops')
      .insert({
        stop_id: stop.stop_id,
        title: stop.title,
        description: stop.description,
        clue: stop.clue,
        hints: stop.hints,
        position_lat: stop.position?.lat,
        position_lng: stop.position?.lng
      })
      .select()
      .single()

    if (error) {
      console.error('[HuntConfigService] Error creating stop:', error)
      throw new Error(`Failed to create stop: ${error.message}`)
    }

    return data
  }

  /**
   * Update an existing hunt stop
   */
  async updateStop(stopId: string, updates: UpdateStopRequest): Promise<HuntStop> {
    const updateData: any = {}

    if (updates.title !== undefined) updateData.title = updates.title
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.clue !== undefined) updateData.clue = updates.clue
    if (updates.hints !== undefined) updateData.hints = updates.hints
    if (updates.position?.lat !== undefined) updateData.position_lat = updates.position.lat
    if (updates.position?.lng !== undefined) updateData.position_lng = updates.position.lng

    const { data, error } = await this.supabase
      .from('hunt_stops')
      .update(updateData)
      .eq('stop_id', stopId)
      .select()
      .single()

    if (error) {
      console.error('[HuntConfigService] Error updating stop:', error)
      throw new Error(`Failed to update stop: ${error.message}`)
    }

    return data
  }

  /**
   * Add a stop to a hunt configuration
   */
  async addStopToHunt(request: AddStopToHuntRequest): Promise<void> {
    const { error } = await this.supabase.rpc('add_stop_to_hunt', {
      p_organization_id: request.organization_id,
      p_hunt_id: request.hunt_id,
      p_stop_id: request.stop_id,
      p_default_order: request.default_order || null
    })

    if (error) {
      console.error('[HuntConfigService] Error adding stop to hunt:', error)
      throw new Error(`Failed to add stop to hunt: ${error.message}`)
    }
  }

  /**
   * Remove a stop from a hunt configuration
   */
  async removeStopFromHunt(orgId: string, huntId: string, stopId: string): Promise<void> {
    const { error } = await this.supabase
      .from('hunt_configurations')
      .update({ is_active: false })
      .eq('organization_id', orgId)
      .eq('hunt_id', huntId)
      .eq('stop_id', stopId)

    if (error) {
      console.error('[HuntConfigService] Error removing stop from hunt:', error)
      throw new Error(`Failed to remove stop from hunt: ${error.message}`)
    }
  }

  /**
   * Update hunt ordering strategy
   */
  async updateHuntOrdering(request: UpdateHuntOrderingRequest): Promise<void> {
    const { error } = await this.supabase
      .from('hunt_ordering_config')
      .upsert({
        organization_id: request.organization_id,
        hunt_id: request.hunt_id,
        ordering_strategy: request.ordering_strategy,
        seed_strategy: request.seed_strategy || 'team_based'
      })

    if (error) {
      console.error('[HuntConfigService] Error updating hunt ordering:', error)
      throw new Error(`Failed to update hunt ordering: ${error.message}`)
    }

    // If switching to randomized, regenerate all team orders
    if (request.ordering_strategy === 'randomized') {
      await this.regenerateAllTeamOrders(request.organization_id, request.hunt_id)
    }
  }

  /**
   * Initialize a team for a hunt (create progress entries and ordering)
   */
  async initializeTeamForHunt(teamId: string, orgId: string, huntId: string): Promise<void> {
    const { error } = await this.supabase.rpc('initialize_team_for_hunt', {
      p_team_id: teamId,
      p_organization_id: orgId,
      p_hunt_id: huntId
    })

    if (error) {
      console.error('[HuntConfigService] Error initializing team for hunt:', error)
      throw new Error(`Failed to initialize team for hunt: ${error.message}`)
    }
  }

  /**
   * Regenerate stop order for a specific team
   */
  async regenerateTeamOrder(teamId: string, orgId: string, huntId: string): Promise<void> {
    const { error } = await this.supabase.rpc('generate_team_stop_order', {
      p_team_id: teamId,
      p_organization_id: orgId,
      p_hunt_id: huntId
    })

    if (error) {
      console.error('[HuntConfigService] Error regenerating team order:', error)
      throw new Error(`Failed to regenerate team order: ${error.message}`)
    }
  }

  /**
   * Get team progress summary
   */
  async getTeamProgress(teamId: string): Promise<TeamProgressSummary> {
    // Get team info
    const { data: teamData, error: teamError } = await this.supabase
      .from('teams')
      .select('team_id, name, organization_id, hunt_id')
      .eq('id', teamId)
      .single()

    if (teamError) {
      throw new Error(`Failed to fetch team data: ${teamError.message}`)
    }

    // Get stops with progress
    const stops = await this.getHuntStops(
      teamData.organization_id,
      teamData.hunt_id,
      teamId
    )

    const completedStops = stops.filter(s => s.is_completed).length
    const totalStops = stops.length
    const completionPercentage = totalStops > 0 ? (completedStops / totalStops) * 100 : 0

    // Find current stop (first incomplete)
    const currentStopOrder = stops.find(s => !s.is_completed)?.step_order || totalStops + 1
    const nextStop = stops.find(s => s.step_order === currentStopOrder)

    // Get last completion time
    const { data: lastCompletedData } = await this.supabase
      .from('hunt_progress')
      .select('completed_at')
      .eq('team_id', teamId)
      .eq('done', true)
      .order('completed_at', { ascending: false })
      .limit(1)
      .single()

    return {
      team_id: teamId,
      team_name: teamData.name,
      organization_id: teamData.organization_id,
      hunt_id: teamData.hunt_id,
      total_stops: totalStops,
      completed_stops: completedStops,
      completion_percentage: Math.round(completionPercentage),
      current_stop_order: currentStopOrder,
      next_stop: nextStop,
      last_completed_at: lastCompletedData?.completed_at
    }
  }

  /**
   * Get hunt admin configuration
   */
  async getHuntAdminConfig(orgId: string, huntId: string): Promise<HuntAdminConfig> {
    // Get hunt info
    const { data: huntData, error: huntError } = await this.supabase
      .from('hunts')
      .select('name, is_active')
      .eq('organization_id', orgId)
      .eq('id', huntId)
      .single()

    if (huntError) {
      throw new Error(`Failed to fetch hunt data: ${huntError.message}`)
    }

    // Get ordering config
    const { data: orderingData } = await this.supabase
      .from('hunt_ordering_config')
      .select('ordering_strategy, seed_strategy')
      .eq('organization_id', orgId)
      .eq('hunt_id', huntId)
      .single()

    // Get stops configuration with stats
    const { data: stopsData, error: stopsError } = await this.supabase
      .from('hunt_configurations')
      .select(`
        stop_id,
        default_order,
        is_active,
        hunt_stops!inner(title)
      `)
      .eq('organization_id', orgId)
      .eq('hunt_id', huntId)
      .order('default_order')

    if (stopsError) {
      throw new Error(`Failed to fetch stops data: ${stopsError.message}`)
    }

    // Get team count
    const { count: teamCount } = await this.supabase
      .from('teams')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('hunt_id', huntId)

    const activeStops = stopsData?.filter(s => s.is_active) || []

    return {
      organization_id: orgId,
      hunt_id: huntId,
      name: huntData.name,
      is_active: huntData.is_active,
      ordering_strategy: orderingData?.ordering_strategy || 'fixed',
      seed_strategy: orderingData?.seed_strategy || 'team_based',
      total_stops: stopsData?.length || 0,
      active_stops: activeStops.length,
      total_teams: teamCount || 0,
      stops: activeStops.map(stop => ({
        stop_id: stop.stop_id,
        title: (stop.hunt_stops as any).title,
        default_order: stop.default_order,
        is_active: stop.is_active,
        completion_rate: 0, // TODO: Calculate from hunt_progress
        avg_completion_time: undefined // TODO: Calculate from hunt_progress
      }))
    }
  }

  /**
   * Regenerate orders for all teams in a hunt
   */
  private async regenerateAllTeamOrders(orgId: string, huntId: string): Promise<void> {
    const { data: teams, error } = await this.supabase
      .from('teams')
      .select('id')
      .eq('organization_id', orgId)
      .eq('hunt_id', huntId)

    if (error) {
      console.error('[HuntConfigService] Error fetching teams:', error)
      return
    }

    for (const team of teams || []) {
      await this.regenerateTeamOrder(team.id, orgId, huntId)
    }
  }
}