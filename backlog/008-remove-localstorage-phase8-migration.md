# Phase 8: Migration and Cleanup

## Objective
Migrate existing localStorage data to server and remove all localStorage dependencies.

## Prerequisites
- All previous phases completed
- Server infrastructure fully tested
- New caching system operational

## Tasks

### 1. Create Migration Script

```javascript
// src/utils/migrationScript.js
async function migrateLocalStorageToServer() {
  const migrations = [];

  // Migrate app-store
  const appStore = localStorage.getItem('app-store');
  if (appStore) {
    try {
      const data = JSON.parse(appStore);
      migrations.push(
        ServerSettingsService.saveSettings(data.sessionId, data)
      );
      console.log('Migrating app-store for session:', data.sessionId);
    } catch (e) {
      console.error('Failed to migrate app-store:', e);
    }
  }

  // Migrate progress data
  const progressData = localStorage.getItem('vail-love-hunt-progress');
  if (progressData) {
    try {
      const data = JSON.parse(progressData);
      const sessionId = JSON.parse(localStorage.getItem('app-store'))?.sessionId;
      if (sessionId) {
        migrations.push(
          ProgressService.saveProgress(sessionId, data)
        );
        console.log('Migrating progress for session:', sessionId);
      }
    } catch (e) {
      console.error('Failed to migrate progress:', e);
    }
  }

  // Wait for all migrations
  await Promise.allSettled(migrations);

  // Mark migration as complete
  await ServerStorageService.set('migration-complete', {
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
}
```

### 2. Add Migration Check on App Start

```typescript
// src/App.jsx
useEffect(() => {
  const checkAndMigrate = async () => {
    // Check if migration is needed
    const migrationStatus = await ServerStorageService.get('migration-complete');

    if (!migrationStatus) {
      console.log('Starting localStorage migration...');
      await migrateLocalStorageToServer();
      console.log('Migration complete');

      // Clear localStorage after successful migration
      localStorage.removeItem('app-store');
      localStorage.removeItem('vail-love-hunt-progress');
    }
  };

  checkAndMigrate();
}, []);
```

### 3. Remove localStorage Files

Delete these files:
- `src/client/LocalStorageService.js`
- `src/client/HybridStorageService.js`
- `src/client/DualWriteService.ts`

### 4. Update Import Statements

```bash
# Find all files importing old services
grep -r "LocalStorageService" src/
grep -r "DualWriteService" src/
grep -r "HybridStorageService" src/

# Update imports to use new services
# DualWriteService -> ServerStorageService
# LocalStorageService -> ServerStorageService
```

### 5. Clean Up Dependencies

```json
// package.json - remove if not used elsewhere
{
  "dependencies": {
    // Remove these if only used for localStorage
    - "zustand/persist": "^x.x.x"
  }
}
```

### 6. Add Feature Flag for Rollback

```typescript
// src/config/features.ts
export const features = {
  useServerStorage: process.env.REACT_APP_USE_SERVER_STORAGE !== 'false',
  enableMigration: process.env.REACT_APP_ENABLE_MIGRATION !== 'false',
};

// Usage
if (features.useServerStorage) {
  // Use server storage
} else {
  // Fall back to localStorage (keep for 30 days)
}
```

### 7. Update Documentation

Create `docs/STORAGE_MIGRATION_COMPLETE.md`:
```markdown
# Storage Migration Complete

## What Changed
- All data now stored on server (Netlify Blobs)
- localStorage no longer used
- In-memory caching for performance

## Rollback Instructions
1. Set REACT_APP_USE_SERVER_STORAGE=false
2. Redeploy application
3. Data will use localStorage again

## Monitoring
- Check server logs for storage errors
- Monitor API response times
- Track user complaints about data loss
```

### 8. Clean Up Tests

```typescript
// Update all tests that mock localStorage
// Before:
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('test', 'value');
});

// After:
beforeEach(() => {
  jest.spyOn(ServerStorageService, 'get').mockResolvedValue('value');
  jest.spyOn(ServerStorageService, 'set').mockResolvedValue();
});
```

## Validation Checklist
- [ ] All data successfully migrated
- [ ] No localStorage keys remain
- [ ] No console errors about localStorage
- [ ] App works for new users
- [ ] App works for existing users
- [ ] Tests pass without localStorage

## Rollback Plan
1. Keep old code commented for 30 days
2. Monitor error rates for 1 week
3. Have feature flag ready to disable
4. Keep localStorage data for 30 days before clearing

## Status
⏳ Not Started