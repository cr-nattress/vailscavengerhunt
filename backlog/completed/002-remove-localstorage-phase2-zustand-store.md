# Phase 2: Replace Zustand Persist with Server Storage

## Objective
Remove localStorage persistence from Zustand store and replace with server-side storage.

## Prerequisites
- Phase 1 completed (analysis document exists)
- Server endpoints designed

## Tasks

1. **Create Server Storage Service**
   ```typescript
   // Create src/services/ServerSettingsService.ts
   - Implement getSettings(orgId, teamId, huntId)
   - Implement saveSettings(orgId, teamId, huntId, settings, sessionId)
   - sessionId is passed for audit trail but doesn't affect storage location
   - Add proper error handling
   - Add retry logic with exponential backoff
   ```

2. **Remove Persist Middleware from appStore**
   - Remove `persist` import from `src/store/appStore.ts`
   - Remove persist wrapper from store creation
   - Keep the store structure but make it ephemeral
   - Add `isLoading` and `error` states to store

3. **Add Server Sync Logic**
   - Create `initializeSettings()` action in store
   - Load settings from server on app mount
   - Auto-save to server on any setting change (debounced)
   - Handle network errors gracefully

4. **Update App.jsx Initialization**
   ```javascript
   useEffect(() => {
     // Load settings from server on mount
     appStore.initializeSettings(sessionId)
   }, [sessionId])
   ```

5. **Create Netlify Functions**
   - Create `netlify/functions/settings-get.js`
   - Create `netlify/functions/settings-set.js`
   - Use Netlify Blobs for storage

## Implementation Details
```typescript
// Example of new store structure without persist
export const useAppStore = create<AppStore>((set, get) => ({
  // State
  organizationId: '',
  teamId: '',
  huntId: '',
  locationName: 'BHHS',
  teamName: '',
  sessionId: generateSessionId(),
  eventName: '',
  lockedByQuery: false,
  isLoading: false,
  error: null,

  // Actions
  setLocationName: async (locationName: string) => {
    set({ locationName });
    const { organizationId, teamId, huntId, sessionId } = get();
    await ServerSettingsService.saveSettings(
      organizationId,
      teamId,
      huntId,
      get(),
      sessionId // For audit trail only
    );
  },
  // ... other setters with server sync
}))
```

## Testing Checklist
- [ ] Settings load correctly from server
- [ ] Changes save to server immediately
- [ ] Works with slow/unreliable network
- [ ] Error messages display appropriately
- [ ] No localStorage keys created

## Rollback Plan
- Keep old localStorage code commented for 1 sprint
- Add feature flag to toggle between storage methods
- Monitor error rates after deployment

## Status
⏳ Not Started