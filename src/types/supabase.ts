// Generated TypeScript types for Supabase database
// This file is auto-generated. Do not edit manually.

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
      }
      hunts: {
        Row: {
          id: string
          organization_id: string
          name: string
          start_date: string | null
          end_date: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          organization_id: string
          name: string
          start_date?: string | null
          end_date?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          start_date?: string | null
          end_date?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      teams: {
        Row: {
          id: string
          team_id: string
          organization_id: string
          hunt_id: string
          name: string
          display_name: string
          score: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          organization_id: string
          hunt_id: string
          name: string
          display_name: string
          score?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          organization_id?: string
          hunt_id?: string
          name?: string
          display_name?: string
          score?: number
          created_at?: string
          updated_at?: string
        }
      }
      team_codes: {
        Row: {
          code: string
          team_id: string | null
          organization_id: string | null
          hunt_id: string | null
          is_active: boolean
          created_at: string
          expires_at: string | null
          usage_count: number
          max_uses: number | null
        }
        Insert: {
          code: string
          team_id?: string | null
          organization_id?: string | null
          hunt_id?: string | null
          is_active?: boolean
          created_at?: string
          expires_at?: string | null
          usage_count?: number
          max_uses?: number | null
        }
        Update: {
          code?: string
          team_id?: string | null
          organization_id?: string | null
          hunt_id?: string | null
          is_active?: boolean
          created_at?: string
          expires_at?: string | null
          usage_count?: number
          max_uses?: number | null
        }
      }
      hunt_progress: {
        Row: {
          id: string
          team_id: string
          location_id: string
          done: boolean
          notes: string | null
          photo_url: string | null
          revealed_hints: number
          completed_at: string | null
          last_modified_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          location_id: string
          done?: boolean
          notes?: string | null
          photo_url?: string | null
          revealed_hints?: number
          completed_at?: string | null
          last_modified_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          location_id?: string
          done?: boolean
          notes?: string | null
          photo_url?: string | null
          revealed_hints?: number
          completed_at?: string | null
          last_modified_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      sessions: {
        Row: {
          id: string
          team_id: string
          user_agent: string | null
          device_hint: string | null
          ip_address: string | null
          created_at: string
          expires_at: string
          is_active: boolean
        }
        Insert: {
          id?: string
          team_id: string
          user_agent?: string | null
          device_hint?: string | null
          ip_address?: string | null
          created_at?: string
          expires_at?: string
          is_active?: boolean
        }
        Update: {
          id?: string
          team_id?: string
          user_agent?: string | null
          device_hint?: string | null
          ip_address?: string | null
          created_at?: string
          expires_at?: string
          is_active?: boolean
        }
      }
      settings: {
        Row: {
          id: string
          team_id: string
          organization_id: string | null
          hunt_id: string | null
          location_name: string | null
          event_name: string | null
          config: Record<string, any>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          organization_id?: string | null
          hunt_id?: string | null
          location_name?: string | null
          event_name?: string | null
          config?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          organization_id?: string | null
          hunt_id?: string | null
          location_name?: string | null
          event_name?: string | null
          config?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      leaderboard: {
        Row: {
          id: string
          team_id: string
          name: string
          display_name: string
          score: number
          organization_id: string
          hunt_id: string
          completed_locations: number
          last_completion: string | null
        }
      }
      leaderboard_cache: {
        Row: {
          id: string
          team_id: string
          name: string
          display_name: string
          score: number
          organization_id: string
          hunt_id: string
          completed_locations: number
          last_completion: string | null
          rank: number
          updated_at: string
        }
      }
      active_teams_with_progress: {
        Row: {
          id: string
          team_id: string
          name: string
          display_name: string
          score: number
          organization_id: string
          hunt_id: string
          created_at: string
          updated_at: string
          completed_locations: number
          total_locations: number
          completion_percentage: number
          last_activity: string | null
        }
      }
      team_session_summary: {
        Row: {
          team_id: string
          team_name: string
          organization_id: string
          hunt_id: string
          total_sessions: number
          active_sessions: number
          first_session: string | null
          latest_session: string | null
          hours_active: number | null
        }
      }
      progress_analytics: {
        Row: {
          location_id: string
          total_attempts: number
          completions: number
          completion_rate: number
          avg_hints_used: number
          first_attempt: string | null
          latest_completion: string | null
        }
      }
    }
    Functions: {
      recalculate_team_score: {
        Args: { team_uuid: string }
        Returns: undefined
      }
      cleanup_expired_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refresh_leaderboard_cache: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_team_ranking: {
        Args: {
          p_team_id: string
          p_organization_id: string
          p_hunt_id: string
        }
        Returns: {
          team_rank: number
          total_teams: number
          team_score: number
          team_completions: number
        }[]
      }
      get_location_difficulty_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          location_id: string
          difficulty_score: number
          avg_hints_needed: number
          completion_rate: number
          avg_completion_time_hours: number
        }[]
      }
      get_database_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          table_name: string
          row_count: number
          table_size: string
          index_size: string
          total_size: string
        }[]
      }
      get_slow_queries: {
        Args: Record<PropertyKey, never>
        Returns: {
          query: string
          calls: number
          total_time: number
          mean_time: number
          max_time: number
        }[]
      }
      test_rls_policies: {
        Args: Record<PropertyKey, never>
        Returns: {
          test_name: string
          result: string
          details: string
        }[]
      }
    }
  }
}

// Convenience type exports
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
export type Views<T extends keyof Database['public']['Views']> = Database['public']['Views'][T]['Row']

// Specific table types for convenience
export type Organization = Tables<'organizations'>
export type Hunt = Tables<'hunts'>
export type Team = Tables<'teams'>
export type TeamCode = Tables<'team_codes'>
export type HuntProgress = Tables<'hunt_progress'>
export type Session = Tables<'sessions'>
export type Settings = Tables<'settings'>

// View types
export type LeaderboardEntry = Views<'leaderboard'>
export type CachedLeaderboardEntry = Views<'leaderboard_cache'>
export type TeamWithProgress = Views<'active_teams_with_progress'>
export type TeamSessionSummary = Views<'team_session_summary'>
export type ProgressAnalytics = Views<'progress_analytics'>

// Function return types
export type TeamRankingResult = Database['public']['Functions']['get_team_ranking']['Returns'][0]
export type LocationDifficultyStats = Database['public']['Functions']['get_location_difficulty_stats']['Returns'][0]
export type DatabaseStats = Database['public']['Functions']['get_database_stats']['Returns'][0]
export type SlowQueryStats = Database['public']['Functions']['get_slow_queries']['Returns'][0]
export type RLSTestResult = Database['public']['Functions']['test_rls_policies']['Returns'][0]

// Application-specific types
export interface TeamWithStats extends Team {
  completed_locations: number
  total_locations: number
  completion_percentage: number
  rank?: number
}

export interface LocationProgress extends HuntProgress {
  location_name?: string
  difficulty_score?: number
}

export interface HuntSession extends Session {
  team_name?: string
  team_display_name?: string
}

// Form input types for components
export interface TeamRegistrationForm {
  team_code: string
  team_name?: string
  display_name?: string
}

export interface ProgressUpdateForm {
  location_id: string
  done: boolean
  notes?: string
  photo_file?: File
  revealed_hints?: number
}

export interface SettingsForm {
  location_name?: string
  event_name?: string
  config?: Record<string, any>
}

// API response types
export interface ApiResponse<T = any> {
  data?: T
  error?: string
  success: boolean
}

export interface LeaderboardResponse extends ApiResponse {
  data?: {
    teams: LeaderboardEntry[]
    user_team_rank?: number
    total_teams: number
  }
}

export interface ProgressResponse extends ApiResponse {
  data?: {
    progress: HuntProgress[]
    completed_count: number
    total_locations: number
  }
}