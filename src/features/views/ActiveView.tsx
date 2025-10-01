/**
 * Exports: ActiveView component — Main hunt interface with stops, progress, and photo upload
 * Runtime: client
 * Used by: /src/features/navigation/TabContainer.tsx (default tab)
 * 
 * @ai-purpose: Primary hunt UI; orchestrates stop cards, photo uploads, progress tracking, sponsors
 * @ai-dont: Don't fetch data directly; use useActiveData() hook. Don't manage upload state locally; use usePhotoUpload()
 * @ai-related-files: /src/hooks/useActiveData.ts, /src/hooks/usePhotoUpload.ts, /src/features/app/StopCard.tsx, /netlify/functions/consolidated-active.js
 * @stable
 */
import React, { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import AlbumViewer from '../../components/AlbumViewer'
import { ProgressCard } from '../../components/ProgressCard'
import StopsList from '../app/StopsList'
import { UploadProvider } from '../upload/UploadContext'
import { useToastActions } from '../notifications/ToastProvider'
import { useAppStore } from '../../store/appStore'
import { useUIStore } from '../../store/uiStore'
import { useProgress } from '../../hooks/useProgress'
import { usePhotoUpload } from '../../hooks/usePhotoUpload'
import { useCollage } from '../../hooks/useCollage'
import { useStopSelection } from '../../hooks/useStopSelection'
import { useProgressSync } from '../../hooks/useProgressSync'
import { photoFlowLogger } from '../../utils/photoFlowLogger'
import { SponsorCard } from '../sponsors/SponsorCard'
import { useActiveData } from '../../hooks/useActiveData'
import { LoginService } from '../../services/LoginService'
import { TipsModal } from '../../components/TipsModal'

const ActiveView: React.FC = () => {
  // const { success, error: showError, warning, info } = useToastActions()

  const {
    locationName,
    teamName,
    teamId,
    sessionId,
    eventName,
    huntId,
    organizationId,
  } = useAppStore()

  // Use consolidated data hook for all data in one request
  const { data: activeData, isLoading: dataLoading, error: dataError, refetch: refetchData } = useActiveData(
    organizationId,
    teamId,
    huntId
  )

  // Use stop selection hook (extracts shuffle logic)
  const stops = useStopSelection({
    locations: activeData?.locations?.locations,
    locationName
  })

  const { progress, setProgress, seedProgress, completeCount, percent } = useProgress(stops)
  const [fullSizeImageUrl, setFullSizeImageUrl] = useState(null)

  // Use UI store for UI state management
  const {
    expandedStops,
    transitioningStops,
    showTips,
    toggleStopExpanded,
    setTransitioning,
    setShowTips
  } = useUIStore()

  // Use collage hook for automatic collage creation
  const { collageUrl } = useCollage({ stops, progress, teamName })

  // ⚠️ CRITICAL: Must call useQueryClient at top level, not inside callbacks
  // This fixes React error #321 in production (hook called in callback)
  const queryClient = useQueryClient()

  // Photo upload hook replaces uploadingStops state and handlePhotoUpload function
  const serverConfig = LoginService.getCachedConfig()
  // New UI state for upload lifecycle
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({})
  const [savingStops, setSavingStops] = useState<Set<string>>(new Set())

  const { uploadPhoto, uploadingStops } = usePhotoUpload({
    sessionId,
    teamName,
    locationName,
    eventName,
    teamId,
    orgId: organizationId,
    huntId,
    useOrchestrated: true, // Always use the complete endpoint now
    onSuccess: async (stopId, photoUrl, progressUpdated) => {
      console.log(`[PHOTO-FLOW] ✅ Complete upload successful for stop ${stopId}`)
      console.log(`[PHOTO-FLOW] Photo URL:`, photoUrl?.substring(0, 100) + '...')
      console.log(`[PHOTO-FLOW] Progress updated:`, progressUpdated ? 'YES' : 'NO')

      // Clear preview
      setPreviewUrls(prev => {
        const url = prev[stopId]
        if (url) URL.revokeObjectURL(url)
        const { [stopId]: _omit, ...rest } = prev
        return rest
      })

      // Refetch consolidated data to get updated progress from server
      console.log(`[PHOTO-FLOW] Refetching consolidated/active data to sync progress...`)
      await refetchData()

      // Invalidate history so the new photo appears promptly when switching tabs
      queryClient.invalidateQueries({
        queryKey: ['consolidated-history', organizationId, teamId, huntId]
      })

      // Trigger transition animation
      setTransitioning(stopId, true)
      setTimeout(() => {
        setTransitioning(stopId, false)
      }, 600)

      // success(`📸 Photo uploaded for ${stops.find(s => s.id === stopId)?.title || 'stop'}`)
    },
    onError: (stopId, error) => {
      console.error(`Failed to upload photo for stop ${stopId}:`, error)
    }
  })

  // Sync progress from server data (extracts useEffect logic)
  useProgressSync({
    serverProgress: activeData?.progress,
    seedProgress
  })

  // Note: Auto-save removed - progress is now saved atomically with photo uploads
  // via the consolidated photo-upload-complete endpoint

  // Simplified photo upload handler using the hook
  const handlePhotoUpload = async (stopId: string, fileOrDataUrl: File | string) => {
    // Set preview immediately
    if (fileOrDataUrl instanceof File) {
      const url = URL.createObjectURL(fileOrDataUrl)
      setPreviewUrls(prev => ({ ...prev, [stopId]: url }))
    } else if (typeof fileOrDataUrl === 'string') {
      setPreviewUrls(prev => ({ ...prev, [stopId]: fileOrDataUrl }))
    }

    const stop = stops.find((s: any) => s.id === stopId)
    const stopTitle = stop?.title || stopId
    await uploadPhoto(stopId, fileOrDataUrl, stopTitle)
  }

  // Convert Set to object for compatibility with StopsList
  const expandedStopsObject = React.useMemo(() => {
    const obj: Record<string, boolean> = {}
    expandedStops.forEach(stopId => {
      obj[stopId] = true
    })
    return obj
  }, [expandedStops])

  return (
    <UploadProvider
      location={locationName}
      team={teamName}
      sessionId={sessionId}
      eventName={eventName}
    >
      <div className='max-w-screen-sm mx-auto px-4 py-3 overflow-hidden h-screen'>
        {/* Sponsor Card - appears above progress card when sponsors exist */}
        {activeData?.sponsors && activeData.sponsors.items.length > 0 && (
          <div className="mt-0">
            <SponsorCard
              items={activeData.sponsors.items}
              layout={activeData.sponsors.layout}
            />
          </div>
        )}

        {/* Progress Card with Team/Hunt Info */}
        <ProgressCard
          teamName={teamName}
          huntId={huntId}
          percent={percent}
          completeCount={completeCount}
          totalStops={stops.length}
          stops={stops}
          progress={progress}
          hasSponsors={!!(activeData?.sponsors && activeData.sponsors.items.length > 0)}
        />

        {/* Album Viewer Component */}
        <AlbumViewer
          collageUrl={collageUrl}
          imageUrl={fullSizeImageUrl}
          initialExpanded={true}
        />

        <StopsList
          stops={stops}
          progress={progress}
          transitioningStops={transitioningStops}
          expandedStops={expandedStopsObject}
          onToggleExpanded={toggleStopExpanded}
          uploadingStops={uploadingStops}
          onPhotoUpload={handlePhotoUpload}
          setProgress={setProgress}
          seedProgress={seedProgress}
          previewUrls={previewUrls}
          savingStops={savingStops}
        />

        <TipsModal isOpen={showTips} onClose={() => setShowTips(false)} />
      </div>
    </UploadProvider>
  )
}

export default ActiveView