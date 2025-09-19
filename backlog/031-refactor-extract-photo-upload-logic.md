# Phase 31: Extract Photo Upload Logic from ActiveView

## Problem
ActiveView.tsx contains 100+ lines of photo upload logic including:
- File validation
- Size checking
- Resize decision logic
- Unsigned vs signed upload paths
- Error handling
- Progress state management

## Solution
Move photo upload logic to a dedicated Zustand store or at least a custom hook.

## Implementation

### Option A: Create Photo Upload Store
```typescript
// src/store/photoStore.ts
interface PhotoStore {
  uploadingStops: Set<string>

  uploadPhoto: (
    stopId: string,
    file: File | string,
    metadata: {
      stopTitle: string
      sessionId: string
      teamName?: string
      locationName?: string
      eventName?: string
    }
  ) => Promise<string>
}
```

### Option B: Create usePhotoUpload Hook
```typescript
// src/hooks/usePhotoUpload.ts
export function usePhotoUpload() {
  const [uploadingStops, setUploadingStops] = useState(new Set())

  const uploadPhoto = useCallback(async (stopId, file, metadata) => {
    // All the upload logic from ActiveView
    // File validation
    // Size checking
    // Resize logic
    // Upload paths
  }, [])

  return { uploadPhoto, uploadingStops }
}
```

## Current Code to Extract (lines ~120-215 in ActiveView)
- File type conversion
- Size validation
- File type validation
- Resize decision
- Signed vs unsigned upload
- Error handling
- State updates

## Benefits
- ActiveView reduced by ~100 lines
- Reusable upload logic
- Testable in isolation
- Clear separation of concerns

## Success Criteria
- [ ] Photo upload logic extracted
- [ ] ActiveView uses new store/hook
- [ ] Upload functionality unchanged
- [ ] Error handling preserved