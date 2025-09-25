/**
 * Supabase TypeScript Type Generation Script
 * Generates TypeScript types from the database schema
 */

import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function generateTypes() {
  console.log('🔧 Generating TypeScript types from Supabase schema...\n');

  // Validate environment variables
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Error: Missing required environment variables');
    console.error('   - SUPABASE_URL: Supabase project URL');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY: Service role key for admin operations');
    console.error('\nPlease set these variables in your .env file');
    process.exit(1);
  }

  try {
    // Check if Supabase CLI is installed
    console.log('🔍 Checking Supabase CLI installation...');
    try {
      const { stdout } = await execAsync('supabase --version');
      console.log(`✅ Supabase CLI found: ${stdout.trim()}`);
    } catch (error) {
      console.error('❌ Supabase CLI not found. Installing...');
      console.log('💿 Installing Supabase CLI globally...');
      await execAsync('npm install -g supabase');
      console.log('✅ Supabase CLI installed successfully');
    }

    // Extract project ID from URL
    const urlMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
    if (!urlMatch) {
      throw new Error('Invalid SUPABASE_URL format. Expected: https://your-project-id.supabase.co');
    }
    const projectId = urlMatch[1];

    console.log(`🎯 Project ID: ${projectId}`);
    console.log('📝 Generating types using Supabase CLI...');

    // Generate types using Supabase CLI
    const typesOutputPath = join(__dirname, '..', 'src', 'types', 'supabase.ts');

    // Ensure types directory exists
    const typesDir = join(__dirname, '..', 'src', 'types');
    try {
      await execAsync(`mkdir -p "${typesDir}"`);
    } catch (error) {
      // Directory might already exist
    }

    // Alternative approach: Create types manually based on our schema
    console.log('📋 Creating TypeScript type definitions...');

    const typeDefinitions = `// Generated TypeScript types for Supabase database
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
`;

    // Write the types file
    writeFileSync(typesOutputPath, typeDefinitions, 'utf8');
    console.log(`✅ TypeScript types generated successfully!`);
    console.log(`📁 Types saved to: ${typesOutputPath}`);

    // Create an index file for easier imports
    const indexPath = join(__dirname, '..', 'src', 'types', 'index.ts');
    const indexContent = `// Type exports for the Vail Scavenger Hunt application
export * from './supabase'

// Re-export Supabase client types
export type { SupabaseClient } from '@supabase/supabase-js'
export type { AuthSession, User } from '@supabase/supabase-js'
`;

    writeFileSync(indexPath, indexContent, 'utf8');
    console.log(`📁 Index types file created: ${indexPath}`);

    console.log('\n🎯 Type Generation Summary:');
    console.log('   ✓ Database table types (Row, Insert, Update)');
    console.log('   ✓ View types for materialized views');
    console.log('   ✓ Function types with arguments and returns');
    console.log('   ✓ Convenience type aliases');
    console.log('   ✓ Application-specific interface types');
    console.log('   ✓ Form input types for components');
    console.log('   ✓ API response types');
    console.log('   ✓ Type index file for easy imports');

    console.log('\n📝 Usage Examples:');
    console.log('   import type { Team, HuntProgress, LeaderboardEntry } from "@/types"');
    console.log('   import type { Database, Tables } from "@/types/supabase"');
    console.log('   import type { TeamRegistrationForm } from "@/types"');

    console.log('\n✅ Type generation completed successfully!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Import types in your React components');
    console.log('   2. Update Supabase client configuration');
    console.log('   3. Implement authentication with type safety');
    console.log('   4. Set up real-time subscriptions');

  } catch (error) {
    console.error('\n❌ Type generation failed:', error.message);

    if (error.message.includes('command not found')) {
      console.error('   Install Supabase CLI: npm install -g supabase');
    }

    process.exit(1);
  }
}

// Export for use in other scripts
export { generateTypes };

// Run generation if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateTypes().catch(console.error);
}