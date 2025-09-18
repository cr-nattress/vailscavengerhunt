# Project Backlog

## High Priority: Migrate JSON Config Files to JS Services

### Problem
Currently, JSON config files are imported directly, which causes issues with:
- Dynamic loading based on organization/team/hunt parameters
- Runtime configuration changes
- Deployment and bundling (JSON files get bundled into the app)
- Future migration to persisted storage

### Current State
JSON files in use:
1. `src/data/vail-valley.json` - Location data for Vail Valley hunt
2. `src/data/vail-village.json` - Location data for Vail Village hunt
3. `src/data/bhhs-locations.json` - Location data for BHHS hunt
4. `src/data/teams-config.json` - Team configuration data

These are imported statically in `src/utils/random.ts`

### Migration Plan

#### Phase 1: Convert to JS Data Modules (Immediate)
1. Create `src/services/ConfigService.ts` to manage all configuration
2. Convert JSON files to TypeScript data modules:
   - `src/data/locations/vail-valley.ts`
   - `src/data/locations/vail-village.ts`
   - `src/data/locations/bhhs.ts`
   - `src/data/teams/config.ts`
3. Export configuration as typed constants
4. Update ConfigService to:
   - Load appropriate config based on org/team/hunt parameters
   - Provide typed interfaces for all config data
   - Cache loaded configurations
5. Update all imports to use ConfigService instead of direct JSON imports
6. Remove JSON files after migration is complete

#### Phase 2: Add Runtime Configuration Support
1. Extend ConfigService to support:
   - Loading config from API endpoints
   - Fallback to bundled JS data if API unavailable
   - Config validation and error handling
2. Create API endpoints for config retrieval:
   - `/api/config/locations/:org/:hunt`
   - `/api/config/teams/:org`
3. Add caching layer with TTL for API responses

#### Phase 3: Migrate to Persisted Storage (Future)
1. Store configurations in Netlify Blobs
2. Create admin UI for config management
3. Support versioning and rollback
4. Add config change notifications

### Implementation Steps for Phase 1

```typescript
// 1. Create src/data/locations/bhhs.ts
export const bhhsLocations = {
  name: "BHHS Fall 2025",
  locations: [
    {
      id: "covered-bridge",
      title: "Covered Bridge",
      clue: "The wooden crossing every skier knows",
      hints: [
        "The most iconic photo spot in Vail.",
        "It's the gateway into the village."
      ],
      // ... rest of location data
    }
    // ... more locations
  ]
}

// 2. Create src/services/ConfigService.ts
import { bhhsLocations } from '../data/locations/bhhs'
import { vailValleyLocations } from '../data/locations/vail-valley'
import { vailVillageLocations } from '../data/locations/vail-village'
import { teamsConfig } from '../data/teams/config'

class ConfigService {
  private locationConfigs = {
    'bhhs': {
      'fall-2025': bhhsLocations
    },
    'vail-valley': {
      'default': vailValleyLocations
    },
    'vail-village': {
      'default': vailVillageLocations
    }
  }

  getLocations(org: string, hunt: string) {
    return this.locationConfigs[org]?.[hunt] || null
  }

  getTeamsConfig() {
    return teamsConfig
  }
}

export const configService = new ConfigService()

// 3. Update imports in components
// Before:
import bhhsData from '../data/bhhs-locations.json'

// After:
import { configService } from '../services/ConfigService'
const locations = configService.getLocations('bhhs', 'fall-2025')
```

### Benefits
1. **Type Safety**: TypeScript will provide compile-time checking
2. **Dynamic Loading**: Can load different configs based on parameters
3. **Better Performance**: No JSON parsing at runtime
4. **Easier Testing**: Can mock ConfigService for tests
5. **Future-Proof**: Easy path to API-based configuration
6. **Deployment Friendly**: No issues with JSON file handling in build

### Risks and Mitigations
- **Risk**: Larger bundle size with all configs included
  - **Mitigation**: Use dynamic imports for large configs
- **Risk**: Config changes require redeploy
  - **Mitigation**: Phase 2 adds runtime config support

### Acceptance Criteria
- [ ] All JSON configs converted to TypeScript modules
- [ ] ConfigService implemented with proper typing
- [ ] All components updated to use ConfigService
- [ ] Original JSON files removed
- [ ] Application works with same functionality
- [ ] Tests updated for new structure

### Time Estimate
- Phase 1: 2-3 hours
- Phase 2: 4-5 hours
- Phase 3: 8-10 hours

### Priority
HIGH - This blocks proper multi-tenant support and causes deployment issues

---

## Other Backlog Items
(Add future backlog items here)