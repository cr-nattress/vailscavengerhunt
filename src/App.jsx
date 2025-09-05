import React, {useState, useEffect} from 'react'
import { CollageService } from './client/CollageService'
import { PhotoUploadService } from './client/PhotoUploadService'
import { DualWriteService } from './client/DualWriteService'
import ProgressGauge from './components/ProgressGauge'
import AlbumViewer from './components/AlbumViewer'
import Header from './features/app/Header'
import SettingsPanel from './features/app/SettingsPanel'
import StopsList from './features/app/StopsList'
import { UploadProvider } from './features/upload/UploadContext'
import { useAppStore } from './store/appStore'
import { getPathParams, isValidParamSet, normalizeParams } from './utils/url'
import { slugify } from './utils/slug'
import { useProgress } from './hooks/useProgress'
import { base64ToFile, compressImage } from './utils/image'
import { buildStorybook } from './utils/canvas'
import { generateGuid } from './utils/id'
import { getRandomStops } from './utils/random'

/**
 * Vail Love Hunt — React single-page app for a couples' scavenger/date experience in Vail.
 *
 * Key behaviors:
 * - Shows a list of romantic stops with clues and a selfie mission per stop.
 * - Tracks completion and notes in localStorage.
 * - Provides a share action, date tips overlay, and progress bar.
 */

export default function App() {
  // Use Zustand store for central state management
  const { locationName, teamName, sessionId, eventName, setLocationName, setTeamName, setEventName, lockedByQuery, setLockedByQuery } = useAppStore()
  
  const [stops, setStops] = useState(() => getRandomStops(locationName || 'BHHS'))
  const [isEditMode, setIsEditMode] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  
  const {progress, setProgress, completeCount, percent} = useProgress(stops)
  const [showTips, setShowTips] = useState(false)
  const [storybookUrl, setStorybookUrl] = useState(null)
  const [collageLoading, setCollageLoading] = useState(false)
  const [collageUrl, setCollageUrl] = useState(null)
  const [fullSizeImageUrl, setFullSizeImageUrl] = useState(null)
  const [expandedStops, setExpandedStops] = useState({})
  const [transitioningStops, setTransitioningStops] = useState(new Set())
  const [uploadingStops, setUploadingStops] = useState(new Set())
  const [completedSectionExpanded, setCompletedSectionExpanded] = useState(false)

  // Initialize session and load saved settings on app startup
  useEffect(() => {
    // Phase 2: initialize from path params
    const applyFromPath = () => {
      try {
        const params = getPathParams(window.location.pathname)
        if (isValidParamSet(params)) {
          const { location, event, team } = normalizeParams(params)
          setLocationName(location)
          setEventName(event)
          setTeamName(team)
          setLockedByQuery(true)
          // If edit mode was open, close it when lock engages
          setIsEditMode(false)
          console.log('[URL] Locked by path params:', { location, event, team })
        } else {
          setLockedByQuery(false)
          console.log('[URL] No valid path params detected; app remains unlocked')
        }
      } catch (e) {
        setLockedByQuery(false)
        console.warn('[URL] Failed to parse path params; defaulting to unlocked mode:', e)
      }
    }

    applyFromPath()

    const onPopState = () => applyFromPath()
    window.addEventListener('popstate', onPopState)

    const initializeApp = async () => {
      try {
        // Load saved settings using DualWriteService
        const savedSettings = await DualWriteService.get('app-settings');
        if (savedSettings) {
          console.log('📱 Loaded saved settings:', savedSettings);
          
          if (savedSettings.location) {
            setLocationName(savedSettings.location);
          }
          if (savedSettings.team) {
            setTeamName(savedSettings.team);
          }
          if (savedSettings.event) {
            setEventName(savedSettings.event);
          }
        }
        
        // Initialize session with current location name using DualWriteService
        const sessionId = generateGuid();
        const sessionData = {
          id: sessionId,
          location: locationName,
          startTime: new Date().toISOString(),
          userAgent: navigator.userAgent
        };
        
        console.log('🚀 Initializing session:', sessionId);
        
        const results = await DualWriteService.createSession(sessionId, sessionData);
        console.log('✅ Session initialized:', results);
      } catch (error) {
        console.error('❌ Failed to initialize app:', error);
      }
    };
    
    initializeApp();

    return () => {
      window.removeEventListener('popstate', onPopState)
    }
  }, []) // Empty dependency array means this runs once on mount

  // Update stops when location changes
  useEffect(() => {
    console.log(`🗺️ Location changed to: ${locationName}, updating stops...`);
    const newStops = getRandomStops(locationName);
    setStops(newStops);
    console.log(`✅ Updated stops for ${locationName}:`, newStops.map(s => s.title));
  }, [locationName])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMenuOpen && !event.target.closest('header')) {
        setIsMenuOpen(false)
      }
    }
    
    if (isMenuOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [isMenuOpen])

  // Handle photo upload for a stop
  const handlePhotoUpload = async (stopId, file) => {
    const stop = stops.find(s => s.id === stopId)
    const state = progress[stopId] || { done: false, notes: '', photo: null, revealedHints: 1 }
    
    // Start loading state
    setUploadingStops(prev => new Set([...prev, stopId]))
    
    try {
      // Check if photo already exists for this location (idempotency)
      const existingPhoto = await PhotoUploadService.getExistingPhoto(stopId, sessionId)
      if (existingPhoto) {
        console.log(`📷 Photo already exists for ${stop.title}, using existing photo`)
        setProgress(p => ({
          ...p,
          [stopId]: { ...state, photo: existingPhoto.photoUrl, done: true, completedAt: new Date().toISOString() }
        }))
      } else {
        // Upload new photo using PhotoUploadService
        console.log(`📸 Uploading new photo for ${stop.title}`)
        const uploadResponse = await PhotoUploadService.uploadPhotoWithResize(
          file, 
          stop.title, 
          sessionId,
          1600, // maxWidth (default)
          0.8,  // quality (default) 
          teamName,
          locationName,
          eventName
        )
        
        // Save photo record
        await PhotoUploadService.savePhotoRecord(uploadResponse, stopId, sessionId)
        
        // Step 1: Immediate feedback with photo URL
        setProgress(p => ({
          ...p,
          [stopId]: { ...state, photo: uploadResponse.photoUrl, done: true, completedAt: new Date().toISOString() }
        }))
        
        console.log(`✅ Photo uploaded successfully for ${stop.title}: ${uploadResponse.photoUrl}`)
      }
      
      // End loading state
      setUploadingStops(prev => {
        const newSet = new Set(prev)
        newSet.delete(stopId)
        return newSet
      })
      
      // Step 2: Quick celebration animation
      setTimeout(() => {
        setTransitioningStops(prev => new Set([...prev, stopId]))
        
        // Step 3: Complete transition quickly
        setTimeout(() => {
          setTransitioningStops(prev => {
            const newSet = new Set(prev)
            newSet.delete(stopId)
            return newSet
          })
        }, 600)
      }, 150)
      
    } catch (error) {
      console.error('❌ Photo upload failed:', error)
      alert(`Failed to upload photo: ${error.message}`)
      
      // End loading state on error
      setUploadingStops(prev => {
        const newSet = new Set(prev)
        newSet.delete(stopId)
        return newSet
      })
      
      // Fallback to local compression method if upload fails
      try {
        const compressedPhoto = await compressImage(file)
        setProgress(p => ({
          ...p,
          [stopId]: { ...state, photo: compressedPhoto, done: true, completedAt: new Date().toISOString() }
        }))
        console.log('📷 Fallback to local storage successful')
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError)
        // Final fallback to FileReader
        const reader = new FileReader()
        reader.onloadend = () => {
          const photoData = reader.result
          setProgress(p => ({
            ...p,
            [stopId]: { ...state, photo: photoData, done: true, completedAt: new Date().toISOString() }
          }))
          
          setTimeout(() => {
            setTransitioningStops(prev => new Set([...prev, stopId]))
            setTimeout(() => {
              setTransitioningStops(prev => {
                const newSet = new Set(prev)
                newSet.delete(stopId)
                return newSet
              })
            }, 600)
          }, 150)
        }
        reader.readAsDataURL(file)
      }
    }
  }


  // Create real collage from completed stops using Cloudinary
  const createPrizeCollage = async () => {
    console.log('🎯 Starting prize collage creation...')
    setCollageLoading(true)
    
    try {
      // Get all completed stops with photos
      const completedStops = stops.filter(stop => progress[stop.id]?.photo)
      console.log('📸 Found', completedStops.length, 'completed stops with photos:', completedStops.map(s => s.title))
      
      if (completedStops.length === 0) {
        console.warn('⚠️ No completed stops found')
        alert('No completed stops with photos found!')
        return
      }

      // Convert base64 images to File objects
      console.log('🔄 Converting base64 images to File objects...')
      const files = completedStops.map((stop, index) => {
        const base64 = progress[stop.id].photo
        console.log(`  Converting ${stop.title}: base64 length = ${base64.length} characters`)
        const file = base64ToFile(base64, `vail-${stop.id}.jpg`)
        console.log(`  Created file: ${file.name}, size: ${file.size} bytes, type: ${file.type}`)
        return file
      })

      // Get titles
      const titles = completedStops.map(stop => stop.title)
      console.log('📝 Titles:', titles)

      console.log('☁️ Sending request to CollageService...')
      console.log('  Files:', files.map(f => ({ name: f.name, size: f.size, type: f.type })))
      console.log('  Titles:', titles)
      
      // Create collage using Cloudinary service
      const url = await CollageService.createCollage(files, titles)
      
      console.log('✅ Collage created successfully!')
      console.log('  URL:', url)
      setCollageUrl(url)
      setFullSizeImageUrl(url)
      
    } catch (error) {
      console.error('❌ Failed to create prize collage:', error)
      console.error('  Error name:', error.name)
      console.error('  Error message:', error.message)
      console.error('  Error stack:', error.stack)
      alert(`Failed to create your prize collage: ${error.message}`)
    } finally {
      console.log('🏁 Prize collage creation finished')
      setCollageLoading(false)
    }
  }

  // Preview using 3 sample images from public/images and random titles
  const previewStorybook = async () => {
    const samplePhotos = [
      '/images/selfie-guide-1.png',
      '/images/selfie-guide-2.png',
      '/images/selfie-guide-3.png',
    ]
    // Random titles from current location data
    const shuffled = [...stops].sort(() => Math.random() - 0.5)
    const titles = shuffled.slice(0, 3).map(s => s.title)
    const url = await buildStorybook(samplePhotos, titles)
    setStorybookUrl(url)
  }

  // Reset all progress and notes (clears local state AND re-saves to localStorage via effect)
  const reset = () => {
    setProgress({})
    setCollageUrl(null)
    setStorybookUrl(null)
    setFullSizeImageUrl(null)
    setExpandedStops({})
    setTransitioningStops(new Set())
  }
  
  // Toggle expanded state for a stop
  const toggleExpanded = (stopId) => {
    setExpandedStops(prev => ({
      ...prev,
      [stopId]: !prev[stopId]
    }))
  }
  
  // Save settings handler
  const handleSaveSettings = async () => {
    try {
      // Save settings using DualWriteService
      const settingsData = {
        location: locationName,
        team: teamName,
        event: eventName,
        updatedAt: new Date().toISOString()
      }
      
      const results = await DualWriteService.saveSettings(settingsData)
      console.log('✅ Settings saved:', settingsData, results)
    } catch (error) {
      console.error('❌ Failed to save settings:', error)
    }
    
    setIsEditMode(false)
  }

  // Share progress via Web Share API if available; otherwise copy URL + summary to clipboard.
  const share = async () => {
    const text = `Vail Scavenger Hunt — ${completeCount}/${stops.length} stops complete!`
    const url = typeof window !== 'undefined' ? window.location.href : ''
    try {
      // Prefer native share dialogs on mobile for better UX.
      if (navigator.share) await navigator.share({ title: 'Vail Scavenger Hunt', text, url })
      else {
        // Fallback: copy text to clipboard and alert the user for confirmation.
        await navigator.clipboard.writeText(`${text} ${url}`)
        alert('Link copied to clipboard ✨')
      }
    } catch {}
  }

  return (
    <UploadProvider 
      location={locationName}
      team={teamName}
      sessionId={sessionId}
      eventName={eventName}
    >
      <div className='min-h-screen text-slate-900' style={{backgroundColor: 'var(--color-cream)'}}>
      <Header 
        isMenuOpen={isMenuOpen}
        onToggleMenu={() => setIsMenuOpen(!isMenuOpen)}
        completeCount={completeCount}
        totalStops={stops.length}
        percent={percent}
        onReset={reset}
        onToggleTips={() => setShowTips(!showTips)}
      />

      <main className='max-w-screen-sm mx-auto px-4 py-5'>
        <div className='border rounded-lg shadow-sm p-4 relative' style={{
          backgroundColor: 'var(--color-white)',
          borderColor: 'var(--color-light-grey)'
        }}>
          <div className='flex items-center gap-2'>
            <h2 className='text-xl font-semibold'>{locationName}</h2>
            {!lockedByQuery && (
              <button 
                onClick={() => setIsEditMode(!isEditMode)}
                className='p-2 rounded-full transition-all duration-150 hover:scale-110 active:scale-95'
                style={{
                  color: 'var(--color-warm-grey)',
                  backgroundColor: 'transparent'
                }}
                onMouseEnter={(e) => {
                  e.target.style.color = 'var(--color-cabernet)'
                  e.target.style.backgroundColor = 'var(--color-light-pink)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = 'var(--color-warm-grey)'
                  e.target.style.backgroundColor = 'transparent'
                }}
                title='Settings - Change location and team'
                aria-label='Open settings'
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}
            {/* Copy Link button (Phase 5) */}
            <button
              onClick={async () => {
                try {
                  const origin = typeof window !== 'undefined' ? window.location.origin : ''
                  const loc = slugify(locationName || '')
                  const evt = slugify(eventName || '')
                  const team = slugify(teamName || '')
                  const path = `/${loc}/${evt}/${team}`
                  const url = `${origin}${path}`
                  await navigator.clipboard.writeText(url)
                  alert('Link copied to clipboard ✨')
                } catch (err) {
                  console.warn('Failed to copy link', err)
                }
              }}
              className='p-2 rounded-full transition-all duration-150 hover:scale-110 active:scale-95'
              style={{
                color: 'var(--color-warm-grey)',
                backgroundColor: 'transparent'
              }}
              title='Copy path-based link for this assignment'
              aria-label='Copy link'
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 010 5.656l-2 2a4 4 0 11-5.656-5.656l1-1" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.172 13.828a4 4 0 010-5.656l2-2a4 4 0 115.656 5.656l-1 1" />
              </svg>
            </button>
          </div>
          
          {isEditMode ? (
            <SettingsPanel
              locationName={locationName}
              teamName={teamName}
              eventName={eventName}
              onChangeLocation={setLocationName}
              onChangeTeam={setTeamName}
              onChangeEvent={setEventName}
              onSave={handleSaveSettings}
              onCancel={() => setIsEditMode(false)}
            />
          ) : (
            /* Normal Mode Card */
            <>
              {teamName && (
                <p className='text-blue-600 text-sm font-medium mt-2'>Team: {teamName}</p>
              )}
              
              {percent === 100 ? (
                <div className='mt-2'>
                  <p className='text-lg font-semibold' style={{color: 'var(--color-cabernet)'}}>🎉 Congratulations! You completed the scavenger hunt.</p>
                </div>
              ) : (
                <>
                  {/* Enhanced Progress Gauge */}
                  <ProgressGauge 
                    percent={percent}
                    completeCount={completeCount}
                    totalStops={stops.length}
                    stops={stops}
                    progress={progress}
                  />
                  
                </>
              )}
            </>
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
          completedSectionExpanded={completedSectionExpanded}
          onToggleCompletedSection={() => setCompletedSectionExpanded(!completedSectionExpanded)}
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
              onClick={()=>setShowTips(false)}
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
                  <h3 className='text-lg font-semibold flex items-center gap-2' style={{ color: 'var(--color-cabernet)' }}>📖 Rules</h3>
                  <button 
                    className='p-2 rounded-lg transition-all duration-150 transform hover:scale-110 active:scale-95' style={{ backgroundColor: 'transparent' }} onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--color-light-pink)'} onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'} 
                    onClick={()=>setShowTips(false)}
                    aria-label='Close'
                  >
                    <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24' style={{ color: 'var(--color-medium-grey)' }}>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                    </svg>
                  </button>
                </div>
                <div className='mt-3 space-y-3 text-sm' style={{ color: 'var(--color-dark-neutral)' }}>
                  <p className='font-medium'>Take a group photo in front of each location to prove you completed the clue.</p>
                  
                  <div className='space-y-2'>
                    <p className='font-medium'>Two winners will be crowned:</p>
                    <ul className='list-disc pl-5 space-y-1'>
                      <li>The team that finishes first.</li>
                      <li>The team with the most creative photos.</li>
                    </ul>
                  </div>
                  
                  <p>Pay attention to your surroundings — details you notice along the way might help you.</p>
                  
                  <p>Work together, be creative, and enjoy exploring Vail Village!</p>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
      </div>
    </UploadProvider>
  )
}
