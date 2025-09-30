# Upload Feature

## Purpose

Photo upload context and orchestration system. Provides a centralized upload state management layer for coordinating photo uploads across multiple stop cards.

## Key Entry Points

### UploadContext.tsx
- **Purpose**: React context for managing upload state across components
- **Used By**: `ActiveView.tsx` (wraps stop cards)
- **Exports**:
  - `UploadProvider` component (provider)
  - `useUploadContext()` hook (consumer)
- **Key Features**:
  - Upload queue management
  - Progress tracking
  - Error handling
  - Concurrent upload limiting

## Data Flow

### Upload Orchestration Flow

```
User selects photo in StopCard
    ↓
StopCard.onUpload(stopId, file)
    ↓
usePhotoUpload.uploadPhoto()
    ↓
UploadContext tracks upload state
    ↓
PhotoUploadService.uploadPhotoOrchestrated()
    ↓
apiClient.postFormData('/api/photo-upload-complete')
    ↓
Netlify Function: photo-upload-complete.js
    ↓
Cloudinary upload + Supabase progress update (atomic)
    ↓
Response: { photoUrl, progress }
    ↓
UploadContext updates state (success/error)
    ↓
StopCard re-renders with photo
```

## State Management

### UploadContext State

```typescript
interface UploadState {
  uploadingStops: Set<string>      // Stop IDs currently uploading
  uploadProgress: Record<string, number> // Upload progress (0-100)
  uploadErrors: Record<string, Error>    // Upload errors by stop ID
}
```

### Actions

```typescript
interface UploadActions {
  startUpload(stopId: string): void
  updateProgress(stopId: string, progress: number): void
  completeUpload(stopId: string): void
  failUpload(stopId: string, error: Error): void
}
```

## Related Files

- **Context**: `/src/features/upload/UploadContext.tsx`
- **Hook**: `/src/hooks/usePhotoUpload.ts`
- **Service**: `/src/client/PhotoUploadService.ts`
- **API**: `/netlify/functions/photo-upload-complete.js`
- **Types**: `/src/types/schemas.ts` (UploadResponseSchema)

## Usage Example

### In Parent Component (ActiveView)

```typescript
import { UploadProvider } from '../upload/UploadContext'

function ActiveView() {
  return (
    <UploadProvider>
      <StopsList stops={stops} />
    </UploadProvider>
  )
}
```

### In Child Component (StopCard)

```typescript
import { useUploadContext } from '../upload/UploadContext'

function StopCard({ stop }) {
  const { uploadingStops, startUpload, completeUpload } = useUploadContext()
  const isUploading = uploadingStops.has(stop.id)
  
  const handleUpload = async (file: File) => {
    startUpload(stop.id)
    try {
      await uploadPhoto(file)
      completeUpload(stop.id)
    } catch (error) {
      failUpload(stop.id, error)
    }
  }
  
  return (
    <div>
      {isUploading && <Spinner />}
      <input type="file" onChange={handleUpload} />
    </div>
  )
}
```

## Extension Points

### Adding Upload Progress Bar

1. Update `UploadContext` to track progress percentage
2. Update `PhotoUploadService` to report progress:
   ```typescript
   xhr.upload.onprogress = (e) => {
     const percent = (e.loaded / e.total) * 100
     updateProgress(stopId, percent)
   }
   ```
3. Render progress bar in `StopCard`:
   ```tsx
   {isUploading && <ProgressBar value={uploadProgress[stop.id]} />}
   ```

### Adding Upload Queue (Limit Concurrent Uploads)

1. Add queue state to `UploadContext`:
   ```typescript
   const [uploadQueue, setUploadQueue] = useState<string[]>([])
   const MAX_CONCURRENT = 2
   ```
2. Process queue on upload start:
   ```typescript
   if (uploadingStops.size >= MAX_CONCURRENT) {
     setUploadQueue(prev => [...prev, stopId])
     return
   }
   ```
3. Process next in queue on upload complete

### Adding Upload Retry

1. Add retry count to upload state:
   ```typescript
   const [retryCount, setRetryCount] = useState<Record<string, number>>({})
   ```
2. Implement retry logic in `usePhotoUpload`:
   ```typescript
   const MAX_RETRIES = 3
   if (retryCount[stopId] < MAX_RETRIES) {
     await uploadPhoto(stopId, file)
   }
   ```

## Notes

- **Upload context is scoped to ActiveView** (not global)
- **Concurrent uploads are allowed** (no queue limit currently)
- **Upload state is ephemeral** (resets on page refresh)
- **Progress tracking is not implemented** (future enhancement)
- **Upload errors are logged to Sentry** (see PhotoUploadService)
