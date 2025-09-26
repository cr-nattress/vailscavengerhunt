import React, { useState, useEffect } from 'react'
import { progressService } from '../../services/ProgressService'
import ProgressGauge from '../../components/ProgressGauge'
import AlbumViewer from '../../components/AlbumViewer'
import StopsList from '../app/StopsList'
import { UploadProvider } from '../upload/UploadContext'
import { useToastActions } from '../notifications/ToastProvider'
import { useAppStore } from '../../store/appStore'
import { useUIStore } from '../../store/uiStore'
import { useProgress } from '../../hooks/useProgress'
import { usePhotoUpload } from '../../hooks/usePhotoUpload'
import { useCollage } from '../../hooks/useCollage'
import { photoFlowLogger } from '../../utils/photoFlowLogger'
import { SponsorCard } from '../sponsors/SponsorCard'
import { useActiveData } from '../../hooks/useActiveData'

const ActiveView: React.FC = () => {
  const { success, error: showError, warning, info } = useToastActions()

  const {
    locationName,
    teamName,
    teamId,
    sessionId,
    eventName,
    huntId,
    organizationId,
  } = useAppStore()

  const [stops, setStops] = useState([])
  const { progress, setProgress, completeCount, percent } = useProgress(stops)
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

  // Use consolidated data hook for all data in one request
  const { data: activeData, isLoading: dataLoading, error: dataError, refetch: refetchData } = useActiveData(
    organizationId || 'bhhs',
    teamId || 'berrypicker',  // Use teamId instead of teamName
    huntId || 'fall-2025'
  )

  // Photo upload hook replaces uploadingStops state and handlePhotoUpload function
  const { uploadPhoto, uploadingStops } = usePhotoUpload({
    sessionId,
    teamName,
    locationName,
    eventName,
    onSuccess: (stopId, photoUrl) => {
      console.log(`[PHOTO-FLOW] Step 1: Photo uploaded to Cloudinary for stop ${stopId}`)
      console.log(`[PHOTO-FLOW] Step 2: Photo URL received:`, photoUrl?.substring(0, 100) + '...')

      const newProgressState = {
        ...progress,
        [stopId]: {
          ...progress[stopId],
          photo: photoUrl,
          done: true,
          completedAt: new Date().toISOString()
        }
      }

      console.log(`[PHOTO-FLOW] Step 3: Creating new progress state with photo for stop ${stopId}`)
      console.log(`[PHOTO-FLOW] Step 3.1: Stop progress data:`, {
        stopId,
        done: newProgressState[stopId].done,
        hasPhoto: !!newProgressState[stopId].photo,
        completedAt: newProgressState[stopId].completedAt
      })

      photoFlowLogger.info('ActiveView', 'progress_updated_with_photo', {
        stopId,
        photoUrl: photoUrl?.substring(0, 100) + '...',
        stopData: newProgressState[stopId],
        totalStopsWithPhotos: Object.values(newProgressState).filter((s: any) => s.photo).length
      })

      console.log(`[PHOTO-FLOW] Step 4: Updating local progress state (will trigger auto-save in 1 second)`)
      // Update progress with photo URL
      setProgress(newProgressState)
      console.log(`[PHOTO-FLOW] Step 5: Local state updated. Auto-save will trigger in 1 second...`)

      // Trigger transition animation
      setTransitioning(stopId, true)
      setTimeout(() => {
        setTransitioning(stopId, false)
      }, 600)

      success(`📸 Photo uploaded for ${stops.find(s => s.id === stopId)?.title || 'stop'}`)
    },
    onError: (stopId, error) => {
      console.error(`Failed to upload photo for stop ${stopId}:`, error)
    }
  })

  // Update stops when activeData loads with location data
  useEffect(() => {
    if (activeData?.locations?.locations) {
      console.log(`🗺️ Loaded ${activeData.locations.locations.length} locations from API`)
      // Shuffle and select random stops from the loaded locations
      const allLocations = [...activeData.locations.locations]

      // Fisher-Yates shuffle
      for (let i = allLocations.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allLocations[i], allLocations[j]] = [allLocations[j], allLocations[i]]
      }

      // Select appropriate number of stops
      const stopCount = locationName === 'BHHS' ? allLocations.length : Math.min(5, allLocations.length)
      const selectedStops = allLocations.slice(0, stopCount)
      setStops(selectedStops)
    }
  }, [activeData?.locations, locationName])

  // Load progress from consolidated data
  useEffect(() => {
    if (activeData?.progress && Object.keys(activeData.progress).length > 0) {
      // Reset revealedHints to 0 on page refresh to hide hints
      const progressWithResetHints = {}
      for (const [stopId, stopProgress] of Object.entries(activeData.progress)) {
        progressWithResetHints[stopId] = {
          ...stopProgress,
          revealedHints: 0
        }
      }
      setProgress(progressWithResetHints)
      success('✅ Loaded saved progress and data from server')
    }
  }, [activeData?.progress])

  // Auto-save progress to server when it changes
  useEffect(() => {
    if (Object.keys(progress).length === 0) return

    const saveProgressToServer = async () => {
      try {
        console.log(`[PHOTO-FLOW] Step 6: Auto-save triggered (1 second debounce elapsed)`)

        const orgId = organizationId || 'bhhs'
        const teamId = teamName || 'berrypicker'
        const hunt = huntId || 'fall-2025'

        const progressWithPhotos = Object.entries(progress).filter(([_, data]: [string, any]) => data.photo)

        console.log(`[PHOTO-FLOW] Step 7: Preparing to save progress to Supabase:`, {
          orgId,
          teamId,
          hunt,
          totalStops: Object.keys(progress).length,
          stopsWithPhotos: progressWithPhotos.length
        })

        console.log(`[PHOTO-FLOW] Step 8: Progress data with photos:`,
          progressWithPhotos.map(([stopId, data]: [string, any]) => ({
            stopId,
            hasPhoto: !!data.photo,
            photoUrl: data.photo?.substring(0, 50) + '...',
            done: data.done,
            completedAt: data.completedAt
          }))
        )

        photoFlowLogger.info('ActiveView', 'auto_save_triggered', {
          orgId,
          teamId,
          hunt,
          totalStops: Object.keys(progress).length,
          stopsWithPhotos: progressWithPhotos.length,
          photosData: progressWithPhotos.map(([stopId, data]: [string, any]) => ({
            stopId,
            hasPhoto: !!data.photo,
            done: data.done
          }))
        })

        console.log(`[PHOTO-FLOW] Step 9: Calling progressService.saveProgress()...`)
        await progressService.saveProgress(orgId, teamId, hunt, progress, sessionId)
        console.log(`[PHOTO-FLOW] Step 10: ✅ Progress successfully saved to Supabase!`)
        console.log('✅ Progress saved to server')

        photoFlowLogger.info('ActiveView', 'auto_save_success', {
          orgId,
          teamId,
          hunt,
          stopsWithPhotos: progressWithPhotos.length
        })
      } catch (err) {
        console.error('Failed to save progress to server:', err)
        photoFlowLogger.error('ActiveView', 'auto_save_failed', { error: err.message }, err.message)
      }
    }

    const debounceTimer = setTimeout(saveProgressToServer, 1000)
    return () => clearTimeout(debounceTimer)
  }, [progress, teamName, organizationId, huntId])


  // Simplified photo upload handler using the hook
  const handlePhotoUpload = async (stopId, fileOrDataUrl) => {
    const stopTitle = stops.find(s => s.id === stopId)?.title || stopId
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
        <div className={`border rounded-lg shadow-sm px-4 py-3 relative ${activeData?.sponsors && activeData.sponsors.items.length > 0 ? 'mt-3' : 'mt-0'}`} style={{
          backgroundColor: 'var(--color-white)',
          borderColor: 'var(--color-light-grey)'
        }}>
          {/* Team and Hunt Name */}
          <div className='flex items-center justify-between text-sm'>
            {teamName && (
              <div className='flex-shrink-0'>
                <span className='text-blue-600 font-medium uppercase'>{teamName}</span>
              </div>
            )}
            {huntId && (
              <div className='flex-shrink-0'>
                <span className='text-gray-700 uppercase'>{huntId}</span>
              </div>
            )}
          </div>

          {/* Progress Section */}
          {percent === 100 ? (
            <div className='mt-1'>
              <p className='text-lg font-semibold' style={{color: 'var(--color-cabernet)'}}>
                🎉 Congratulations! You completed the scavenger hunt.
              </p>
            </div>
          ) : (
            <div className='mt-1'>
              <ProgressGauge
                percent={percent}
                completeCount={completeCount}
                totalStops={stops.length}
                stops={stops}
                progress={progress}
              />
            </div>
          )}
        </div>

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
        />

        {showTips && (
          <div className='fixed inset-0 z-30'>
            <div
              className='absolute inset-0 bg-black/40 backdrop-blur-sm'
              onClick={() => setShowTips(false)}
              style={{
                animation: 'fadeIn 0.2s ease-out forwards'
              }}
            />
            <div
              className='absolute inset-x-0 bottom-0 rounded-t-3xl p-5 shadow-2xl'
              style={{
                backgroundColor: 'var(--color-white)',
                animation: 'slideUpModal 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
              }}
            >
              <div className='mx-auto max-w-screen-sm'>
                <div className='flex items-center justify-between'>
                  <h3 className='text-lg font-semibold flex items-center gap-2' style={{ color: 'var(--color-cabernet)' }}>
                    📖 Rules
                  </h3>
                  <button
                    className='p-2 rounded-lg transition-all duration-150 transform hover:scale-110 active:scale-95'
                    onClick={() => setShowTips(false)}
                    aria-label='Close'
                  >
                    <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                    </svg>
                  </button>
                </div>
                <div className='mt-3 space-y-3 text-sm'>
                  <p className='font-medium'>📸 Take a group photo in front of each location to prove you completed the clue.</p>

                  <div className='space-y-2'>
                    <p className='font-medium'>👑 Two winners will be crowned:</p>
                    <ul className='pl-5 space-y-1'>
                      <li>🏁 The team that finishes first</li>
                      <li>🎨 The team with the most creative photos</li>
                    </ul>
                  </div>

                  <p>👀 Pay attention to your surroundings — details you notice along the way might help you.</p>
                  <p>🤝 Work together, ✨ be creative, and 🏔️ enjoy exploring Vail Village!</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </UploadProvider>
  )
}

export default ActiveView