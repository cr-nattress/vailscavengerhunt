# Phase 4: Convert DualWriteService to ServerOnlyService

## Objective
Simplify the DualWriteService by removing all localStorage operations, making it server-only.

## Prerequisites
- Phases 2-3 completed
- All critical data migrated to server storage

## Tasks

1. **Create New ServerStorageService**
   ```typescript
   // src/services/ServerStorageService.ts
   export class ServerStorageService {
     // Remove all localStorage operations
     static async set(key: string, value: any, indexes?: IndexEntry[])
     static async get(key: string)
     static async delete(key: string)
     static async list(pattern?: string)
     static async clear()
   }
   ```

2. **Remove LocalStorageService Dependency**
   - Delete import of `LocalStorageService`
   - Remove all `LocalStorageService.*` method calls
   - Simplify return types (no more dual results)

3. **Update Method Signatures**
   ```typescript
   // Before (DualWrite)
   async set(key, value): Promise<DualWriteResult> {
     localStorage: boolean;
     server: boolean;
     errors: string[];
   }

   // After (ServerOnly)
   async set(key, value): Promise<void> {
     // Throws on error, returns nothing on success
   }
   ```

4. **Update All Consumers**
   - Find all files importing `DualWriteService`
   - Update to use `ServerStorageService`
   - Remove dual-write result handling
   - Add proper error boundaries

5. **Delete Unused Files**
   - Delete `src/client/LocalStorageService.js`
   - Delete `src/client/HybridStorageService.js`
   - Delete `src/client/DualWriteService.ts`

6. **Add In-Memory Cache Layer**
   ```typescript
   class ServerStorageService {
     private static cache = new Map<string, CacheEntry>();
     private static cacheTimeout = 5 * 60 * 1000; // 5 minutes

     static async get(key: string) {
       // Check cache first
       const cached = this.cache.get(key);
       if (cached && !this.isExpired(cached)) {
         return cached.value;
       }
       // Fetch from server
       const value = await apiClient.get(`/kv-get/${key}`);
       this.cache.set(key, { value, timestamp: Date.now() });
       return value;
     }
   }
   ```

## Error Handling Strategy
- Implement exponential backoff for retries
- Show user-friendly error messages
- Log errors to monitoring service
- Provide offline indicator in UI

## Performance Metrics to Track
- Average API response time
- Cache hit rate
- Error rate
- Retry success rate

## Testing Checklist
- [ ] All CRUD operations work via server
- [ ] No localStorage access in DevTools
- [ ] Cache improves performance
- [ ] Error messages are helpful
- [ ] No data loss during migration

## Status
⏳ Not Started