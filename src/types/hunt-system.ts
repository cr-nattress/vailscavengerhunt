/**
 * Enhanced Hunt System Types for Configurable Stops and Ordering
 */

// Database table types
export interface HuntStop {
  id: string
  stop_id: string
  title: string
  description?: string
  clue: string
  hints: string[]
  position_lat?: number
  position_lng?: number
  created_at: string
  updated_at: string
}

export interface HuntConfiguration {
  id: string
  organization_id: string
  hunt_id: string
  stop_id: string
  is_active: boolean
  default_order: number
  created_at: string
  updated_at: string
}

export type OrderingStrategy = 'fixed' | 'randomized'
export type SeedStrategy = 'team_based' | 'global'

export interface HuntOrderingConfig {
  id: string
  organization_id: string
  hunt_id: string
  ordering_strategy: OrderingStrategy
  seed_strategy: SeedStrategy
  created_at: string
  updated_at: string
}

export interface TeamStopOrder {
  id: string
  team_id: string
  stop_id: string
  step_order: number
  created_at: string
}

// Function return types
export interface HuntStopWithProgress {
  stop_id: string
  title: string
  description?: string
  clue: string
  hints: string[]
  position_lat?: number
  position_lng?: number
  step_order: number
  is_completed: boolean
}

// Configuration interfaces for admin/setup
export interface StopConfiguration {
  stop_id: string
  title: string
  description?: string
  clue: string
  hints: string[]
  position?: {
    lat: number
    lng: number
  }
}

export interface HuntSetupConfig {
  organization_id: string
  hunt_id: string
  name: string
  ordering_strategy: OrderingStrategy
  stops: Array<{
    stop_id: string
    default_order?: number
    is_active?: boolean
  }>
}

// API interfaces
export interface CreateStopRequest {
  stop_id: string
  title: string
  description?: string
  clue: string
  hints: string[]
  position?: {
    lat: number
    lng: number
  }
}

export interface UpdateStopRequest extends Partial<CreateStopRequest> {
  stop_id: string
}

export interface AddStopToHuntRequest {
  organization_id: string
  hunt_id: string
  stop_id: string
  default_order?: number
}

export interface UpdateHuntOrderingRequest {
  organization_id: string
  hunt_id: string
  ordering_strategy: OrderingStrategy
  seed_strategy?: SeedStrategy
}

export interface TeamProgressSummary {
  team_id: string
  team_name: string
  organization_id: string
  hunt_id: string
  total_stops: number
  completed_stops: number
  completion_percentage: number
  current_stop_order: number
  next_stop?: HuntStopWithProgress
  last_completed_at?: string
}

// Hunt admin interfaces
export interface HuntAdminConfig {
  organization_id: string
  hunt_id: string
  name: string
  is_active: boolean
  ordering_strategy: OrderingStrategy
  seed_strategy: SeedStrategy
  total_stops: number
  active_stops: number
  total_teams: number
  stops: Array<{
    stop_id: string
    title: string
    default_order: number
    is_active: boolean
    completion_rate: number
    avg_completion_time?: number
  }>
}

// Migration helpers for existing data
export interface LegacyLocationData {
  id: string
  title: string
  clue: string
  hints: string[]
  position?: {
    lat: number
    lng: number
  }
  description?: string
  address?: string
}

export interface LegacyHuntConfig {
  name: string
  locations: LegacyLocationData[]
}

// Utility types
export type StopOrderingMode = 'fixed' | 'randomized'
export type HuntPhase = 'setup' | 'active' | 'completed' | 'archived'

export interface HuntMetadata {
  organization_id: string
  hunt_id: string
  name: string
  phase: HuntPhase
  start_date?: string
  end_date?: string
  participant_count: number
  stop_count: number
  completion_rate: number
  ordering_strategy: OrderingStrategy
}

// Event types for real-time updates
export interface HuntProgressEvent {
  type: 'stop_completed' | 'stop_started' | 'hint_revealed' | 'team_finished'
  team_id: string
  stop_id?: string
  timestamp: string
  data?: Record<string, any>
}

export interface LeaderboardUpdate {
  team_id: string
  team_name: string
  score: number
  completed_stops: number
  rank: number
  rank_change: number
}

// Hook return types for React components
export interface UseHuntStopsReturn {
  stops: HuntStopWithProgress[]
  currentStop?: HuntStopWithProgress
  nextStop?: HuntStopWithProgress
  totalStops: number
  completedStops: number
  completionPercentage: number
  isLoading: boolean
  error?: string
  refreshStops: () => Promise<void>
}

export interface UseHuntConfigReturn {
  config?: HuntOrderingConfig
  isLoading: boolean
  error?: string
  updateOrderingStrategy: (strategy: OrderingStrategy) => Promise<void>
  regenerateTeamOrders: () => Promise<void>
}

// Service interfaces
export interface HuntConfigService {
  getHuntStops(orgId: string, huntId: string, teamId?: string): Promise<HuntStopWithProgress[]>
  createStop(stop: CreateStopRequest): Promise<HuntStop>
  updateStop(stopId: string, updates: UpdateStopRequest): Promise<HuntStop>
  addStopToHunt(request: AddStopToHuntRequest): Promise<void>
  removeStopFromHunt(orgId: string, huntId: string, stopId: string): Promise<void>
  updateHuntOrdering(request: UpdateHuntOrderingRequest): Promise<void>
  initializeTeamForHunt(teamId: string, orgId: string, huntId: string): Promise<void>
  regenerateTeamOrder(teamId: string, orgId: string, huntId: string): Promise<void>
  getTeamProgress(teamId: string): Promise<TeamProgressSummary>
  getHuntAdminConfig(orgId: string, huntId: string): Promise<HuntAdminConfig>
}