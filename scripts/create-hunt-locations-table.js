import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

async function createHuntLocationsTable() {
  console.log('Creating hunt_locations table...');

  // Note: Supabase doesn't support creating tables via the JS client
  // You need to run this SQL in the Supabase dashboard SQL editor

  const sql = `
-- Create hunt_locations table
CREATE TABLE IF NOT EXISTS hunt_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id TEXT NOT NULL,
  hunt_id TEXT NOT NULL,
  name TEXT,
  title TEXT,
  description TEXT,
  clue TEXT,
  hints TEXT[],
  latitude NUMERIC,
  longitude NUMERIC,
  address TEXT,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_hunt_locations_org_hunt
  ON hunt_locations (organization_id, hunt_id);

-- Enable Row Level Security
ALTER TABLE hunt_locations ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (for development)
CREATE POLICY "Enable all operations for hunt_locations" ON hunt_locations
  FOR ALL USING (true);
  `;

  console.log('Please run the following SQL in your Supabase dashboard SQL editor:');
  console.log('============================================================');
  console.log(sql);
  console.log('============================================================');
  console.log('\nAfter creating the table, run: node scripts/setup-hunt-locations.js');
}

// Run the function
createHuntLocationsTable();