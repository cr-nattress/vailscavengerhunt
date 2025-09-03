import React, {useMemo, useState, useEffect} from 'react'
import { CollageService } from './client/CollageService'
import { NetlifyStateService } from './client/NetlifyStateService'
import { HybridStorageService } from './client/HybridStorageService'
import { DualWriteService } from './client/DualWriteService'
import ProgressGauge from './components/ProgressGauge'
import AlbumViewer from './components/AlbumViewer'
import { VAIL_VALLEY } from './data/vail-valley'

/**
 * Vail Love Hunt — React single-page app for a couples' scavenger/date experience in Vail.
 *
 * Key behaviors:
 * - Shows a list of romantic stops (`STOPS`) with clues and a selfie mission per stop.
 * - Tracks completion and notes in localStorage under `STORAGE_KEY`.
 * - Provides a share action, date tips overlay, and progress bar.
 *
 * Debug tips:
 * - If selfie guide images 404, verify public asset paths (see PHOTO_GUIDES note below).
 * - Use the Reset button to clear progress if localStorage state gets into a bad shape.
 */

// Generic placeholder used before a selfie is uploaded for any stop.
// NOTE: In Vite, assets in `public/` are served from root. If this fails, verify the path.
const PLACEHOLDER = '/images/selfie-placeholder.svg'

// All available scavenger-hunt locations.
// Each entry includes:
// - id: used as a stable key and in localStorage state
// - title: display name
// - hints: array of progressive clues
// - funFact: romantic trivia about the location
// - maps: convenience Google Maps link

/**
 * Randomly selects 3 locations from all available locations
 * Uses a seeded approach to ensure consistent selection per session
 */
function getRandomStops() {
  // Create a copy of all locations to avoid mutating the original array
  const shuffled = [...VAIL_VALLEY]
  
  // Fisher-Yates shuffle algorithm
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  
  // Return first 5 locations
  return shuffled.slice(0, 5)
}

// Generate random selection of 5 stops from all available locations (Vail Valley)
const STOPS = getRandomStops()

// localStorage key used for persisting progress
const STORAGE_KEY = 'vail-love-hunt-progress'

/**
 * Helper function to convert base64 to File object
 * Pure function - doesn't depend on component state
 */
const base64ToFile = (base64String, filename) => {
  const arr = base64String.split(',')
  const mime = arr[0].match(/:(.*?);/)[1]
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new File([u8arr], filename, { type: mime })
}

/**
 * Compress an image file to reduce size
 * Pure function - returns a promise
 */
const compressImage = (file, maxWidth = 800, quality = 0.8) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      // Calculate new dimensions
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height)
      canvas.width = img.width * ratio
      canvas.height = img.height * ratio
      
      // Draw and compress
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality)
      resolve(compressedDataUrl)
    }
    
    img.src = URL.createObjectURL(file)
  })
}

/**
 * useProgress
 * Manages per-stop completion and notes with localStorage persistence.
 * Returns { progress, setProgress, completeCount, percent }.
 */
function useProgress() {
  const [progress, setProgress] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : {}
    } catch { return {} }
  })
  useEffect(() => {
    try {
      // Persist whenever progress changes. If in private mode or blocked, this might throw.
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
    } catch (error) {
      // Handle quota exceeded or other localStorage errors
      if (error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded - clearing old data and trying again')
        // Try to clear existing data and save again
        localStorage.removeItem(STORAGE_KEY)
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
        } catch {
          console.error('Failed to save progress even after clearing storage')
        }
      }
    }
  }, [progress])
  // Derived values for the progress UI
  const completeCount = useMemo(() => STOPS.reduce((acc, s) => acc + ((progress[s.id]?.done) ? 1 : 0), 0), [progress])
  const percent = Math.round((completeCount / STOPS.length) * 100)
  return {progress, setProgress, completeCount, percent}
}

// NOTE: A `StopItem` component was previously added for a future refactor but is removed here
// to avoid changing runtime behavior. Consider extracting one later if needed.

/**
 * App
 * Top-level component composing the header, stops list, progress, and tips overlay.
 */
/**
 * Generate a UUID v4 GUID
 */
const generateGuid = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function App() {
  const {progress, setProgress, completeCount, percent} = useProgress()
  const [showTips, setShowTips] = useState(false)
  const [storybookUrl, setStorybookUrl] = useState(null)
  const [collageLoading, setCollageLoading] = useState(false)
  const [collageUrl, setCollageUrl] = useState(null)
  const [fullSizeImageUrl, setFullSizeImageUrl] = useState(null)
  const [expandedStops, setExpandedStops] = useState({})
  const [transitioningStops, setTransitioningStops] = useState(new Set())
  const [isEditMode, setIsEditMode] = useState(false)
  const [locationName, setLocationName] = useState('Vail Valley')
  const [teamName, setTeamName] = useState('')

  // Initialize session and load saved settings on app startup
  useEffect(() => {
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
  }, []) // Empty dependency array means this runs once on mount

  // Build a shareable collage ("storybook") from images + titles
  const buildStorybook = async (photos, titles) => {
    const n = Math.min(photos.length, titles.length)
    if (n === 0) return null

    // Grid sizing: up to 3 across for this preview use-case
    const cols = Math.min(3, n)
    const rows = Math.ceil(n / cols)
    const padding = 24
    const captionH = 56
    const tile = 560 // image square size per tile
    const width = padding + cols * (tile + padding)
    const height = padding + rows * (tile + captionH + padding)

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    canvas.width = width
    canvas.height = height

    // Background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)

    // Helper: load image
    const load = (src) => new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = src
    })

    // Helper: draw image with cover fit into a rounded rect
    const drawCover = (image, x, y, size) => {
      const iw = image.width, ih = image.height
      const scale = Math.max(size / iw, size / ih)
      const dw = iw * scale, dh = ih * scale
      const dx = x + (size - dw) / 2
      const dy = y + (size - dh) / 2

      // Rounded clip
      const r = 16
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(x + r, y)
      ctx.arcTo(x + size, y, x + size, y + size, r)
      ctx.arcTo(x + size, y + size, x, y + size, r)
      ctx.arcTo(x, y + size, x, y, r)
      ctx.arcTo(x, y, x + size, y, r)
      ctx.closePath()
      ctx.clip()
      ctx.drawImage(image, dx, dy, dw, dh)
      ctx.restore()

      // Border
      ctx.strokeStyle = '#e2e8f0'
      ctx.lineWidth = 2
      ctx.strokeRect(x + 1, y + 1, size - 2, size - 2)
    }

    // Load images sequentially to keep memory lower
    const images = []
    for (let i = 0; i < n; i++) images.push(await load(photos[i]))

    // Draw tiles
    ctx.fillStyle = '#0f172a' // slate-900 for text
    ctx.font = '600 18px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial'
    ctx.textBaseline = 'top'

    for (let i = 0; i < n; i++) {
      const col = i % cols
      const row = Math.floor(i / cols)
      const x = padding + col * (tile + padding)
      const y = padding + row * (tile + captionH + padding)

      drawCover(images[i], x, y, tile)

      // Caption line
      const title = titles[i]
      const label = `${i + 1}. ${title}`
      ctx.fillStyle = '#0f172a'
      ctx.font = '600 18px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial'
      ctx.fillText(label, x + 8, y + tile + 12)
    }

    return canvas.toDataURL('image/png')
  }


  // Create real collage from completed stops using Cloudinary
  const createPrizeCollage = async () => {
    console.log('🎯 Starting prize collage creation...')
    setCollageLoading(true)
    
    try {
      // Get all completed stops with photos
      const completedStops = STOPS.filter(stop => progress[stop.id]?.photo)
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
    // Random titles from VAIL_VALLEY
    const shuffled = [...VAIL_VALLEY].sort(() => Math.random() - 0.5)
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

  // Share progress via Web Share API if available; otherwise copy URL + summary to clipboard.
  const share = async () => {
    const text = `Vail Scavenger Hunt — ${completeCount}/${STOPS.length} stops complete!`
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
    <div className='min-h-screen bg-gradient-to-b from-blue-50 to-white text-slate-900'>
      <header className='sticky top-0 z-20 backdrop-blur-md bg-gradient-to-r from-blue-600/90 to-slate-700/90 border-b border-white/20'>
        <div className='max-w-screen-sm mx-auto px-4 py-4 flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='w-8 h-8 rounded-full bg-white/20 flex items-center justify-center'>
              <span className='text-white text-lg'>🏔️</span>
            </div>
            <h1 className='font-bold text-xl text-white'>Vail Scavenger Hunt</h1>
          </div>
        </div>
      </header>

      <main className='max-w-screen-sm mx-auto px-4 py-5'>
        <div className='border rounded-lg shadow-sm p-4 bg-white relative'>
          <button 
            onClick={reset} 
            className='absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition-colors'
            title='Reset Progress'
          >
            ↻
          </button>
          <div className='flex items-center gap-2'>
            <h2 className='text-xl font-semibold'>{locationName}</h2>
            <button 
              onClick={() => setIsEditMode(!isEditMode)}
              className='p-1 text-gray-500 hover:text-blue-600 transition-colors'
              title='Edit location and team'
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"></path>
              </svg>
            </button>
          </div>
          
          {isEditMode ? (
            /* Edit Mode Card */
            <div className='mt-4'>
              <div className='space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    Location
                  </label>
                  <input
                    type='text'
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                    placeholder='Enter location name'
                  />
                </div>
                
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    Team
                  </label>
                  <input
                    type='text'
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                    placeholder='Enter your team name'
                  />
                </div>
                
                <div className='flex gap-3'>
                  <button
                    onClick={async () => {
                      try {
                        // Save settings using DualWriteService
                        const settingsData = {
                          location: locationName,
                          team: teamName,
                          updatedAt: new Date().toISOString()
                        };
                        
                        const results = await DualWriteService.saveSettings(settingsData);
                        console.log('✅ Settings saved:', settingsData, results);
                      } catch (error) {
                        console.error('❌ Failed to save settings:', error);
                      }
                      
                      setIsEditMode(false);
                    }}
                    className='flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors'
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => setIsEditMode(false)}
                    className='flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-md transition-colors'
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Normal Mode Card */
            <>
              {teamName && (
                <p className='text-blue-600 text-sm font-medium mt-2'>Team: {teamName}</p>
              )}
              
              {percent === 100 ? (
                <div className='mt-2'>
                  <p className='text-blue-600 text-lg font-semibold'>🎉 Congratulations! You completed the scavenger hunt.</p>
                  <button 
                    className='mt-3 w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-slate-700 hover:from-blue-700 hover:to-slate-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:hover:scale-100'
                    onClick={createPrizeCollage}
                    disabled={collageLoading || collageUrl}
                  >
                    {collageLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Creating Your Prize...
                      </span>
                    ) : collageUrl ? (
                      <>✅ Prize Claimed</>
                    ) : (
                      <>🏆 Claim Prize</>
                    )}
                  </button>
                </div>
              ) : (
                <>
                  <p className='text-slate-600 mt-2'>Each stop: <span className='font-medium'>Clue → Selfie</span>. Complete all to unlock your reward.</p>
                  
                  {/* Enhanced Progress Gauge */}
                  <ProgressGauge 
                    percent={percent}
                    completeCount={completeCount}
                    totalStops={STOPS.length}
                    stops={STOPS}
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

        {/* Render stops using a single generic placeholder until a photo is added */}
        {(() => {
          
          const stopsWithNumbers = [...STOPS].map((stop, originalIndex) => ({
            ...stop,
            originalNumber: originalIndex + 1
          }))
          
          // Find the first incomplete stop (excluding transitioning ones)
          // Only show if there are no transitioning stops (wait for completion transition to finish)
          const firstIncomplete = transitioningStops.size === 0 
            ? stopsWithNumbers.find(stop => !(progress[stop.id]?.done))
            : null
          
          // Get completed stops (excluding transitioning ones) and sort them in descending order
          const completedStops = stopsWithNumbers
            .filter(stop => progress[stop.id]?.done && !transitioningStops.has(stop.id))
            .sort((a, b) => b.originalNumber - a.originalNumber)
          
          // Get transitioning stops (keep them in their current position)
          const transitioningStopsArray = stopsWithNumbers
            .filter(stop => transitioningStops.has(stop.id))
          
          // Return stops in order: transitioning first (in place), then incomplete, then completed
          const stopsToShow = []
          stopsToShow.push(...transitioningStopsArray)
          if (firstIncomplete) {
            stopsToShow.push(firstIncomplete)
          }
          stopsToShow.push(...completedStops)
          
          return stopsToShow.map((s, i) => {
            const state = progress[s.id] || { done: false, notes: '', photo: null, revealedHints: 1 }
            const displayImage = state.photo || PLACEHOLDER
          

          const handlePhotoUpload = async (e) => {
            const file = e.target.files[0]
            if (file && file.type.startsWith('image/')) {
              try {
                const compressedPhoto = await compressImage(file)
                
                // Step 1: First update the photo so user can see it
                setProgress(p => ({
                  ...p,
                  [s.id]: { ...state, photo: compressedPhoto, done: true }
                }))
                
                // Step 2: After a delay to view the photo, start the transition
                setTimeout(() => {
                  setTransitioningStops(prev => new Set([...prev, s.id]))
                  
                  // Step 3: After transition animation, allow reorganization
                  setTimeout(() => {
                    setTransitioningStops(prev => {
                      const newSet = new Set(prev)
                      newSet.delete(s.id)
                      return newSet
                    })
                  }, 1500) // 1.5 second celebration
                }, 800) // 0.8 second delay to view uploaded photo
                
              } catch (error) {
                console.error('Error processing image:', error)
                // Fallback to original method if compression fails
                const reader = new FileReader()
                reader.onloadend = () => {
                  const photoData = reader.result
                  
                  // Step 1: First update the photo so user can see it
                  setProgress(p => ({
                    ...p,
                    [s.id]: { ...state, photo: photoData, done: true }
                  }))
                  
                  // Step 2: After a delay to view the photo, start the transition
                  setTimeout(() => {
                    setTransitioningStops(prev => new Set([...prev, s.id]))
                    
                    // Step 3: After transition animation, allow reorganization
                    setTimeout(() => {
                      setTransitioningStops(prev => {
                        const newSet = new Set(prev)
                        newSet.delete(s.id)
                        return newSet
                      })
                    }, 1500) // 1.5 second celebration
                  }, 800) // 0.8 second delay to view uploaded photo
                }
                reader.readAsDataURL(file)
              }
            }
          }

          const revealNextHint = () => {
            if (state.revealedHints < s.hints.length) {
              setProgress(p => ({
                ...p,
                [s.id]: { ...state, revealedHints: state.revealedHints + 1 }
              }))
            }
          }
          
          const isExpanded = expandedStops[s.id] || false
          const toggleExpanded = () => {
            if (state.done) {
              setExpandedStops(prev => ({
                ...prev,
                [s.id]: !prev[s.id]
              }))
            }
          }
          
          const isTransitioning = transitioningStops.has(s.id)
          
          return (
            <div 
              key={s.id} 
              className={`mt-6 shadow-sm border rounded-lg bg-white p-4 transition-all duration-1000 ease-in-out ${
                isTransitioning 
                  ? 'border-green-300 shadow-lg transform scale-105 bg-green-50' 
                  : state.done 
                    ? 'border-blue-200 cursor-pointer hover:shadow-md transition-shadow' 
                    : ''
              }`}
              onClick={state.done && !isTransitioning ? toggleExpanded : undefined}
              style={{
                transform: isTransitioning ? 'scale(1.02)' : 'scale(1)',
                transition: 'all 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <div className='flex items-start justify-between gap-3'>
                <div className='flex-1'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded ${state.done ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-900'}`}>{s.originalNumber}</span>
                      <h3 className={`text-base font-semibold ${!state.photo ? 'blur-sm' : ''}`}>{s.title}</h3>
                    </div>
                    {state.done && (
                      <span className='text-blue-500'>
                        {isExpanded ? '▼' : '▶'}
                      </span>
                    )}
                    
                    {/* Hint button positioned relative to title */}
                    {(!state.done || isExpanded) && !state.photo && state.revealedHints < s.hints.length && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          revealNextHint()
                        }}
                        className='px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 text-xs font-medium rounded-md transition-colors'
                      >
                        💭 Hint
                      </button>
                    )}
                  </div>
                  
                  {/* Show detailed content for incomplete stops or expanded completed stops */}
                  {(!state.done || isExpanded) && (
                    <>
                      {!state.photo && (
                        <div className='mt-3 ml-8 space-y-2'>
                          {s.hints.slice(0, state.revealedHints).map((hint, hintIndex) => (
                            <p key={hintIndex} className={`text-sm ${hintIndex === 0 ? 'text-slate-800 font-medium' : hintIndex === 1 ? 'text-slate-700' : 'text-slate-600'} leading-relaxed`}>
                              {hint}
                            </p>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Detailed content only for incomplete stops or expanded completed stops */}
              {(!state.done || isExpanded) && (
                <>
                  <div className='mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3'>
                    <div className='rounded-xl border p-3'>
                      <div className={`text-xs uppercase tracking-wide ${state.photo ? 'text-blue-600' : 'text-slate-500'}`}>
                        {state.photo ? '✅ Photo Mission Complete' : 'Photo Mission'}
                      </div>
                      {/* If this image fails to load, confirm the path root (see PHOTO_GUIDES note). */}
                      {displayImage && <img src={displayImage} alt='Selfie' className='mt-2 rounded-md object-cover w-full h-40' onError={(e)=>{e.currentTarget.style.display='none'}} />}
                      <div className='mt-2 flex items-center gap-2 text-xs text-slate-500'>
                        {state.photo ? '✨ Your photo' : '📷 Capture a creative selfie together at this location.'}
                      </div>
                    </div>
                  </div>

                  {!state.photo && (
                    <div className='mt-3'>
                      <input 
                        type='file' 
                        accept='image/*' 
                        onChange={handlePhotoUpload}
                        className='hidden'
                        id={`file-${s.id}`}
                      />
                      <label 
                        htmlFor={`file-${s.id}`}
                        className='w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg cursor-pointer transition-colors flex items-center justify-center gap-2'
                        onClick={(e) => e.stopPropagation()}
                      >
                        📸 Upload Photo
                      </label>
                    </div>
                  )}

                  {state.done && (
                    <div className='mt-3 flex items-center gap-2 text-blue-600 text-sm italic'>
                      <span>❤</span> {s.funFact}
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })
        })()}


        {showTips && (
          <div className='fixed inset-0 z-30'>
            <div className='absolute inset-0 bg-black/40' onClick={()=>setShowTips(false)} />
            <div className='absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-5 shadow-2xl'>
              <div className='mx-auto max-w-screen-sm'>
                <div className='flex items-center justify-between'>
                  <h3 className='text-lg font-semibold flex items-center gap-2'>❤ Date Tips</h3>
                  <button className='px-3 py-1.5' onClick={()=>setShowTips(false)}>Close</button>
                </div>
                <ul className='mt-3 space-y-2 text-sm text-slate-700 list-disc pl-5'>
                  <li>Keep photos about <em>you two</em> and the place—no food in the frame.</li>
                  <li>Golden hour (about an hour before sunset) = soft light, easy wins.</li>
                  <li>Ask a passerby for one wide shot at the Gardens or the Bridge.</li>
                  <li>If the locals' spot is slammed, pivot to another quick bite nearby and keep moving.</li>
                  <li>End by adding a short gratitude note in the app's Notes at the finale stop.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}