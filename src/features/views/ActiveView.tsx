import React, { useState, useEffect } from 'react'
import { CollageService } from '../../client/CollageService'
import { PhotoUploadService } from '../../client/PhotoUploadService'
import { progressService } from '../../services/ProgressService'
import ProgressGauge from '../../components/ProgressGauge'
import AlbumViewer from '../../components/AlbumViewer'
import StopsList from '../app/StopsList'
import { UploadProvider } from '../upload/UploadContext'
import { useToastActions } from '../notifications/ToastProvider'
import { useAppStore } from '../../store/appStore'
import { getRandomStops } from '../../utils/random'
import { useProgress } from '../../hooks/useProgress'
import { base64ToFile } from '../../utils/image'
import { buildStorybook } from '../../utils/canvas'

const ActiveView: React.FC = () => {
  const { success, error: showError, warning, info } = useToastActions()

  const {
    locationName,
    teamName,
    sessionId,
    eventName,
    huntId,
    organizationId,
  } = useAppStore()

  const [stops, setStops] = useState(() => getRandomStops(locationName || 'BHHS'))
  const { progress, setProgress, completeCount, percent } = useProgress(stops)
  const [showTips, setShowTips] = useState(false)
  const [storybookUrl, setStorybookUrl] = useState(null)
  const [collageLoading, setCollageLoading] = useState(false)
  const [collageUrl, setCollageUrl] = useState(null)
  const [fullSizeImageUrl, setFullSizeImageUrl] = useState(null)
  const [expandedStops, setExpandedStops] = useState({})
  const [transitioningStops, setTransitioningStops] = useState(new Set())
  const [uploadingStops, setUploadingStops] = useState(new Set())

  // Update stops when location changes
  useEffect(() => {
    console.log(`🗺️ Location changed to: ${locationName}, updating stops...`)
    const newStops = getRandomStops(locationName)
    setStops(newStops)

    // Load saved progress from server
    const loadProgressFromServer = async () => {
      try {
        const orgId = organizationId || 'bhhs'
        const teamId = teamName || 'default'
        const hunt = huntId || 'winter-2024'

        const savedProgress = await progressService.getProgress(orgId, teamId, hunt)
        if (savedProgress && Object.keys(savedProgress).length > 0) {
          setProgress(savedProgress)
          success('✅ Loaded saved progress from server')
        }
      } catch (err) {
        console.error('Failed to load progress from server:', err)
      }
    }

    if (teamName && locationName) {
      loadProgressFromServer()
    }
  }, [locationName, teamName, organizationId, huntId])

  // Auto-save progress to server when it changes
  useEffect(() => {
    if (Object.keys(progress).length === 0) return

    const saveProgressToServer = async () => {
      try {
        const orgId = organizationId || 'bhhs'
        const teamId = teamName || 'default'
        const hunt = huntId || 'winter-2024'

        await progressService.saveProgress(orgId, teamId, hunt, progress, sessionId)
        console.log('✅ Progress saved to server')
      } catch (err) {
        console.error('Failed to save progress to server:', err)
      }
    }

    const debounceTimer = setTimeout(saveProgressToServer, 1000)
    return () => clearTimeout(debounceTimer)
  }, [progress, teamName, organizationId, huntId])

  // Create collage when all stops are complete
  useEffect(() => {
    const allDone = stops.every(stop => progress[stop.id]?.done)
    if (!allDone || collageUrl) return

    const createCollage = async () => {
      try {
        setCollageLoading(true)
        const photoUrls = stops
          .map(stop => progress[stop.id]?.photo)
          .filter(Boolean)

        if (photoUrls.length === stops.length) {
          const collageImageUrl = await CollageService.createCollage(photoUrls, teamName)
          setCollageUrl(collageImageUrl)
          success('🎉 Created your photo collage!')
        }
      } catch (err) {
        console.error('Failed to create collage:', err)
        showError('Failed to create collage')
      } finally {
        setCollageLoading(false)
      }
    }

    createCollage()
  }, [progress, stops, collageUrl])

  const handlePhotoUpload = async (stopId, fileOrDataUrl) => {
    setUploadingStops(prev => new Set(prev).add(stopId))

    try {
      let file
      if (typeof fileOrDataUrl === 'string' && fileOrDataUrl.startsWith('data:')) {
        file = base64ToFile(fileOrDataUrl, `stop_${stopId}_${Date.now()}.jpg`)
      } else {
        file = fileOrDataUrl
      }

      // Get stop title for the upload
      const stopTitle = stops.find(s => s.id === stopId)?.title || stopId

      const response = await PhotoUploadService.uploadPhoto(
        file,
        stopTitle,  // locationTitle
        sessionId,
        teamName,
        locationName,
        eventName
      )

      const photoUrl = response.photoUrl

      setProgress({
        ...progress,
        [stopId]: {
          ...progress[stopId],
          photo: photoUrl,
          done: true,
          timestamp: new Date().toISOString()
        }
      })

      setTransitioningStops(prev => new Set(prev).add(stopId))
      setTimeout(() => {
        setTransitioningStops(prev => {
          const next = new Set(prev)
          next.delete(stopId)
          return next
        })
      }, 600)

      success(`📸 Photo uploaded for ${stops.find(s => s.id === stopId)?.title || 'stop'}`)
    } catch (err) {
      console.error(`Failed to upload photo for stop ${stopId}:`, err)
      showError('Failed to upload photo. Please try again.')
    } finally {
      setUploadingStops(prev => {
        const next = new Set(prev)
        next.delete(stopId)
        return next
      })
    }
  }

  const toggleExpanded = (stopId) => {
    setExpandedStops(prev => ({
      ...prev,
      [stopId]: !prev[stopId]
    }))
  }

  return (
    <UploadProvider
      location={locationName}
      team={teamName}
      sessionId={sessionId}
      eventName={eventName}
    >
      <div className='max-w-screen-sm mx-auto px-4 py-3'>
        {/* Progress Card with Team/Hunt Info */}
        <div className='border rounded-lg shadow-sm px-4 py-3 relative' style={{
          backgroundColor: 'var(--color-white)',
          borderColor: 'var(--color-light-grey)'
        }}>
          {/* Team and Hunt Name */}
          <div className='flex items-center justify-between text-sm mb-2'>
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
          expandedStops={expandedStops}
          onToggleExpanded={toggleExpanded}
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