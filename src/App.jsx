import React, {useMemo, useState, useEffect} from 'react'
import { CollageService } from './client/CollageService'
import { NetlifyStateService } from './client/NetlifyStateService'
import { HybridStorageService } from './client/HybridStorageService'
import { DualWriteService } from './client/DualWriteService'
import ProgressGauge from './components/ProgressGauge'
import AlbumViewer from './components/AlbumViewer'
import vailValleyData from './data/vail-valley.json'
import vailVillageData from './data/vail-village.json'

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
 * Get location data based on selected location name
 */
function getLocationData(locationName) {
  switch(locationName) {
    case 'Vail Village':
      return vailVillageData
    case 'Vail Valley':
      return vailValleyData
    case 'TEST':
      // For TEST, return a subset of Vail Valley data
      return vailValleyData.slice(0, 3)
    default:
      return vailValleyData
  }
}

/**
 * Randomly selects locations from the specified location data
 * Uses a seeded approach to ensure consistent selection per session
 */
function getRandomStops(locationName = 'Vail Valley') {
  const locationData = getLocationData(locationName)
  
  // Create a copy of all locations to avoid mutating the original array
  const shuffled = [...locationData]
  
  // Fisher-Yates shuffle algorithm
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  
  // Return first 5 locations (or all if less than 5)
  return shuffled.slice(0, Math.min(5, shuffled.length))
}

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
function useProgress(stops) {
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
  const completeCount = useMemo(() => stops.reduce((acc, s) => acc + ((progress[s.id]?.done) ? 1 : 0), 0), [progress, stops])
  const percent = Math.round((completeCount / stops.length) * 100)
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
  const [locationName, setLocationName] = useState('Vail Valley')
  const [teamName, setTeamName] = useState('')
  const [stops, setStops] = useState(() => getRandomStops('Vail Valley'))
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
    <div className='min-h-screen text-slate-900' style={{backgroundColor: 'var(--color-cream)'}}>
      <header className='sticky top-0 z-20 backdrop-blur-md border-b' style={{
        backgroundColor: 'var(--color-cabernet)', 
        borderBottomColor: 'var(--color-blush-pink)'
      }}>
        <div className='max-w-screen-sm mx-auto px-4 py-4 flex items-center justify-between relative'>
          <div className='flex-1'></div>
          
          <div className='flex items-center justify-center absolute left-1/2 transform -translate-x-1/2'>
            {/* Official Berkshire Hathaway HomeServices Logo */}
            <svg width="280" height="40" viewBox="0 0 280 40" className='text-white'>
              {/* House icon/symbol */}
              <g transform="translate(0,10)">
                <path d="M8 8 L16 1 L24 8 L24 16 L20 16 L20 10 L12 10 L12 16 L8 16 Z" fill="white"/>
                <rect x="15" y="3" width="2" height="4" fill="white"/>
              </g>
              
              {/* BERKSHIRE HATHAWAY text */}
              <text x="38" y="16" fill="white" fontSize="11" fontWeight="bold" fontFamily="Arial, sans-serif">BERKSHIRE HATHAWAY</text>
              
              {/* HomeServices text */}
              <text x="38" y="30" fill="white" fontSize="9" fontWeight="normal" fontFamily="Arial, sans-serif">HomeServices</text>
              
              {/* Decorative line */}
              <line x1="38" y1="20" x2="220" y2="20" stroke="white" strokeWidth="0.8"/>
            </svg>
          </div>
          
          {/* Hamburger Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className='relative p-2 rounded-lg transition-colors'
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
            aria-label='Menu'
          >
            <div className='w-6 h-5 flex flex-col justify-between'>
              <span className={`block w-full h-0.5 bg-white transform transition-transform ${isMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
              <span className={`block w-full h-0.5 bg-white transition-opacity ${isMenuOpen ? 'opacity-0' : ''}`}></span>
              <span className={`block w-full h-0.5 bg-white transform transition-transform ${isMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
            </div>
          </button>
        </div>
        
        {/* Dropdown Menu */}
        {isMenuOpen && (
          <div 
            className='absolute top-full right-0 left-0 shadow-lg border-t'
            style={{
              backgroundColor: 'var(--color-white)',
              borderTopColor: 'var(--color-blush-pink)',
              animation: 'slideDown 0.2s ease-out forwards',
              transformOrigin: 'top'
            }}
          >
            <div className='max-w-screen-sm mx-auto px-4 py-4'>
              <nav className='space-y-2'>
                <button 
                  onClick={() => {
                    setShowTips(!showTips)
                    setIsMenuOpen(false)
                  }}
                  className='w-full text-left px-4 py-3 rounded-lg transition-all duration-150 transform hover:scale-[1.01] active:scale-[0.99] flex items-center gap-3 opacity-0'
                  onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--color-light-pink)'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  onMouseDown={(e) => e.target.style.backgroundColor = 'var(--color-blush-pink)'}
                  onMouseUp={(e) => e.target.style.backgroundColor = 'var(--color-light-pink)'}
                  style={{
                    animation: 'fadeInSlide 0.3s ease-out 0.1s forwards'
                  }}
                >
                  <svg className='w-5 h-5 text-gray-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' />
                  </svg>
                  <span className='text-gray-700'>Rules</span>
                </button>
                
                <button 
                  onClick={() => {
                    reset()
                    setIsMenuOpen(false)
                  }}
                  className='w-full text-left px-4 py-3 rounded-lg transition-all duration-150 transform hover:scale-[1.01] active:scale-[0.99] flex items-center gap-3 opacity-0'
                  onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--color-light-pink)'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  onMouseDown={(e) => e.target.style.backgroundColor = 'var(--color-blush-pink)'}
                  onMouseUp={(e) => e.target.style.backgroundColor = 'var(--color-light-pink)'}
                  style={{
                    animation: 'fadeInSlide 0.3s ease-out 0.2s forwards'
                  }}
                >
                  <svg className='w-5 h-5 text-gray-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' />
                  </svg>
                  <span className='text-gray-700'>Reset</span>
                </button>
                
                <div className='pt-3 mt-3 border-t opacity-0' style={{
                  borderTopColor: 'var(--color-light-grey)',
                  animation: 'fadeInSlide 0.3s ease-out 0.3s forwards'
                }}>
                  <div className='px-4 py-2 text-sm text-gray-500'>
                    Progress: {completeCount}/{stops.length} stops complete ({percent}%)
                  </div>
                </div>
              </nav>
            </div>
          </div>
        )}
      </header>

      <main className='max-w-screen-sm mx-auto px-4 py-5'>
        <div className='border rounded-lg shadow-sm p-4 relative' style={{
          backgroundColor: 'var(--color-white)',
          borderColor: 'var(--color-light-grey)'
        }}>
          <div className='flex items-center gap-2'>
            <h2 className='text-xl font-semibold'>{locationName}</h2>
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
          </div>
          
          {isEditMode ? (
            /* Edit Mode Card */
            <div className='mt-4'>
              <div className='space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    Location
                  </label>
                  <select
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  >
                    <option value="Vail Valley">Vail Valley</option>
                    <option value="Vail Village">Vail Village</option>
                    <option value="TEST">TEST</option>
                  </select>
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
                    className='flex-1 px-4 py-2 text-white font-medium rounded-md transition-all duration-150 transform hover:scale-[1.02] active:scale-[0.98]'
                    style={{
                      backgroundColor: 'var(--color-cabernet)'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--color-cabernet-hover)'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--color-cabernet)'}
                    onMouseDown={(e) => e.target.style.backgroundColor = 'var(--color-cabernet-active)'}
                    onMouseUp={(e) => e.target.style.backgroundColor = 'var(--color-cabernet-hover)'}
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => setIsEditMode(false)}
                    className='flex-1 px-4 py-2 font-medium rounded-md transition-all duration-150 transform hover:scale-[1.02] active:scale-[0.98]'
                    style={{
                      backgroundColor: 'var(--color-light-grey)',
                      color: 'var(--color-dark-neutral)'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = 'var(--color-warm-grey)'
                      e.target.style.color = 'var(--color-white)'
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = 'var(--color-light-grey)'
                      e.target.style.color = 'var(--color-dark-neutral)'
                    }}
                    onMouseDown={(e) => e.target.style.backgroundColor = 'var(--color-blush-pink)'}
                    onMouseUp={(e) => e.target.style.backgroundColor = 'var(--color-warm-grey)'}
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
                  <p className='text-lg font-semibold' style={{color: 'var(--color-cabernet)'}}>🎉 Congratulations! You completed the scavenger hunt.</p>
                  <button 
                    className='mt-3 w-full px-6 py-3 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-[1.02] disabled:hover:scale-100'
                    style={{
                      background: `linear-gradient(135deg, var(--color-cabernet) 0%, var(--color-cabernet-active) 100%)`,
                      boxShadow: 'var(--shadow-lg)'
                    }}
                    onMouseEnter={(e) => {
                      if (!e.target.disabled) {
                        e.target.style.background = `linear-gradient(135deg, var(--color-cabernet-hover) 0%, var(--color-cabernet) 100%)`
                        e.target.style.boxShadow = 'var(--shadow-xl)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!e.target.disabled) {
                        e.target.style.background = `linear-gradient(135deg, var(--color-cabernet) 0%, var(--color-cabernet-active) 100%)`
                        e.target.style.boxShadow = 'var(--shadow-lg)'
                      }
                    }}
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

        {/* Render stops using a single generic placeholder until a photo is added */}
        {(() => {
          
          const stopsWithNumbers = [...stops].map((stop, originalIndex) => ({
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
              // Start loading state
              setUploadingStops(prev => new Set([...prev, s.id]))
              
              try {
                const compressedPhoto = await compressImage(file)
                
                // Step 1: Immediate feedback with photo
                setProgress(p => ({
                  ...p,
                  [s.id]: { ...state, photo: compressedPhoto, done: true }
                }))
                
                // End loading state
                setUploadingStops(prev => {
                  const newSet = new Set(prev)
                  newSet.delete(s.id)
                  return newSet
                })
                
                // Step 2: Quick celebration animation
                setTimeout(() => {
                  setTransitioningStops(prev => new Set([...prev, s.id]))
                  
                  // Step 3: Complete transition quickly
                  setTimeout(() => {
                    setTransitioningStops(prev => {
                      const newSet = new Set(prev)
                      newSet.delete(s.id)
                      return newSet
                    })
                  }, 600) // Reduced from 1500ms to 600ms
                }, 150) // Reduced from 800ms to 150ms for quicker response
                
              } catch (error) {
                console.error('Error processing image:', error)
                // End loading state on error
                setUploadingStops(prev => {
                  const newSet = new Set(prev)
                  newSet.delete(s.id)
                  return newSet
                })
                // Fallback to original method if compression fails
                const reader = new FileReader()
                reader.onloadend = () => {
                  const photoData = reader.result
                  
                  // Step 1: Immediate feedback with photo
                  setProgress(p => ({
                    ...p,
                    [s.id]: { ...state, photo: photoData, done: true }
                  }))
                  
                  // Step 2: Quick celebration animation
                  setTimeout(() => {
                    setTransitioningStops(prev => new Set([...prev, s.id]))
                    
                    // Step 3: Complete transition quickly
                    setTimeout(() => {
                      setTransitioningStops(prev => {
                        const newSet = new Set(prev)
                        newSet.delete(s.id)
                        return newSet
                      })
                    }, 600) // Reduced from 1500ms to 600ms
                  }, 150) // Reduced from 800ms to 150ms for quicker response
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
              className={`mt-6 shadow-sm border rounded-lg p-4 transition-all duration-1000 ease-in-out ${
                state.done ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
              }`}
              onClick={state.done && !isTransitioning ? toggleExpanded : undefined}
              style={{
                backgroundColor: isTransitioning ? 'var(--color-light-pink)' : 'var(--color-white)',
                borderColor: isTransitioning 
                  ? 'var(--color-success)' 
                  : state.done 
                    ? 'var(--color-blush-pink)'
                    : 'var(--color-light-grey)',
                borderWidth: isTransitioning ? '2px' : '1px',
                transform: isTransitioning ? 'scale(1.05) translateY(-4px)' : 'scale(1)',
                transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                animation: `fadeInSlide 0.4s ease-out ${i * 0.15}s forwards`,
                opacity: 0
              }}
            >
              <div className='flex items-start justify-between gap-3'>
                <div className='flex-1'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded transition-all duration-300 ${state.done ? 'text-white' : 'text-slate-900'}`} style={{ backgroundColor: state.done ? 'var(--color-success)' : 'var(--color-light-grey)' }}>
                        {state.done ? (
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          s.originalNumber
                        )}
                      </span>
                      <h3 className={`text-base font-semibold ${!state.photo ? 'blur-sm' : ''}`} style={{ color: 'var(--color-cabernet)' }}>{s.title}</h3>
                    </div>
                    {state.done && (
                      <span style={{ color: 'var(--color-cabernet)' }}>
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
                        className='px-3 py-1 text-xs font-medium rounded-md transition-all duration-150 transform hover:scale-105 active:scale-95' style={{ backgroundColor: 'var(--color-light-pink)', color: 'var(--color-cabernet)', ':hover': { backgroundColor: 'var(--color-blush-pink)' } }} onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--color-blush-pink)'} onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--color-light-pink)'}
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
                      <div className={`text-xs uppercase tracking-wide ${state.photo ? '' : ''}`} style={{ color: state.photo ? 'var(--color-success)' : 'var(--color-medium-grey)' }}>
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
                        className={`w-full px-4 py-3 text-white font-medium rounded-lg cursor-pointer flex items-center justify-center gap-2 transition-all duration-200 transform ${
                          uploadingStops.has(s.id) 
                            ? 'cursor-wait hover:scale-[1.02] active:scale-[0.98]' 
                            : 'hover:scale-[1.02] active:scale-[0.98]'
                        }`} style={{ backgroundColor: uploadingStops.has(s.id) ? 'var(--color-warm-grey)' : 'var(--color-cabernet)' }} onMouseEnter={(e) => { if (!uploadingStops.has(s.id)) e.target.style.backgroundColor = 'var(--color-cabernet-hover)' }} onMouseLeave={(e) => { if (!uploadingStops.has(s.id)) e.target.style.backgroundColor = 'var(--color-cabernet)' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {uploadingStops.has(s.id) ? (
                          <>
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Processing...
                          </>
                        ) : (
                          <>📸 Upload Photo</>
                        )}
                      </label>
                    </div>
                  )}

                  {state.done && (
                    <div className='mt-3 flex items-center gap-2 text-sm italic' style={{ color: 'var(--color-cabernet)' }}>
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
  )
}