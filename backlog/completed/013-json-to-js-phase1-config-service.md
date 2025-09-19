# Phase 1: Create ConfigService and TypeScript Data Modules

## Context
Currently, JSON configuration files are imported directly in the codebase, which causes issues with dynamic loading, deployment, and future migration to persisted storage. We need to migrate these to TypeScript modules managed by a centralized ConfigService.

## Current State
- JSON files in `src/data/`: `vail-valley.json`, `vail-village.json`, `bhhs-locations.json`, `teams-config.json`
- Static imports in `src/utils/random.ts`
- No runtime configuration capability

## Task
Create a ConfigService to manage all configuration data and convert JSON files to TypeScript modules.

## Implementation Steps

1. **Create TypeScript data modules**:
   - Create `src/data/locations/bhhs.ts` from `bhhs-locations.json`
   - Create `src/data/locations/vail-valley.ts` from `vail-valley.json`
   - Create `src/data/locations/vail-village.ts` from `vail-village.json`
   - Create `src/data/teams/config.ts` from `teams-config.json`

2. **Create ConfigService**:
   - Create `src/services/ConfigService.ts`
   - Implement methods: `getLocations(org, hunt)`, `getTeamsConfig()`, `getLocationById(org, hunt, locationId)`
   - Add proper TypeScript interfaces for all config types

3. **Define TypeScript interfaces**:
   ```typescript
   interface Location {
     id: string
     title: string
     clue: string
     hints: string[]
     position?: { lat: number, lng: number }
   }

   interface HuntConfig {
     name: string
     locations: Location[]
   }

   interface TeamConfig {
     id: string
     displayName: string
   }
   ```

## Example Implementation
```typescript
// src/data/locations/bhhs.ts
export const bhhsLocations: HuntConfig = {
  name: "BHHS Fall 2025",
  locations: [
    {
      id: "covered-bridge",
      title: "Covered Bridge",
      clue: "The wooden crossing every skier knows",
      hints: [
        "The most iconic photo spot in Vail.",
        "It's the gateway into the village."
      ]
    }
    // ... more locations
  ]
}
```

## Success Criteria
- [ ] All JSON files converted to TypeScript modules
- [ ] ConfigService created with proper typing
- [ ] All TypeScript interfaces defined
- [ ] ConfigService can retrieve configs by org/hunt parameters
- [ ] Type safety maintained throughout

## Dependencies
None - this is the foundational step

## Files to Create
- `src/services/ConfigService.ts`
- `src/data/locations/bhhs.ts`
- `src/data/locations/vail-valley.ts`
- `src/data/locations/vail-village.ts`
- `src/data/teams/config.ts`
- `src/types/config.ts` (for shared interfaces)

## Testing Notes
- Verify ConfigService returns correct data for each org/hunt combination
- Ensure TypeScript compilation succeeds
- Test that undefined org/hunt combinations return null safely