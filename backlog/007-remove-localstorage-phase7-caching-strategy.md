# Phase 7: Implement Caching Strategy (In-Memory Only)

## Objective
Add efficient in-memory caching to replace localStorage performance benefits without using browser storage.

## Prerequisites
- Server API endpoints implemented (Phase 6)
- Basic server communication working

## Tasks

### 1. Install Caching Libraries

```bash
npm install @tanstack/react-query
# or
npm install swr
```

### 2. Setup React Query Provider

```typescript
// src/providers/QueryProvider.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 2,
    },
  },
});

export function QueryProvider({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

### 3. Create Custom Hooks with Caching

```typescript
// src/hooks/useSettings.ts
export function useSettings(sessionId: string) {
  return useQuery({
    queryKey: ['settings', sessionId],
    queryFn: () => ServerSettingsService.getSettings(sessionId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateSettings(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings) => ServerSettingsService.saveSettings(sessionId, settings),
    onMutate: async (newSettings) => {
      // Optimistic update
      await queryClient.cancelQueries(['settings', sessionId]);
      const previousSettings = queryClient.getQueryData(['settings', sessionId]);
      queryClient.setQueryData(['settings', sessionId], newSettings);
      return { previousSettings };
    },
    onError: (err, newSettings, context) => {
      // Rollback on error
      queryClient.setQueryData(['settings', sessionId], context.previousSettings);
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries(['settings', sessionId]);
    },
  });
}
```

### 4. Add Progress Caching

```typescript
// src/hooks/useProgress.ts
export function useProgress(sessionId: string, stops: Stop[]) {
  const { data: progress, isLoading, error } = useQuery({
    queryKey: ['progress', sessionId],
    queryFn: () => ProgressService.getProgress(sessionId),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const updateProgress = useMutation({
    mutationFn: (update) => ProgressService.updateProgress(sessionId, update),
    onMutate: async (update) => {
      // Optimistic update for instant feedback
      await queryClient.cancelQueries(['progress', sessionId]);
      const previous = queryClient.getQueryData(['progress', sessionId]);
      queryClient.setQueryData(['progress', sessionId], update);
      return { previous };
    },
  });

  return { progress, updateProgress, isLoading, error };
}
```

### 5. Implement Service-Level Cache

```typescript
// src/services/CacheService.ts
class CacheService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private ttl = 5 * 60 * 1000; // 5 minutes

  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

export const cacheService = new CacheService();
```

### 6. Add Request Deduplication

```typescript
// src/services/RequestDeduplicator.ts
class RequestDeduplicator {
  private pending = new Map<string, Promise<any>>();

  async dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
    if (this.pending.has(key)) {
      return this.pending.get(key);
    }

    const promise = fn().finally(() => {
      this.pending.delete(key);
    });

    this.pending.set(key, promise);
    return promise;
  }
}

export const deduplicator = new RequestDeduplicator();
```

### 7. Add Prefetching Strategy

```typescript
// Prefetch data before user needs it
export function usePrefetch() {
  const queryClient = useQueryClient();

  const prefetchSettings = (sessionId: string) => {
    queryClient.prefetchQuery({
      queryKey: ['settings', sessionId],
      queryFn: () => ServerSettingsService.getSettings(sessionId),
    });
  };

  const prefetchProgress = (sessionId: string) => {
    queryClient.prefetchQuery({
      queryKey: ['progress', sessionId],
      queryFn: () => ProgressService.getProgress(sessionId),
    });
  };

  return { prefetchSettings, prefetchProgress };
}
```

## Performance Metrics
- Cache hit rate target: > 80%
- Average response time: < 100ms for cached data
- Memory usage: < 10MB for cache
- Network requests reduction: > 70%

## Testing Checklist
- [ ] Cached data serves instantly
- [ ] Stale data refreshes in background
- [ ] Optimistic updates work smoothly
- [ ] Memory usage stays within limits
- [ ] No localStorage is used anywhere

## Status
⏳ Not Started