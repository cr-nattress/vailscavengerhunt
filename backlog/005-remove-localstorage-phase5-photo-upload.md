# Phase 5: Remove Photo localStorage Fallback

## Objective
Remove base64 image storage fallback from localStorage and enforce server-only photo storage.

## Prerequisites
- Server storage infrastructure fully operational
- Cloudinary integration working reliably

## Tasks

1. **Update Photo Upload Flow in App.jsx**
   ```javascript
   // Remove these fallback sections:
   - compressImage() fallback to localStorage
   - FileReader base64 fallback
   - Setting photo data directly in progress state
   ```

2. **Simplify Photo Upload Handler**
   ```javascript
   const handlePhotoUpload = async (stopId, file) => {
     try {
       setUploadingStops(prev => new Set([...prev, stopId]));

       // Only allow Cloudinary upload
       const response = await PhotoUploadService.uploadPhoto(
         file,
         stops.find(s => s.id === stopId)?.title,
         sessionId,
         teamName,
         locationName,
         eventName
       );

       // Save URL to server, not localStorage
       await ProgressService.updateStopPhoto(sessionId, stopId, {
         photoUrl: response.data.url,
         thumbnailUrl: response.data.thumbnailUrl,
         uploadedAt: response.data.uploadedAt
       });

       // Update UI state
       setProgress(prev => ({
         ...prev,
         [stopId]: {
           ...prev[stopId],
           photoUrl: response.data.url,
           done: true
         }
       }));
     } catch (error) {
       // Show error, no fallback
       showError('Photo upload failed. Please try again.');
       throw error;
     } finally {
       setUploadingStops(prev => {
         const newSet = new Set(prev);
         newSet.delete(stopId);
         return newSet;
       });
     }
   };
   ```

3. **Remove Compression Utilities**
   - Delete `compressImage` function if it exists
   - Remove any image manipulation libraries used only for localStorage

4. **Update Progress State Structure**
   ```javascript
   // Before: Could store base64 photo data
   progress[stopId] = {
     photo: "data:image/jpeg;base64,/9j/4AAQ...", // Remove this
     done: true
   }

   // After: Only store URLs
   progress[stopId] = {
     photoUrl: "https://res.cloudinary.com/...",
     thumbnailUrl: "https://res.cloudinary.com/...",
     done: true
   }
   ```

5. **Add Upload Retry Mechanism**
   ```javascript
   const uploadWithRetry = async (file, maxRetries = 3) => {
     let lastError;
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await PhotoUploadService.uploadPhoto(file, ...);
       } catch (error) {
         lastError = error;
         await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
       }
     }
     throw lastError;
   };
   ```

6. **Update UI Components**
   - Show upload progress indicator
   - Display retry button on failure
   - Remove any base64 image rendering code

## UI/UX Improvements
- Add upload progress bar
- Show file size before upload
- Validate image format/size client-side
- Provide clear error messages
- Add "retry upload" button

## Testing Requirements
- [ ] Photos upload successfully to Cloudinary
- [ ] Failed uploads show error message
- [ ] Retry mechanism works
- [ ] No base64 data in localStorage
- [ ] URLs persist across sessions

## Performance Considerations
- Lazy load images using URLs
- Use thumbnail URLs for lists
- Implement image preloading for better UX

## Status
⏳ Not Started