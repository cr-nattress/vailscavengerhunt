import { useState, useCallback } from 'react'
import { PhotoUploadService } from '../client/PhotoUploadService'
import { base64ToFile } from '../utils/image'
import { useToastActions } from '../features/notifications/ToastProvider'
import { photoFlowLogger } from '../utils/photoFlowLogger'
import { LoginService } from '../services/LoginService'

interface UsePhotoUploadOptions {
  sessionId: string
  teamName?: string
  locationName?: string
  eventName?: string
  teamId?: string
  orgId?: string
  huntId?: string
  useOrchestrated?: boolean
  onSuccess?: (stopId: string, photoUrl: string) => void
  onError?: (stopId: string, error: Error) => void
}

export function usePhotoUpload({
  sessionId,
  teamName,
  locationName,
  eventName,
  teamId,
  orgId,
  huntId,
  useOrchestrated = false,
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

      // File size validation from login-initialize config or env
      const cfg = LoginService.getCachedConfig()
      const env: any = (import.meta as any)?.env || {}
      const maxSizeBytes = Number((cfg?.MAX_UPLOAD_BYTES ?? env.VITE_MAX_UPLOAD_BYTES) || 10485760) // Default 10MB
      const allowLargeUploads = Boolean(cfg?.ALLOW_LARGE_UPLOADS ?? env.VITE_ALLOW_LARGE_UPLOADS === 'true')

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

      // Decide which upload method to use
      const disableResize = Boolean(cfg?.DISABLE_CLIENT_RESIZE ?? env.VITE_DISABLE_CLIENT_RESIZE === 'true')

      let response: Awaited<ReturnType<typeof PhotoUploadService.uploadPhoto>>

      // Use orchestrated endpoint if we have all required context
      if (useOrchestrated && teamId && orgId && huntId) {
        console.log('Using orchestrated upload endpoint (with saga/compensation)')
        response = await PhotoUploadService.uploadPhotoOrchestrated(
          file,
          stopTitle,
          sessionId,
          stopId, // Use stopId as locationId
          teamId,
          orgId,
          huntId,
          teamName,
          locationName,
          eventName
        )
      } else {
        // Fallback to regular upload
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
  }, [sessionId, teamName, locationName, eventName, teamId, orgId, huntId, useOrchestrated, showError, onSuccess, onError])

  const isUploading = useCallback((stopId: string) => {
    return uploadingStops.has(stopId)
  }, [uploadingStops])

  return {
    uploadPhoto,
    uploadingStops,
    isUploading
  }
}