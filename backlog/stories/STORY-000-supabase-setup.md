# STORY-000: Supabase Infrastructure Setup

## Story Details
**Epic:** EPIC-001 (Blob to Supabase Migration)
**Priority:** CRITICAL - Blocker
**Status:** COMPLETED ✅
**Estimated:** 2 days
**Actual:** 1 hour

## User Story
**As a** developer
**I want to** set up Supabase infrastructure
**So that** we can begin migrating from blob storage

## Acceptance Criteria
- [ ] Supabase project created and accessible
- [ ] All database tables created from schema
- [ ] RLS policies configured and tested
- [ ] Environment variables documented
- [ ] Client utility created and tested
- [ ] Connection verified from local environment
- [ ] Connection verified from Netlify functions

## Technical Tasks

### Task 1: Create Supabase Project
```bash
# Prompt for AI Assistant:
Help me create a new Supabase project for the Vail Scavenger Hunt application.
I need to:
1. Set up a new Supabase project
2. Get the project URL and API keys
3. Configure the project settings for production use
4. Enable the required extensions (uuid-ossp)
```

### Task 2: Execute Database Schema (NON-DESTRUCTIVE)
```bash
# Prompt for AI Assistant:
IMPORTANT: Use the SAFE version of the schema that won't delete existing data!
Execute the SQL schema located at scripts/sql/supabase-migration-schema-safe.sql in my Supabase project.

This schema is NON-DESTRUCTIVE and will:
- Only create tables if they don't exist
- Add missing columns to existing tables
- Create indexes only if they don't exist
- Skip existing policies and triggers

Verify that all of these tables exist (created or already existing):
- device_locks
- debug_logs
- kv_store
- team_progress
- team_mappings
- hunt_settings

The script will output a summary showing what was created vs what already existed.
```

### Task 3: Configure Environment Variables
```bash
# Prompt for AI Assistant:
Update the following files with Supabase environment variables:
1. Create/update .env.local with SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
2. Update netlify.toml to include these variables in the build environment
3. Create .env.example with placeholder values
4. Update any GitHub Actions workflows that need these variables
Ensure no actual keys are committed to the repository.
```

### Task 4: Create Supabase Client Utility
```bash
# Prompt for AI Assistant:
Create netlify/functions/_lib/supabaseClient.js that provides:
1. A singleton Supabase client initialized with service role key
2. Helper method for handling connection errors
3. Retry logic for transient failures (3 retries with exponential backoff)
4. Methods for common operations (upsert, bulk insert, etc.)
5. Proper error logging without exposing sensitive data

The client should work both locally and in Netlify Functions environment.
```

### Task 5: Test Connectivity
```bash
# Prompt for AI Assistant:
Create a test script scripts/test-supabase-connection.js that:
1. Tests connection to Supabase from local environment
2. Performs basic CRUD operations on each table
3. Verifies RLS policies are working correctly
4. Tests that triggers are functioning (e.g., updated_at timestamps)
5. Outputs a summary of test results

Also create a simple Netlify function test-supabase.js that verifies connectivity from the functions environment.
```

## Dependencies
- None (this is the first story)

## Testing Requirements
- Manual verification of Supabase project setup
- Automated connection tests must pass
- CRUD operations work on all tables
- Environment variables load correctly

## Definition of Done
- [x] Supabase project is live and accessible
- [x] All tables, indexes, and RLS policies created
- [x] Environment variables configured in all necessary places
- [x] Supabase client utility created and working
- [x] Connection tests pass from local and Netlify
- [x] Documentation updated with setup instructions
- [x] No sensitive keys in repository

## Notes
- This is a blocker for all other stories - must be completed first
- Keep service role key secure - never expose to client
- Document the Supabase project URL and region for team
- Set up backup schedule in Supabase dashboard
- **IMPORTANT**: The schema is NON-DESTRUCTIVE - safe to run multiple times
- **IMPORTANT**: Will not delete or modify existing data, only adds missing objects