Why Supabase is Better for Your Use Case
Cost Comparison

Supabase Free Tier: Generous free tier (500MB database, 1GB storage, 2GB bandwidth)
Supabase Pro: $25/month (8GB database, 100GB storage, 250GB bandwidth)
Azure Cosmos DB: $20-30/month minimum for serverless

Technical Advantages

Relational Data: Your data is inherently relational (Organizations → Hunts → Teams → Progress)
Built-in Auth: Can replace your custom JWT implementation
Real-time Subscriptions: Perfect for live leaderboards
Row Level Security: Better security model for team data
Storage Built-in: Could potentially replace Cloudinary
Auto-generated APIs: Less code to write
PostgreSQL: More familiar than Cosmos DB's SQL API

Supabase Migration Plan for Vail Scavenger Hunt
Phase 0: Setup & Database Design
1. Create Supabase Project
bash# Create account at supabase.com
# Create new project "vail-scavenger-hunt"
# Note your project URL and API keys
2. Database Schema
sql-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Organizations table
CREATE TABLE organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hunts table
CREATE TABLE hunts (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, id)
);

-- Teams table
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id TEXT NOT NULL,
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  hunt_id TEXT NOT NULL,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (organization_id, hunt_id) REFERENCES hunts(organization_id, id),
  UNIQUE(organization_id, team_id, hunt_id)
);

-- Team codes table
CREATE TABLE team_codes (
  code TEXT PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  organization_id TEXT REFERENCES organizations(id),
  hunt_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  usage_count INTEGER DEFAULT 0,
  max_uses INTEGER DEFAULT NULL
);

-- Hunt progress table
CREATE TABLE hunt_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL,
  done BOOLEAN DEFAULT false,
  notes TEXT,
  photo_url TEXT,
  revealed_hints INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  last_modified_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, location_id)
);

-- Sessions table (with automatic expiration)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_agent TEXT,
  device_hint TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  is_active BOOLEAN DEFAULT true
);

-- Settings table
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  organization_id TEXT REFERENCES organizations(id),
  hunt_id TEXT,
  location_name TEXT,
  event_name TEXT,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_teams_org_hunt ON teams(organization_id, hunt_id);
CREATE INDEX idx_progress_team ON hunt_progress(team_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at) WHERE is_active = true;
CREATE INDEX idx_team_codes_active ON team_codes(code) WHERE is_active = true;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_hunt_progress_updated_at BEFORE UPDATE ON hunt_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean expired sessions (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  UPDATE sessions 
  SET is_active = false 
  WHERE expires_at < NOW() AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Create view for leaderboard
CREATE VIEW leaderboard AS
SELECT 
  t.id,
  t.team_id,
  t.name,
  t.display_name,
  t.score,
  t.organization_id,
  t.hunt_id,
  COUNT(CASE WHEN hp.done THEN 1 END) as completed_locations,
  MAX(hp.completed_at) as last_completion
FROM teams t
LEFT JOIN hunt_progress hp ON t.id = hp.team_id
GROUP BY t.id, t.team_id, t.name, t.display_name, t.score, t.organization_id, t.hunt_id
ORDER BY t.score DESC, completed_locations DESC;
Phase 1: Row Level Security (RLS)
sql-- Enable RLS on all tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE hunt_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create JWT auth function
CREATE OR REPLACE FUNCTION auth.team_id() 
RETURNS UUID AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'team_id',
    current_setting('request.jwt.claims', true)::json->>'sub'
  )::UUID
$$ LANGUAGE sql STABLE;

-- RLS Policies for teams
CREATE POLICY "Teams can view their own data" ON teams
  FOR SELECT USING (id = auth.team_id());

CREATE POLICY "Teams can update their own data" ON teams
  FOR UPDATE USING (id = auth.team_id());

-- RLS Policies for hunt_progress
CREATE POLICY "Teams can view their own progress" ON hunt_progress
  FOR SELECT USING (team_id = auth.team_id());

CREATE POLICY "Teams can update their own progress" ON hunt_progress
  FOR ALL USING (team_id = auth.team_id());

-- RLS Policies for sessions
CREATE POLICY "Teams can view their own sessions" ON sessions
  FOR SELECT USING (team_id = auth.team_id());

CREATE POLICY "Teams can create their own sessions" ON sessions
  FOR INSERT WITH CHECK (team_id = auth.team_id());

-- Public access for team code verification (before auth)
CREATE POLICY "Anyone can verify team codes" ON team_codes
  FOR SELECT USING (is_active = true);
Phase 2: Supabase Client & Types
1. Install Dependencies
bashnpm install @supabase/supabase-js @supabase/auth-helpers-react
npm install -D supabase
2. Initialize Supabase Client
typescript// src/lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      storage: localStorage,
      autoRefreshToken: true,
      detectSessionInUrl: false
    },
    db: {
      schema: 'public'
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
);

// Generate types with:
// npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/supabase/database.types.ts
3. Repository Pattern with Supabase
typescript// src/lib/supabase/repositories/TeamRepository.ts
import { supabase } from '../client';
import type { Database } from '../database.types';

type Team = Database['public']['Tables']['teams']['Row'];
type TeamInsert = Database['public']['Tables']['teams']['Insert'];
type HuntProgress = Database['public']['Tables']['hunt_progress']['Row'];

export class TeamRepository {
  async verifyTeamCode(code: string) {
    const { data, error } = await supabase
      .from('team_codes')
      .select(`
        *,
        teams!inner(*)
      `)
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !data) return null;

    // Increment usage count
    await supabase
      .from('team_codes')
      .update({ usage_count: data.usage_count + 1 })
      .eq('code', code);

    return data;
  }

  async createSession(teamId: string, metadata: any) {
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        team_id: teamId,
        user_agent: metadata.userAgent,
        device_hint: metadata.deviceHint,
        ip_address: metadata.ipAddress
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getTeamWithProgress(teamId: string) {
    const { data, error } = await supabase
      .from('teams')
      .select(`
        *,
        hunt_progress(*)
      `)
      .eq('id', teamId)
      .single();

    if (error) throw error;
    return data;
  }

  async updateProgress(
    teamId: string,
    locationId: string,
    progress: Partial<HuntProgress>
  ) {
    // Upsert progress
    const { data, error } = await supabase
      .from('hunt_progress')
      .upsert({
        team_id: teamId,
        location_id: locationId,
        ...progress,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'team_id,location_id'
      })
      .select()
      .single();

    if (error) throw error;

    // Update team score if location completed
    if (progress.done) {
      const { data: progressData } = await supabase
        .from('hunt_progress')
        .select('done')
        .eq('team_id', teamId)
        .eq('done', true);

      const score = (progressData?.length || 0) * 10;

      await supabase
        .from('teams')
        .update({ score })
        .eq('id', teamId);
    }

    return data;
  }

  async getLeaderboard(organizationId: string, huntId: string) {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('hunt_id', huntId)
      .order('score', { ascending: false })
      .limit(20);

    if (error) throw error;
    return data;
  }

  // Subscribe to real-time leaderboard updates
  subscribeToLeaderboard(
    organizationId: string,
    huntId: string,
    callback: (payload: any) => void
  ) {
    return supabase
      .channel('leaderboard-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teams',
          filter: `organization_id=eq.${organizationId},hunt_id=eq.${huntId}`
        },
        callback
      )
      .subscribe();
  }
}

export const teamRepository = new TeamRepository();
Phase 3: Netlify Functions with Supabase
1. Team Verification Function
typescript// netlify/functions/team-verify.ts
import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for admin access
);

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { code, deviceHint } = JSON.parse(event.body || '{}');

    // 1. Verify team code
    const { data: teamCode, error: codeError } = await supabase
      .from('team_codes')
      .select(`
        *,
        teams!inner(*)
      `)
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (codeError || !teamCode) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          error: 'That code didn\'t work. Check with your host.',
          code: 'TEAM_CODE_INVALID'
        })
      };
    }

    // 2. Create session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        team_id: teamCode.team_id,
        user_agent: event.headers['user-agent'] || '',
        device_hint: deviceHint,
        ip_address: event.headers['x-forwarded-for'] || event.headers['client-ip']
      })
      .select()
      .single();

    if (sessionError) throw sessionError;

    // 3. Generate Supabase custom JWT
    const { data: { session: authSession }, error: authError } = await supabase.auth.admin.createUser({
      email: `team-${teamCode.team_id}@vailhunt.local`,
      password: crypto.randomUUID(),
      email_confirm: true,
      user_metadata: {
        team_id: teamCode.team_id,
        team_name: teamCode.teams.display_name,
        organization_id: teamCode.organization_id,
        hunt_id: teamCode.hunt_id,
        session_id: session.id
      }
    });

    // 4. Sign in and get session token
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: `team-${teamCode.team_id}@vailhunt.local`,
      password: authSession?.user?.id || ''
    });

    // Return session data
    return {
      statusCode: 200,
      body: JSON.stringify({
        teamId: teamCode.team_id,
        teamName: teamCode.teams.display_name,
        session: signInData.session,
        sessionId: session.id,
        organizationId: teamCode.organization_id,
        huntId: teamCode.hunt_id
      })
    };

  } catch (error) {
    console.error('Team verification error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server error' })
    };
  }
};
2. Progress Update Function (Direct from Frontend)
typescript// src/services/HuntService.ts
import { supabase } from '../lib/supabase/client';

export class HuntService {
  async updateProgress(locationId: string, progress: any) {
    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const teamId = session.user.user_metadata.team_id;

    // Update progress directly (RLS ensures team can only update their own)
    const { data, error } = await supabase
      .from('hunt_progress')
      .upsert({
        team_id: teamId,
        location_id: locationId,
        ...progress
      }, {
        onConflict: 'team_id,location_id'
      })
      .select()
      .single();

    if (error) throw error;

    // Update score if completed
    if (progress.done) {
      await this.recalculateScore(teamId);
    }

    return data;
  }

  private async recalculateScore(teamId: string) {
    const { data } = await supabase
      .from('hunt_progress')
      .select('done')
      .eq('team_id', teamId)
      .eq('done', true);

    const score = (data?.length || 0) * 10;

    await supabase
      .from('teams')
      .update({ score })
      .eq('id', teamId);
  }

  async uploadPhoto(file: File, locationId: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const teamId = session.user.user_metadata.team_id;
    const fileName = `${teamId}/${locationId}/${Date.now()}.jpg`;

    // Option 1: Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('photos')
      .upload(fileName, file, {
        contentType: 'image/jpeg',
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('photos')
      .getPublicUrl(fileName);

    // Update progress with photo URL
    await this.updateProgress(locationId, {
      photo_url: publicUrl,
      done: true
    });

    return publicUrl;

    // Option 2: Keep using Cloudinary (call Netlify function)
    // return this.uploadToCloudinary(file, locationId);
  }
}
Phase 4: React Integration
1. Auth Context with Supabase
typescript// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase/client';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  teamData: any;
  signIn: (code: string) => Promise<void>;
  signOut: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [teamData, setTeamData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTeamData(session.user.user_metadata);
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTeamData(session.user.user_metadata);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (code: string) => {
    setIsLoading(true);
    try {
      // Call Netlify function to verify code
      const response = await fetch('/.netlify/functions/team-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      const data = await response.json();
      
      // Set Supabase session
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
      });

      setTeamData(data);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setTeamData(null);
  };

  return (
    <AuthContext.Provider value={{
      session,
      user,
      teamData,
      signIn,
      signOut,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
2. Real-time Leaderboard Component
typescript// src/components/Leaderboard.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase/client';
import { useAuth } from '../contexts/AuthContext';

export const Leaderboard: React.FC = () => {
  const { teamData } = useAuth();
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamData) return;

    // Initial load
    loadLeaderboard();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('leaderboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teams',
          filter: `organization_id=eq.${teamData.organization_id},hunt_id=eq.${teamData.hunt_id}`
        },
        () => {
          // Reload leaderboard on any change
          loadLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamData]);

  const loadLeaderboard = async () => {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .eq('organization_id', teamData.organization_id)
      .eq('hunt_id', teamData.hunt_id)
      .order('score', { ascending: false });

    if (!error && data) {
      setTeams(data);
    }
    setLoading(false);
  };

  if (loading) return <div>Loading leaderboard...</div>;

  return (
    <div className="leaderboard">
      <h2>Live Leaderboard</h2>
      {teams.map((team, index) => (
        <div key={team.id} className={`team-row ${team.id === teamData.team_id ? 'current-team' : ''}`}>
          <span className="rank">#{index + 1}</span>
          <span className="name">{team.display_name}</span>
          <span className="score">{team.score} pts</span>
          <span className="completed">{team.completed_locations} stops</span>
        </div>
      ))}
    </div>
  );
};
Phase 5: Migration Scripts
1. Data Migration from Netlify Blobs
javascript// scripts/migrate-to-supabase.js
const { createClient } = require('@supabase/supabase-js');
const { getStore } = require("@netlify/blobs");
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function migrate() {
  console.log('Starting migration to Supabase...\n');

  // Initialize Netlify Blobs
  const store = getStore({
    name: process.env.NETLIFY_BLOBS_STORE_NAME,
    token: process.env.NETLIFY_AUTH_TOKEN,
    siteID: process.env.NETLIFY_SITE_ID,
  });

  // 1. Import organizations and hunts from config
  const orgs = require('../src/data/teams/config.ts').organizations;
  
  for (const [orgId, orgData] of Object.entries(orgs)) {
    // Insert organization
    await supabase
      .from('organizations')
      .upsert({ id: orgId, name: orgData.name });
    
    console.log(`✓ Created organization: ${orgData.name}`);

    // Insert hunts
    for (const [huntId, huntData] of Object.entries(orgData.hunts)) {
      await supabase
        .from('hunts')
        .upsert({
          id: huntId,
          organization_id: orgId,
          name: huntData.name,
          is_active: true
        });
      
      console.log(`  ✓ Created hunt: ${huntData.name}`);

      // Insert teams
      for (const team of huntData.teams) {
        const { data: teamData } = await supabase
          .from('teams')
          .upsert({
            team_id: team.id,
            organization_id: orgId,
            hunt_id: huntId,
            name: team.displayName,
            display_name: team.displayName,
            score: 0
          })
          .select()
          .single();
        
        console.log(`    ✓ Created team: ${team.displayName}`);
      }
    }
  }

  // 2. Migrate progress data
  console.log('\nMigrating progress data...');
  const progressBlobs = await store.list({ prefix: "progress/" });
  
  for await (const blob of progressBlobs.blobs) {
    const data = await store.get(blob.key);
    if (data) {
      const progress = JSON.parse(data);
      const [, orgId, teamId, huntId] = blob.key.split('/');
      
      // Get team UUID
      const { data: team } = await supabase
        .from('teams')
        .select('id')
        .eq('team_id', teamId)
        .eq('organization_id', orgId)
        .eq('hunt_id', huntId)
        .single();

      if (team) {
        // Insert progress records
        for (const [locationId, locationProgress] of Object.entries(progress)) {
          await supabase
            .from('hunt_progress')
            .upsert({
              team_id: team.id,
              location_id: locationId,
              ...locationProgress
            });
        }
        console.log(`  ✓ Migrated progress for team ${teamId}`);
      }
    }
  }

  // 3. Import team codes
  console.log('\nImporting team codes...');
  const teamCodes = require('../src/data/team-codes.json');
  
  for (const code of teamCodes) {
    // Get team UUID
    const { data: team } = await supabase
      .from('teams')
      .select('id')
      .eq('team_id', code.teamId)
      .single();

    if (team) {
      await supabase
        .from('team_codes')
        .upsert({
          code: code.code.toUpperCase(),
          team_id: team.id,
          organization_id: code.organizationId || 'bhhs',
          hunt_id: code.huntId || 'fall-2025',
          is_active: true
        });
      
      console.log(`  ✓ Imported code: ${code.code}`);
    }
  }

  console.log('\n✅ Migration complete!');
}

migrate().catch(console.error);
Phase 6: Environment Configuration
bash# .env.production
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Cloudinary (keep for now, optional to replace)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Feature flags
VITE_USE_SUPABASE_STORAGE=false # Set true to replace Cloudinary
VITE_ENABLE_REALTIME=true
Comparison Summary
FeatureAzure Cosmos DBSupabaseWinnerCost$20-30/month minimumFree tier, then $25/month✅ SupabaseSetup ComplexityComplex (NoSQL, partitions)Simple (PostgreSQL)✅ SupabaseReal-time UpdatesRequires additional setupBuilt-in✅ SupabaseAuthenticationCustom JWT implementationBuilt-in Auth✅ SupabaseStorageSeparate (keep Cloudinary)Built-in Storage✅ SupabaseDeveloper ExperienceLearning curveFamiliar SQL✅ SupabaseHosting IntegrationWorks with NetlifyWorks with NetlifyTieScalabilityGlobal scaleRegional (can upgrade)AzureOpen SourceNoYes✅ Supabase
Recommendation
Go with Supabase for your scavenger hunt application because:

Lower Total Cost: Free tier covers development, Pro at $25/month vs Azure's $20-30 + extras
Simpler Implementation: PostgreSQL is easier than Cosmos DB's document model
Better Feature Fit: Built-in auth, real-time, and storage match your needs perfectly
Faster Development: Less code to write with auto-generated APIs and built-in features
Optional Cloudinary Replacement: Could save $89/month by using Supabase Storage

The only scenario where Azure Cosmos DB would be better is if you need true global distribution across multiple regions, which doesn't seem necessary for a Vail-based scavenger hunt.