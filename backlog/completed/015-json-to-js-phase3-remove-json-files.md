# Phase 3: Remove JSON Files and Verify Application

## Context
After migrating all imports to use ConfigService (Phase 2), we can safely remove the original JSON files and ensure the application works correctly without them.

## Current State
- ConfigService implemented with TypeScript modules (Phase 1)
- All imports updated to use ConfigService (Phase 2)
- Original JSON files still present but unused

## Task
Remove all JSON configuration files and verify the application functions correctly.

## Implementation Steps

1. **Remove JSON files**:
   ```bash
   rm src/data/vail-valley.json
   rm src/data/vail-village.json
   rm src/data/bhhs-locations.json
   rm src/data/teams-config.json
   ```

2. **Update TypeScript configuration** (if needed):
   - Remove `resolveJsonModule` from `tsconfig.json` if no other JSON files are used
   - Update any build configurations that reference JSON files

3. **Verify build process**:
   ```bash
   npm run build
   npm run preview
   ```

4. **Test all functionality**:
   - Load each hunt configuration (BHHS, Vail Valley, Vail Village)
   - Verify location data displays correctly
   - Test photo uploads with location data
   - Verify team configuration works
   - Test progress tracking

5. **Update documentation**:
   - Update CLAUDE.md to reflect new configuration approach
   - Update README if it references JSON files
   - Document ConfigService usage for future developers

## Verification Checklist
- [ ] All JSON files removed from `src/data/`
- [ ] Build succeeds without errors
- [ ] No console errors in development mode
- [ ] No console errors in production build
- [ ] All hunts load correctly
- [ ] Location data displays properly
- [ ] Hints and clues work as expected
- [ ] Team configuration functions correctly
- [ ] Query parameters still work for org/team/hunt selection

## Rollback Plan
If issues arise:
1. Restore JSON files from git history
2. Revert import changes from Phase 2
3. Debug specific issues before attempting removal again

## Success Criteria
- [ ] Application works identically without JSON files
- [ ] Build size potentially reduced (no JSON parsing)
- [ ] TypeScript type safety improved
- [ ] No runtime errors related to missing configuration

## Dependencies
- Phase 1 and Phase 2 must be completed successfully

## Commands for Verification
```bash
# Build and test
npm run build
npm run preview

# Check for any remaining JSON imports
grep -r "\.json" src/

# Verify no JSON files in build
ls -la dist/assets/*.json 2>/dev/null || echo "No JSON in build ✓"
```

## Documentation Updates Needed
- CLAUDE.md - Update architecture section
- README.md - Update if it mentions JSON config files
- Create `docs/CONFIG.md` explaining the ConfigService approach