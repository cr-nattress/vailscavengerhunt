# Safety Guidelines for Blob to Supabase Migration

## Core Principle: DO NO HARM

This migration must be **completely non-destructive**. We are adding Supabase as a new storage layer while preserving all existing data.

---

## Critical Safety Rules

### 1. NEVER Delete Existing Data
- ❌ DO NOT drop existing tables
- ❌ DO NOT delete existing columns
- ❌ DO NOT remove existing indexes
- ❌ DO NOT drop existing functions or triggers
- ✅ DO use `IF NOT EXISTS` for all CREATE statements
- ✅ DO use `ADD COLUMN IF NOT EXISTS` for schema updates

### 2. Database Schema Safety
Always use the **SAFE** version of the schema:
- File: `scripts/sql/supabase-migration-schema-safe.sql`
- This schema checks for existing objects before creating
- Safe to run multiple times without data loss

### 3. Migration Script Safety
All migration scripts must:
```javascript
// Example safe migration pattern
async function migrateData() {
  // 1. Check if target data already exists
  const existing = await supabase
    .from('target_table')
    .select('id')
    .eq('key', sourceKey);

  if (existing.data && existing.data.length > 0) {
    console.log(`Skipping ${sourceKey} - already migrated`);
    return;
  }

  // 2. Only insert if not exists
  const { error } = await supabase
    .from('target_table')
    .upsert(data, { onConflict: 'key' });
}
```

### 4. Feature Flag Protection
Always implement feature flags:
```javascript
const USE_SUPABASE = process.env.USE_SUPABASE_[FEATURE] === 'true';

// Keep both code paths
if (USE_SUPABASE) {
  // New Supabase logic
} else {
  // Original blob logic (DO NOT DELETE)
}
```

### 5. Parallel Running Strategy
During migration:
1. **Week 1-2**: Write to BOTH systems, read from blobs
2. **Week 3-4**: Write to BOTH systems, gradually shift reads to Supabase
3. **Week 5**: Write to BOTH systems, read primarily from Supabase
4. **Week 6+**: Monitor for 30 days before removing blob code

---

## Pre-Migration Checklist

Before running ANY migration:

- [ ] **Backup existing data** (both blob and Supabase if exists)
- [ ] **Test in development environment first**
- [ ] **Run schema in dry-run mode** (transaction rollback)
- [ ] **Verify no destructive operations** in SQL
- [ ] **Check for existing data** before inserting
- [ ] **Have rollback plan ready**

---

## Safe SQL Patterns

### Creating Tables (SAFE)
```sql
-- SAFE: Only creates if doesn't exist
CREATE TABLE IF NOT EXISTS my_table (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
);

-- SAFER: Check and add columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                   WHERE table_name = 'my_table') THEN
        CREATE TABLE my_table (...);
    ELSE
        -- Add missing columns
        ALTER TABLE my_table ADD COLUMN IF NOT EXISTS new_col TEXT;
    END IF;
END$$;
```

### Creating Indexes (SAFE)
```sql
-- SAFE: Only creates if doesn't exist
CREATE INDEX IF NOT EXISTS idx_name ON table_name(column_name);
```

### Creating Policies (SAFE)
```sql
-- SAFE: Check before creating
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'my_table'
        AND policyname = 'my_policy'
    ) THEN
        CREATE POLICY my_policy ON my_table ...;
    END IF;
END$$;
```

---

## Safe JavaScript Patterns

### Checking Table Exists
```javascript
async function tableExists(tableName) {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .limit(1);

  // Table exists if no error or error is "no rows"
  return !error || error.code === 'PGRST116';
}
```

### Safe Upsert Pattern
```javascript
async function safeUpsert(table, data, uniqueKey) {
  // Always use upsert instead of insert
  const { error } = await supabase
    .from(table)
    .upsert(data, {
      onConflict: uniqueKey,
      ignoreDuplicates: false // Update if exists
    });

  if (error) {
    console.error(`Failed to upsert to ${table}:`, error);
    // Don't throw - log and continue
  }
}
```

### Safe Migration with Resume
```javascript
async function migrateWithResume(items, lastProcessedId = null) {
  let startIndex = 0;

  // Resume from last processed
  if (lastProcessedId) {
    startIndex = items.findIndex(item => item.id === lastProcessedId) + 1;
    console.log(`Resuming from item ${startIndex}`);
  }

  for (let i = startIndex; i < items.length; i++) {
    try {
      await migrateItem(items[i]);
      // Save progress for resume capability
      await saveProgress(items[i].id);
    } catch (error) {
      console.error(`Failed at item ${i}:`, error);
      console.log(`Resume from ID: ${items[i].id}`);
      throw error; // Stop but allow resume
    }
  }
}
```

---

## Validation After Migration

Always validate migrations:

```javascript
async function validateMigration() {
  const checks = {
    recordCount: false,
    dataIntegrity: false,
    functionality: false
  };

  // 1. Compare record counts
  const blobCount = await getBlobRecordCount();
  const supabaseCount = await getSupabaseRecordCount();
  checks.recordCount = (blobCount === supabaseCount);

  // 2. Sample data comparison
  const sampleIds = await getSampleIds(10);
  for (const id of sampleIds) {
    const blobData = await getBlobData(id);
    const supabaseData = await getSupabaseData(id);
    if (JSON.stringify(blobData) !== JSON.stringify(supabaseData)) {
      checks.dataIntegrity = false;
      break;
    }
  }
  checks.dataIntegrity = true;

  // 3. Functionality test
  checks.functionality = await testCriticalPaths();

  return checks;
}
```

---

## Emergency Rollback

If something goes wrong:

1. **Immediate**: Switch feature flag to false
   ```bash
   export USE_SUPABASE_[FEATURE]=false
   ```

2. **Data Rollback** (if needed):
   ```javascript
   // Restore from blob backup
   async function rollbackToBlobs() {
     // 1. Stop writes to Supabase
     process.env.USE_SUPABASE_WRITES = 'false';

     // 2. Switch reads back to blobs
     process.env.USE_SUPABASE_READS = 'false';

     // 3. Log the rollback
     await logRollback({
       timestamp: new Date(),
       reason: 'Manual rollback triggered',
       lastSupabaseWrite: await getLastWriteTime()
     });
   }
   ```

3. **Communication**:
   - Notify team immediately
   - Document what went wrong
   - Plan fix before retry

---

## Common Mistakes to Avoid

1. ❌ **Running destructive SQL without IF NOT EXISTS**
2. ❌ **Deleting blob code before validation period**
3. ❌ **Not checking for existing data before inserting**
4. ❌ **Using INSERT instead of UPSERT**
5. ❌ **Not testing with production-like data volumes**
6. ❌ **Forgetting to backup before migration**
7. ❌ **Not implementing resume capability in migration scripts**
8. ❌ **Removing feature flags too early**

---

## Questions to Ask Before Each Step

1. Will this delete or modify existing data?
2. Have I tested this in development?
3. Is there a rollback plan?
4. Am I using the SAFE version of the schema?
5. Are feature flags in place?
6. Has the previous migration been validated?

---

## Remember

**When in doubt, DON'T delete anything!**

It's better to have duplicate data temporarily than to lose data permanently.

The golden rule: **This migration should be boring** - no surprises, no data loss, just a smooth transition.