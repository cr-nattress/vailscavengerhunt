# Phase 2: Update All Imports to Use ConfigService

## Context
After creating the ConfigService and TypeScript data modules in Phase 1, we need to update all components and utilities that currently import JSON files directly to use the new ConfigService instead.

## Current State
- ConfigService created with TypeScript data modules (from Phase 1)
- Components still importing JSON files directly
- `src/utils/random.ts` has static JSON imports

## Task
Replace all direct JSON imports with ConfigService calls throughout the codebase.

## Implementation Steps

1. **Update `src/utils/random.ts`**:
   ```typescript
   // Before:
   import vailValleyData from '../data/vail-valley.json'
   import vailVillageData from '../data/vail-village.json'
   import bhhsData from '../data/bhhs-locations.json'

   // After:
   import { configService } from '../services/ConfigService'

   export function getLocationData(locationName: string) {
     const [org, hunt] = parseLocationName(locationName)
     return configService.getLocations(org, hunt)
   }
   ```

2. **Update components that use location data**:
   - Search for all files importing `.json` files
   - Replace with ConfigService calls
   - Update to use org/team/hunt parameters from context or props

3. **Update ActiveView and other views**:
   - Modify to get config from ConfigService based on current org/hunt
   - Pass configuration through props or context as needed

4. **Create a useConfig hook** (optional but recommended):
   ```typescript
   // src/hooks/useConfig.ts
   export function useConfig() {
     const { orgId, huntId } = useAppContext()
     const locations = configService.getLocations(orgId, huntId)
     const teams = configService.getTeamsConfig()
     return { locations, teams }
   }
   ```

## Files to Update
- `src/utils/random.ts`
- `src/features/views/ActiveView.tsx`
- `src/features/views/HistoryView.tsx`
- `src/App.jsx`
- Any other files importing JSON directly

## Search Commands to Find Files
```bash
# Find all JSON imports
grep -r "import.*\.json" src/

# Find all references to the data files
grep -r "vail-valley\|vail-village\|bhhs-locations\|teams-config" src/
```

## Success Criteria
- [ ] No direct JSON imports remain in the codebase
- [ ] All components use ConfigService for configuration
- [ ] Application functions identically to before
- [ ] TypeScript compilation succeeds
- [ ] Dynamic org/hunt selection works correctly

## Dependencies
- Phase 1 must be completed (ConfigService and TypeScript modules created)

## Testing Notes
- Test all hunt configurations still load correctly
- Verify location data displays properly in all views
- Ensure team configuration works as expected
- Test switching between different org/hunt combinations

## Potential Issues
- Components may need props/context updates to receive org/hunt parameters
- Some components might have hardcoded assumptions about data structure
- May need to update tests that mock JSON imports