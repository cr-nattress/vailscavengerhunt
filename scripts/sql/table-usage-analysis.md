# Database Table Usage Analysis

## Tables Currently in Supabase (15 total)

Based on the activity data from `tables-in-supabase.json`:

1. **teams** - 10 rows, heavily used (842 updates)
2. **hunt_progress** - 23 rows, heavily used (681 updates)
3. **hunt_settings** - 5 rows, actively used (292 updates)
4. **debug_logs** - 238 rows, actively used
5. **team_stop_orders** - 120 rows (for randomized stop ordering)
6. **kv_store** - 87 rows, actively used
7. **hunt_configurations** - 12 rows
8. **hunt_stops** - 20 rows
9. **team_codes** - 10 rows
10. **settings** - 10 rows
11. **organizations** - 1 row
12. **hunt_ordering_config** - 1 row
13. **key_value_store** - 5 rows
14. **hunts** - 1 row
15. **sponsor_assets** - 2 rows

## Tables Referenced in Code

### Actively Used Tables (✅ KEEP)
- **teams** - Core table for team data
- **team_codes** - Maps team codes to team IDs
- **hunt_progress** - Tracks team progress through stops
- **hunt_settings** - Hunt configuration settings
- **hunt_stops** - Master list of all stops/locations
- **hunt_configurations** - Which stops are active in each hunt
- **hunt_ordering_config** - Defines fixed vs randomized ordering
- **team_stop_orders** - Stores randomized stop orders per team
- **organizations** - Organization data
- **hunts** - Hunt instances
- **sponsor_assets** - Sponsor images/assets
- **settings** - Application settings
- **debug_logs** - Debug logging
- **kv_store** - Key-value store (actively used for locations)
- **key_value_store** - Alternative KV store

### Legacy/Migration Tables (⚠️ POSSIBLY DELETE)
These tables are referenced in migration scripts but NOT in active application code:

- **team_mappings** - Old team code mapping system (replaced by team_codes)
- **team_progress** - Old progress tracking (replaced by hunt_progress)
- **application_state** - Old state storage (not actively used)
- **device_locks** - Device locking mechanism (only in test files)
- **team_locks** - Team locking mechanism (minimal usage)
- **sponsors** - Old sponsors table (replaced by sponsor_assets)

### Views (Not Physical Tables)
- **leaderboard** - Database view (not a physical table)

## Tables That Can Be Deleted

Based on this analysis, the following tables appear to be **UNUSED or LEGACY** and can likely be deleted:

### Safe to Delete:
1. **team_mappings** - Replaced by `team_codes` table
2. **team_progress** - Replaced by `hunt_progress` table
3. **application_state** - Not used in active code
4. **sponsors** - Replaced by `sponsor_assets` table

### Consider Deleting (verify first):
1. **device_locks** - Only referenced in test files
2. **team_locks** - Minimal usage, may be obsolete

## SQL to Delete Unused Tables

```sql
-- First, verify these tables are not referenced by foreign keys
-- Check for dependencies
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name IN ('team_mappings', 'team_progress', 'application_state', 'sponsors', 'device_locks', 'team_locks');

-- If no dependencies found, proceed with deletion:

-- Drop legacy tables (after backing up if needed)
DROP TABLE IF EXISTS team_mappings CASCADE;
DROP TABLE IF EXISTS team_progress CASCADE;
DROP TABLE IF EXISTS application_state CASCADE;
DROP TABLE IF EXISTS sponsors CASCADE;
DROP TABLE IF EXISTS device_locks CASCADE;
DROP TABLE IF EXISTS team_locks CASCADE;

-- Verify deletion
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('team_mappings', 'team_progress', 'application_state', 'sponsors', 'device_locks', 'team_locks');
```

## Recommendations

1. **Before deleting**, create a backup of these tables:
   ```sql
   -- Create backup schema
   CREATE SCHEMA IF NOT EXISTS backup_legacy;

   -- Move tables to backup schema instead of deleting
   ALTER TABLE team_mappings SET SCHEMA backup_legacy;
   ALTER TABLE team_progress SET SCHEMA backup_legacy;
   ALTER TABLE application_state SET SCHEMA backup_legacy;
   ALTER TABLE sponsors SET SCHEMA backup_legacy;
   ALTER TABLE device_locks SET SCHEMA backup_legacy;
   ALTER TABLE team_locks SET SCHEMA backup_legacy;
   ```

2. The **key_value_store** vs **kv_store** duplication should be investigated - you may only need one of these.

3. Test the application thoroughly after removal to ensure no hidden dependencies.