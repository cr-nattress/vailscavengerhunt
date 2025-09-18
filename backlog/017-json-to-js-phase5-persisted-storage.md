# Phase 5: Migrate Configuration to Persisted Storage

## Context
After implementing API endpoints with bundled data fallback (Phase 4), we need to move configuration to persisted storage (Netlify Blobs) to enable runtime updates without code changes.

## Current State
- API endpoints serve bundled configuration data
- No ability to update configuration at runtime
- Configuration still requires code deployment

## Task
Implement persisted storage for configuration using Netlify Blobs and create management capabilities.

## Implementation Steps

1. **Store configurations in Netlify Blobs**:
   ```javascript
   // netlify/functions/config-migrate.js
   const { getStore } = require('@netlify/blobs')

   async function migrateConfigurations() {
     const store = getStore({ name: 'hunt-config' })

     // Migrate BHHS configuration
     await store.setJSON('locations/bhhs/fall-2025', bhhsLocations)

     // Migrate Vail Valley configuration
     await store.setJSON('locations/vail-valley/default', vailValleyLocations)

     // Migrate teams configuration
     await store.setJSON('teams/bhhs', teamsConfig.bhhs)
   }
   ```

2. **Update API endpoints to use Blobs**:
   ```javascript
   // netlify/functions/config-locations.js
   const { getStore } = require('@netlify/blobs')

   exports.handler = async (event) => {
     const { org, hunt } = event.queryStringParameters || {}
     const store = getStore({ name: 'hunt-config' })

     try {
       const config = await store.get(`locations/${org}/${hunt}`, { type: 'json' })

       if (!config) {
         // Fallback to bundled data for initial migration
         return getBundledConfig(org, hunt)
       }

       return {
         statusCode: 200,
         body: JSON.stringify(config)
       }
     } catch (error) {
       return { statusCode: 500, body: JSON.stringify({ error: 'Failed to load configuration' }) }
     }
   }
   ```

3. **Create configuration management API**:
   ```javascript
   // netlify/functions/config-admin.js
   exports.handler = async (event) => {
     // Verify admin authentication (implement auth check)

     const { action } = event.queryStringParameters

     switch (action) {
       case 'list':
         return listConfigurations()
       case 'get':
         return getConfiguration(event.queryStringParameters)
       case 'update':
         return updateConfiguration(JSON.parse(event.body))
       case 'delete':
         return deleteConfiguration(event.queryStringParameters)
       case 'version':
         return getConfigurationVersions(event.queryStringParameters)
       default:
         return { statusCode: 400, body: JSON.stringify({ error: 'Invalid action' }) }
     }
   }
   ```

4. **Implement configuration versioning**:
   ```javascript
   async function saveConfigurationVersion(key, config) {
     const store = getStore({ name: 'hunt-config' })
     const timestamp = new Date().toISOString()

     // Save current version
     await store.setJSON(key, config)

     // Save versioned backup
     await store.setJSON(`${key}/versions/${timestamp}`, config)

     // Keep only last 10 versions
     await pruneOldVersions(key)
   }
   ```

5. **Add configuration validation**:
   ```typescript
   // src/utils/configValidator.ts
   export function validateLocationConfig(config: any): boolean {
     // Validate required fields
     if (!config.name || !Array.isArray(config.locations)) {
       return false
     }

     // Validate each location
     return config.locations.every(loc =>
       loc.id &&
       loc.title &&
       loc.clue &&
       Array.isArray(loc.hints)
     )
   }
   ```

## Storage Structure in Netlify Blobs
```
hunt-config/
├── locations/
│   ├── bhhs/
│   │   ├── fall-2025
│   │   └── fall-2025/versions/
│   │       ├── 2025-01-01T00:00:00Z
│   │       └── 2025-01-02T00:00:00Z
│   ├── vail-valley/
│   │   └── default
│   └── vail-village/
│       └── default
├── teams/
│   └── bhhs
└── metadata/
    └── last-updated
```

## Success Criteria
- [ ] Configurations stored in Netlify Blobs
- [ ] API endpoints read from Blobs
- [ ] Configuration updates persist without redeploy
- [ ] Version history maintained
- [ ] Rollback capability implemented
- [ ] Validation prevents invalid configurations

## Dependencies
- Phases 1-4 must be completed
- Netlify Blobs must be configured
- Authentication system needed for admin endpoints

## Security Requirements
- Admin endpoints require authentication
- Validate all configuration updates
- Audit trail for configuration changes
- Rate limiting on API endpoints

## Migration Steps
1. Run migration function to copy bundled data to Blobs
2. Test API endpoints with Blob storage
3. Verify fallback to bundled data if Blobs unavailable
4. Remove bundled data once Blobs proven stable

## Testing Notes
- Test configuration CRUD operations
- Verify versioning works correctly
- Test rollback functionality
- Ensure validation prevents bad data
- Test performance of Blob storage vs bundled data

## Monitoring
- Log configuration access patterns
- Monitor Blob storage usage
- Track API response times
- Alert on configuration update failures