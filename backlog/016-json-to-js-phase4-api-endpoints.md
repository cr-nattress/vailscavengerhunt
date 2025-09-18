# Phase 4: Add API Endpoints for Runtime Configuration

## Context
With ConfigService using hardcoded TypeScript modules (Phases 1-3), we now need to add API endpoints that can serve configuration dynamically, allowing for runtime updates without redeployment.

## Current State
- ConfigService uses bundled TypeScript modules
- Configuration changes require rebuild and redeploy
- No runtime configuration capability

## Task
Create API endpoints for serving configuration and update ConfigService to fetch from API with fallback to bundled data.

## Implementation Steps

1. **Create Netlify Functions for configuration**:
   ```javascript
   // netlify/functions/config-locations.js
   exports.handler = async (event, context) => {
     const { org, hunt } = event.queryStringParameters || {}

     // For now, return bundled data
     // Later, fetch from Netlify Blobs
     const configs = getLocationConfigs()
     const config = configs[org]?.[hunt]

     if (!config) {
       return { statusCode: 404, body: JSON.stringify({ error: 'Configuration not found' }) }
     }

     return {
       statusCode: 200,
       body: JSON.stringify(config)
     }
   }
   ```

2. **Create API routes in netlify.toml**:
   ```toml
   [[redirects]]
     from = "/api/config/locations"
     to = "/.netlify/functions/config-locations"
     status = 200

   [[redirects]]
     from = "/api/config/teams"
     to = "/.netlify/functions/config-teams"
     status = 200
   ```

3. **Update ConfigService to support API fetching**:
   ```typescript
   class ConfigService {
     private cache = new Map<string, any>()
     private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

     async getLocations(org: string, hunt: string) {
       const cacheKey = `locations-${org}-${hunt}`

       // Check cache first
       if (this.cache.has(cacheKey)) {
         return this.cache.get(cacheKey)
       }

       try {
         // Try API first
         const response = await fetch(`/api/config/locations?org=${org}&hunt=${hunt}`)
         if (response.ok) {
           const data = await response.json()
           this.cache.set(cacheKey, data)
           setTimeout(() => this.cache.delete(cacheKey), this.CACHE_TTL)
           return data
         }
       } catch (error) {
         console.warn('Failed to fetch config from API, using bundled data', error)
       }

       // Fallback to bundled data
       return this.getBundledLocations(org, hunt)
     }
   }
   ```

4. **Add configuration management functions**:
   ```javascript
   // netlify/functions/config-update.js
   exports.handler = async (event, context) => {
     // Admin endpoint for updating configurations
     // Requires authentication (implement later)
     // Stores in Netlify Blobs
   }
   ```

## Files to Create
- `netlify/functions/config-locations.js`
- `netlify/functions/config-teams.js`
- `netlify/functions/config-update.js` (admin endpoint)
- `src/services/ConfigApiService.ts` (API client for ConfigService)

## API Endpoints
- `GET /api/config/locations?org={org}&hunt={hunt}` - Get location configuration
- `GET /api/config/teams?org={org}` - Get teams configuration
- `POST /api/config/update` - Update configuration (admin only)

## Success Criteria
- [ ] API endpoints return configuration data
- [ ] ConfigService fetches from API when available
- [ ] Fallback to bundled data works when API unavailable
- [ ] Caching prevents excessive API calls
- [ ] Configuration updates don't require redeploy

## Dependencies
- Phases 1-3 must be completed
- Netlify Functions must be working

## Security Considerations
- Config update endpoint needs authentication
- Consider rate limiting for API endpoints
- Validate org/hunt parameters to prevent injection

## Testing Notes
- Test API endpoints return correct data
- Test fallback when API is unavailable
- Verify caching works correctly
- Test configuration updates (when implemented)
- Test performance with API vs bundled data

## Future Enhancements
- Add versioning for configurations
- Implement rollback capability
- Add webhook for configuration change notifications
- Create admin UI for managing configurations