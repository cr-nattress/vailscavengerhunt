# Database Export Scripts

This directory contains scripts for exporting and managing the Supabase database schema and data.

## Scripts

### `export-supabase-simple.ts`

**Purpose**: Exports all table data from Supabase to a SQL file for version control and backup.

**What it does**:
- Connects to your Supabase instance
- Exports data from all application tables
- Generates INSERT statements with proper SQL escaping
- Creates a timestamped SQL file that can recreate the database state

**Usage**:
```bash
npx tsx scripts/export-supabase-simple.ts
```

**Output**: `scripts/sql/supabase-data-export-YYYY-MM-DDTHH-MM-SS.sql`

**Requirements**:
- `.env` file with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Node.js and the project dependencies installed

**Tables exported** (in dependency order):
1. `organizations` - Organization definitions
2. `hunts` - Hunt configurations
3. `hunt_stops` - Available stops/locations
4. `hunt_configurations` - Hunt-to-stop mappings
5. `hunt_ordering_config` - Ordering strategies (fixed/randomized)
6. `teams` - Team registrations
7. `team_codes` - Team access codes
8. `team_stop_orders` - Randomized orderings per team
9. `hunt_progress` - Team progress tracking
10. `settings` - Application settings
11. `hunt_settings` - Hunt-specific settings
12. `sponsor_assets` - Sponsor images and data
13. `kv_store` - Key-value storage
14. `key_value_store` - Legacy KV store

### `export-supabase-schema.ts`

**Purpose**: Attempts to export the complete database schema (DDL) including tables, constraints, indexes, and functions.

**Status**: ⚠️ Partially implemented - requires Supabase RPC function access

**Note**: For schema exports, it's recommended to use the Supabase CLI or existing schema files in `scripts/sql/`:
- `supabase-schema.sql` - Main table definitions
- `supabase-hunt-system.sql` - Enhanced hunt configuration system
- `kv-store-schema.sql` - Key-value store schema
- `device-locks-schema.sql` - Device locking schema

### `export-db.sh`

**Purpose**: Bash script wrapper for Supabase CLI-based exports.

**Status**: Requires Supabase CLI (`npm install -g supabase`)

## Restoring from Export

To restore data from an export file:

```bash
# Using psql
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" < scripts/sql/supabase-data-export-[timestamp].sql

# Or using Supabase CLI
supabase db push --db-url "your-connection-string" --file scripts/sql/supabase-data-export-[timestamp].sql
```

⚠️ **Warning**: Export files contain `TRUNCATE` statements. Only run on fresh databases or ensure you have backups!

## Schema Management

The recommended approach for schema management:

1. **Schema changes**: Maintain in version-controlled SQL files:
   - `scripts/sql/supabase-schema.sql` - Base schema
   - `scripts/sql/supabase-hunt-system.sql` - Hunt system
   - Migration files for incremental changes

2. **Data snapshots**: Use `export-supabase-simple.ts` to capture data states:
   - Before major releases
   - For testing/staging environment setup
   - For disaster recovery

3. **Version control**: Commit both schema files and periodic data exports to git

## Environment Variables

Required in `.env`:

```env
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key
```

## NPM Scripts

Add to `package.json` for convenience:

```json
{
  "scripts": {
    "db:export": "tsx scripts/export-supabase-simple.ts",
    "db:export-schema": "tsx scripts/export-supabase-schema.ts"
  }
}
```

Then run:
```bash
npm run db:export
```