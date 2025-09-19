# Phase 1: Analysis and Preparation for localStorage Removal

## Objective
Document all current localStorage usage and create a migration plan to server-side storage.

## Tasks

1. **Create Storage Analysis Document**
   - Create `docs/STORAGE_MIGRATION.md` documenting:
     - All current localStorage keys and their purposes
     - Data shapes and sizes for each storage type
     - Frequency of read/write operations
     - Critical vs non-critical data classification

2. **Identify Dependencies**
   - List all files that directly use localStorage
   - List all files that indirectly depend on localStorage (via hooks/services)
   - Document the data flow for each storage operation

3. **Server Endpoint Planning**
   - Design RESTful API endpoints needed:
     - `/api/settings/{sessionId}` - App settings per session
     - `/api/progress/{sessionId}` - Progress tracking
     - `/api/user-preferences` - User preferences
   - Define request/response schemas for each endpoint

4. **Risk Assessment**
   - Document potential breaking changes
   - Identify features that will be affected
   - Plan rollback strategy if needed

## Deliverables
- [ ] `docs/STORAGE_MIGRATION.md` file created
- [ ] List of all files requiring changes
- [ ] API endpoint specifications
- [ ] Migration timeline estimate

## Notes
- Do NOT make any code changes in this phase
- Focus only on analysis and documentation
- Ensure all team members are aware of upcoming changes

## Status
✅ Completed - Analysis Done

## Analysis Results

### Files Using localStorage Directly

1. **src/hooks/useProgress.ts**
   - Lines: 13, 21, 27, 29
   - Storage Key: `vail-love-hunt-progress`
   - Purpose: Persists hunt progress and stop completion data
   - Data Size: ~5-10KB per hunt
   - Frequency: Write on every stop interaction

2. **src/client/PhotoUploadService.ts**
   - Lines: 191, 216, 280
   - Storage Key: `vail-hunt-photos`
   - Purpose: Caches photo records locally as fallback
   - Data Size: Can grow large with base64 images
   - Frequency: Write on photo upload, read on app load

3. **src/client/LocalStorageService.js**
   - Lines: 18, 49, 75, 170, 175, 197-198, 227
   - Purpose: Centralized localStorage wrapper with error handling
   - Multiple dynamic keys based on usage

4. **src/store/appStore.ts**
   - Uses Zustand persist middleware (indirect usage)
   - Storage Key: `app-store`
   - Purpose: Persists app settings (location, team, session, event)
   - Data Size: <1KB
   - Frequency: Write on settings change

### Dependencies

**Direct Users:**
- useProgress hook
- PhotoUploadService
- LocalStorageService
- appStore (via persist)

**Indirect Users (via DualWriteService):**
- App.jsx (settings, session initialization)
- All components using progress hook
- Photo upload components

### Migration Impact

**Critical Data:**
- Progress tracking (must not lose user progress)
- Team settings (needed for hunt context)

**Non-Critical:**
- Photo cache (can re-upload if needed)
- UI preferences

### Updated API Endpoints Needed

Following the hierarchy structure:
- `GET/POST /api/settings/{orgId}/{teamId}/{huntId}`
- `GET/POST /api/progress/{orgId}/{teamId}/{huntId}`
- `GET /api/org/{orgId}/teams`
- `GET /api/org/{orgId}/team/{teamId}/hunts`

### Risk Assessment
- **High Risk:** Loss of progress data during migration
- **Medium Risk:** Network dependency for all operations
- **Mitigation:** Parallel operation during transition period