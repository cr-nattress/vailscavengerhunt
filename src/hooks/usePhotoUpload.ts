import { useState, useCallback } from 'react'
import { PhotoUploadService } from '../client/PhotoUploadService'
import { base64ToFile } from '../utils/image'
import { useToastActions } from '../features/notifications/ToastProvider'
import { photoFlowLogger } from '../utils/photoFlowLogger'

interface UsePhotoUploadOptions {
  sessionId: string
  teamName?: string
  locationName?: string
  eventName?: string
  onSuccess?: (stopId: string, photoUrl: string) => void
  onError?: (stopId: string, error: Error) => void
}

export function usePhotoUpload({
  sessionId,
  teamName,
  locationName,
  eventName,
  onSuccess,
  onError
}: UsePhotoUploadOptions) {
  const [uploadingStops, setUploadingStops] = useState<Set<string>>(new Set())
  const { error: showError } = useToastActions()

  const uploadPhoto = useCallback(async (
    stopId: string,
    fileOrDataUrl: File | string,
    stopTitle: string
  ) => {
    photoFlowLogger.info('usePhotoUpload', 'upload_start', {
      stopId,
      stopTitle,
      fileType: typeof fileOrDataUrl === 'string' ? 'dataUrl' : 'file',
      fileSize: typeof fileOrDataUrl === 'string' ? fileOrDataUrl.length : fileOrDataUrl.size
    })

    // Mark as uploading
    setUploadingStops(prev => new Set(prev).add(stopId))

    try {
      // Convert base64 to file if needed
      let file: File
      if (typeof fileOrDataUrl === 'string' && fileOrDataUrl.startsWith('data:')) {
        file = base64ToFile(fileOrDataUrl, `stop_${stopId}_${Date.now()}.jpg`)
      } else {
        file = fileOrDataUrl as File
      }

      // File size validation
      const { getPublicConfig } = await import('../services/PublicConfig')
      const cfg = await getPublicConfig()
      const maxSizeBytes = Number(cfg.MAX_UPLOAD_BYTES || 10485760) // Default 10MB
      const allowLargeUploads = !!cfg.ALLOW_LARGE_UPLOADS

      if (!allowLargeUploads && file.size > maxSizeBytes) {
        const sizeMB = (file.size / 1024 / 1024).toFixed(2)
        const maxMB = (maxSizeBytes / 1024 / 1024).toFixed(0)
        const errorMsg = `Image is too large (${sizeMB}MB). Please choose a smaller photo (max ${maxMB}MB).`
        showError(errorMsg)
        setUploadingStops(prev => {
          const newSet = new Set(prev)
          newSet.delete(stopId)
          return newSet
        })
        onError?.(stopId, new Error(errorMsg))
        return null
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        const errorMsg = 'Please select a valid image file (JPEG, PNG, GIF, or WebP)'
        showError(errorMsg)
        setUploadingStops(prev => {
          const newSet = new Set(prev)
          newSet.delete(stopId)
          return newSet
        })
        onError?.(stopId, new Error(errorMsg))
        return null
      }

      // Check upload configuration
      const enableUnsignedUploads = !!cfg.ENABLE_UNSIGNED_UPLOADS
      const disableResize = !!cfg.DISABLE_CLIENT_RESIZE

      let response: Awaited<ReturnType<typeof PhotoUploadService.uploadPhoto>>

      if (enableUnsignedUploads) {
        // Use unsigned upload (direct to Cloudinary)
        console.log('Using unsigned upload (direct to Cloudinary)')
        response = disableResize
          ? await PhotoUploadService.uploadPhotoUnsigned(
              file,
              stopTitle,
              sessionId,
              teamName,
              locationName,
              eventName
            )
          : await PhotoUploadService.uploadPhotoUnsignedWithResize(
              file,
              stopTitle,
              sessionId,
              1600,  // maxWidth
              0.8,   // quality
              teamName,
              locationName,
              eventName
            )
      } else {
        // Use signed upload (via Netlify function)
        console.log('Using signed upload (via Netlify function)')
        response = disableResize
          ? await PhotoUploadService.uploadPhoto(
              file,
              stopTitle,
              sessionId,
              teamName,
              locationName,
              eventName
            )
          : await PhotoUploadService.uploadPhotoWithResize(
              file,
              stopTitle,
              sessionId,
              1600,  // maxWidth
              0.8,   // quality
              teamName,
              locationName,
              eventName
            )
      }

      const photoUrl = response.photoUrl

      photoFlowLogger.info('usePhotoUpload', 'upload_success', {
        stopId,
        photoUrl: photoUrl?.substring(0, 100) + '...',
        responseData: response
      })

      // Mark upload complete
      setUploadingStops(prev => {
        const newSet = new Set(prev)
        newSet.delete(stopId)
        return newSet
      })

      // Call success callback
      onSuccess?.(stopId, photoUrl)

      return photoUrl

    } catch (error) {
      console.error('Photo upload failed:', error)
      const msg = error instanceof Error ? error.message : String(error)
      showError(`Failed to upload photo: ${msg}`)

      // Remove from uploading set
      setUploadingStops(prev => {
        const newSet = new Set(prev)
        newSet.delete(stopId)
        return newSet
      })

      // Call error callback
      onError?.(stopId, error instanceof Error ? error : new Error(msg))

      return null
    }
  }, [sessionId, teamName, locationName, eventName, showError, onSuccess, onError])

  const isUploading = useCallback((stopId: string) => {
    return uploadingStops.has(stopId)
  }, [uploadingStops])

  return {
    uploadPhoto,
    uploadingStops,
    isUploading
  }
}