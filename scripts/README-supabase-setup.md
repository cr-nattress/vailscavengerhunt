# Supabase Database Setup Guide

This guide explains how to set up your Supabase database with all the necessary tables and data for the Vail Scavenger Hunt application.

## Prerequisites

1. **Supabase Account**: Make sure you have a Supabase project created
2. **Database Access**: Access to the Supabase SQL Editor in your project dashboard

## Setup Steps

### Step 1: Create Database Schema

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Create a new query
4. Copy and paste the entire contents of `supabase-schema.sql`
5. Click **Run** to execute the schema creation

This will create:
- All necessary tables (organizations, hunts, teams, team_codes, settings, etc.)
- Indexes for performance
- Triggers for automatic updates
- Views for leaderboards
- Sample organizations and hunts

### Step 2: Import Application Data

1. In the SQL Editor, create another new query
2. Copy and paste the entire contents of `supabase-data-import.sql`
3. Click **Run** to execute the data import

This will populate:

#### Organizations
- **bhhs**: Berkshire Hathaway HomeServices
- **vail**: Vail Valley

#### Hunts
- **fall-2025** (under bhhs)
- **valley-default** (under vail)
- **village-default** (under vail)

#### Teams (BHHS Fall 2025)
- berrypicker (Berrypicker)
- poppyfieldswest (Poppyfields West)
- teacup (Tea Cup)
- simba (Simba)
- whippersnapper (Whippersnapper)
- minniesmile (Minnie's Mile)
- bornfree (Born Free)
- lookma (Look Ma)
- loversleap (Lover's Leap)
- forever (Forever)
- team-alpha (Team Alpha) - for testing

#### Team Access Codes
- **ALPHA01** → Team Alpha (for testing)
- **BERRY01** → Berrypicker
- **POPPY01** → Poppyfields West
- **TEACUP01** → Tea Cup
- **SIMBA01** → Simba
- **WHIP01** → Whippersnapper
- **MINNIE01** → Minnie's Mile
- **BORN01** → Born Free
- **LOOKMA01** → Look Ma
- **LOVERS01** → Lover's Leap
- **FOREVER01** → Forever

#### Settings & Sample Data
- Default settings entries for all teams
- Sample hunt progress for demonstration teams
- Proper relationships between all tables

## Verification

After running both scripts, you should see the following in your database:

### Check Data Import Success
The import script will display a summary showing record counts for each table:
- Organizations: 2
- Hunts: 3
- Teams: 11
- Team Codes: 11
- Settings: 11
- Hunt Progress: ~30 (sample data)

### Test Team Access
You can test the team access system using:
- Code: **ALPHA01** → Should authenticate as "Team Alpha"
- Any other team code → Should authenticate to the respective team

## Application Configuration

Make sure your application has the correct Supabase configuration:

1. **Environment Variables**: Ensure your `.env.local` or environment has:
   ```
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

2. **Row Level Security**: The schema includes RLS policies for data security

## Troubleshooting

### If the schema script fails:
- Check that you have the proper permissions in your Supabase project
- Make sure you're running it in the SQL Editor, not the Database page
- Extensions like `uuid-ossp` should be available by default

### If the data import fails:
- Run the schema script first
- Check for any constraint violations in the error messages
- You can safely re-run the import script (it uses `ON CONFLICT` clauses)

### If you need to reset:
```sql
-- WARNING: This will delete all data
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
-- Then re-run both scripts
```

## Next Steps

After successful setup:
1. Your application should be able to connect to Supabase
2. Team authentication should work with the imported team codes
3. Settings will be properly saved and retrieved
4. Progress tracking will work for all locations

The database is now ready for production use!