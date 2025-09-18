# Phase 3: Replace Progress Hook localStorage with Server Storage

## Objective
Convert the `useProgress` hook to use server-side storage exclusively.

## Prerequisites
- Phase 2 completed (Zustand store migrated)
- Server infrastructure tested and working

## Tasks

1. **Create Progress API Service**
   ```typescript
   // Create src/services/ProgressService.ts
   class ProgressService {
     async getProgress(orgId: string, teamId: string, huntId: string)
     async saveProgress(orgId: string, teamId: string, huntId: string, progress: ProgressData, sessionId: string)
     async updateStopProgress(orgId: string, teamId: string, huntId: string, stopId: string, data: StopData, sessionId: string)
     // Note: sessionId is for audit trail only, not for data location
   }
   ```

2. **Install React Query or SWR**
   ```bash
   npm install @tanstack/react-query
   # or
   npm install swr
   ```

3. **Rewrite useProgress Hook**
   ```typescript
   // src/hooks/useProgress.ts
   export function useProgress(stops: Stop[], orgId: string, teamId: string, huntId: string, sessionId: string) {
     const { data: progress, mutate, error, isLoading } = useSWR(
       `/api/progress/${orgId}/${teamId}/${huntId}`,  // No sessionId in key
       () => ProgressService.getProgress(orgId, teamId, huntId),
       {
         revalidateOnFocus: true,  // Important: refresh to see team updates
         revalidateOnReconnect: true,
         refreshInterval: 30000,  // Poll every 30 seconds for team updates
       }
     );

     const setProgress = useCallback(async (updater) => {
       // Optimistic update
       mutate(updater, false);
       // Server update (sessionId for audit only)
       await ProgressService.saveProgress(
         orgId, teamId, huntId,
         updater(progress),
         sessionId  // For tracking who made the update
       );
       // Revalidate to get any concurrent team updates
       mutate();
     }, [progress, mutate, orgId, teamId, huntId, sessionId]);

     return { progress, setProgress, isLoading, error };
   }
   ```

4. **Remove localStorage Code**
   - Delete all `localStorage.getItem(STORAGE_KEY)` calls
   - Delete all `localStorage.setItem(STORAGE_KEY, ...)` calls
   - Remove the `STORAGE_KEY` constant
   - Remove quota exceeded error handling

5. **Add Loading States to UI**
   ```jsx
   // Update components using useProgress
   if (isLoading) return <ProgressSkeleton />;
   if (error) return <ErrorMessage />;
   ```

6. **Create Netlify Functions**
   - `netlify/functions/progress-get.js`
   - `netlify/functions/progress-update.js`
   - `netlify/functions/progress-stop-update.js`

## Migration Strategy
1. Run both localStorage and server storage in parallel for 1 week
2. Compare data consistency
3. Switch to server-only after validation
4. Clean up localStorage data after 30 days

## Performance Optimizations
- Implement optimistic updates for instant UI feedback
- Batch updates to reduce API calls
- Use stale-while-revalidate pattern
- Cache responses for 5 minutes

## Testing Requirements
- [ ] Progress loads from server correctly
- [ ] Updates save without UI lag
- [ ] Handles network failures gracefully
- [ ] No localStorage access occurs
- [ ] Progress persists across sessions

## Status
⏳ Not Started