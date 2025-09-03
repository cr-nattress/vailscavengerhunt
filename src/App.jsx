import React, {useMemo, useState, useEffect} from 'react'
import { CollageService } from './client/CollageService'

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
const ALL_LOCATIONS = [
  { 
    id: 'covered-bridge', 
    title: 'Covered Bridge', 
    hints: [
      'Begin where timber frames something precious flowing beneath.',
      'Lovers pause under wooden shelter as water rushes below.',
      'The iconic covered bridge spans Gore Creek in Vail Village.'
    ], 
    funFact: 'Vail\'s most popular proposal spot, decorated with thousands of twinkling lights in winter!',
    maps: 'https://www.google.com/maps/search/?api=1&query=Covered+Bridge+Vail+Colorado' 
  },
  { 
    id: 'betty-ford-gardens', 
    title: 'Betty Ford Alpine Gardens', 
    hints: [
      'Seek the highest place where wildflowers dance in mountain air.',
      'A former First Lady\'s name graces this botanical sanctuary.',
      'North America\'s highest botanical garden blooms at 8,200 feet.'
    ], 
    funFact: 'Features a dramatic 120-foot waterfall cascading through the Alpine Rock Garden!',
    maps: 'https://www.google.com/maps/search/?api=1&query=Betty+Ford+Alpine+Gardens+Vail' 
  },
  { 
    id: 'gondola-one', 
    title: 'Gondola One (Eagle Bahn)', 
    hints: [
      'Rise above the village where hearts take flight.',
      'Soar like eagles in suspended chambers above the trees.',
      'The Eagle Bahn Gondola lifts you from Lionshead Village.'
    ], 
    funFact: 'At over 10,000 feet, this is the top proposal spot with Mount of the Holy Cross views!',
    maps: 'https://www.google.com/maps/search/?api=1&query=Eagle+Bahn+Gondola+Vail' 
  },
  { 
    id: 'international-bridge', 
    title: 'International Bridge', 
    hints: [
      'Where many nations unite in colorful display above flowing water.',
      'Flags of the world flutter as you cross from one side to another.',
      'The International Bridge spans Gore Creek with flags from every continent.'
    ], 
    funFact: 'Features flags from every continent creating a United Nations of romance!',
    maps: 'https://www.google.com/maps/search/?api=1&query=International+Bridge+Vail+Village' 
  },
  { 
    id: 'vail-chapel', 
    title: 'Vail Interfaith Chapel', 
    hints: [
      'Find peace where all faiths gather by rushing waters.',
      'A sanctuary nestled among pines where vows echo eternally.',
      'The Interfaith Chapel sits quietly beside Gore Creek.'
    ], 
    funFact: 'Tyrolean design with modernist glue-laminated arches creates unique sacred geometry!',
    maps: 'https://www.google.com/maps/search/?api=1&query=Vail+Interfaith+Chapel' 
  },
  { 
    id: 'mountain-plaza', 
    title: 'Solaris Plaza', 
    hints: [
      'Where fire pits warm hearts beneath twinkling lights.',
      'A gathering place where warmth glows beneath the stars.',
      'Solaris Plaza offers cozy fire pits and evening ambiance.'
    ], 
    funFact: 'Features cozy fire pits perfect for roasting s\'mores under the mountain stars!',
    maps: 'https://www.google.com/maps/search/?api=1&query=Solaris+Plaza+Vail' 
  },
  { 
    id: 'arrabelle', 
    title: 'Arrabelle at Vail Square', 
    hints: [
      'European elegance meets mountain majesty in luxury\'s embrace.',
      'A grand hotel where alpine charm meets Continental sophistication.',
      'The Arrabelle presides over Vail Square in Lionshead Village.'
    ], 
    funFact: 'Features an open-air ice skating rink in winter with European Old World charm!',
    maps: 'https://www.google.com/maps/search/?api=1&query=Arrabelle+Vail+Square' 
  },
  { 
    id: 'piney-river', 
    title: 'Piney River Ranch', 
    hints: [
      'Journey beyond the village to where wilderness meets wonder.',
      'A rustic ranch sits at the edge of pristine mountain waters.',
      'Piney River Ranch offers serenity beside a crystal clear lake.'
    ], 
    funFact: 'A hidden wilderness gem offering pristine mountain lake reflections away from crowds!',
    maps: 'https://www.google.com/maps/search/?api=1&query=Piney+River+Ranch+Vail' 
  },
  { 
    id: 'sculpture-garden', 
    title: 'Vail Village Sculpture Walk', 
    hints: [
      'Art speaks the language of love along winding pathways.',
      'Bronze and stone creations line the cobblestone journey.',
      'The Village Sculpture Walk displays art throughout Vail\'s pedestrian core.'
    ], 
    funFact: 'Features Einstein\'s bronze sculpture where you can sit and chat with a genius!',
    maps: 'https://www.google.com/maps/search/?api=1&query=Vail+Village+Sculpture+Walk' 
  },
  { 
    id: 'the-10th', 
    title: 'The 10th Restaurant', 
    hints: [
      'Ascend to where champagne bubbles meet thin mountain air.',
      'At the mountain\'s peak, toast with panoramic alpine views.',
      'The 10th Restaurant crowns Vail Mountain at 11,570 feet elevation.'
    ], 
    funFact: 'At 11,570 feet elevation, toast with champagne where thin air makes bubbles extra special!',
    maps: 'https://www.google.com/maps/search/?api=1&query=The+10th+Restaurant+Vail+Mountain' 
  },
  { 
    id: 'vista-bahn', 
    title: 'Vista Bahn Mid-Vail', 
    hints: [
      'Pause halfway to heaven where the valley spreads below.',
      'A mid-mountain stop offers breathtaking panoramic views.',
      'Vista Bahn\'s mid-station provides the perfect vantage point.'
    ], 
    funFact: 'The perfect "halfway to heaven" stop with breathtaking panoramic valley views!',
    maps: 'https://www.google.com/maps/search/?api=1&query=Vista+Bahn+Mid-Vail' 
  },
  { 
    id: 'ford-amphitheater', 
    title: 'Gerald R. Ford Amphitheater', 
    hints: [
      'Where music and mountains create magic under starlit skies.',
      'A presidential namesake hosts performances in natural grandeur.',
      'The Gerald R. Ford Amphitheater sits in a natural mountain bowl.'
    ], 
    funFact: 'Natural mountain amphitheater setting with wildflowers peaking in July under the stars!',
    maps: 'https://www.google.com/maps/search/?api=1&query=Gerald+R.+Ford+Amphitheater+Vail' 
  },
]

/**
 * Randomly selects 3 locations from all available locations
 * Uses a seeded approach to ensure consistent selection per session
 */
function getRandomStops() {
  // Create a copy of all locations to avoid mutating the original array
  const shuffled = [...ALL_LOCATIONS]
  
  // Fisher-Yates shuffle algorithm
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  
  // Return first 2 locations
  return shuffled.slice(0, 2)
}

// Generate random selection of 2 stops from all available locations
const STOPS = getRandomStops()

// localStorage key used for persisting progress
const STORAGE_KEY = 'vail-love-hunt-progress'

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
export default function App() {
  const {progress, setProgress, completeCount, percent} = useProgress()
  const [showTips, setShowTips] = useState(false)
  const [storybookUrl, setStorybookUrl] = useState(null)
  const [collageLoading, setCollageLoading] = useState(false)
  const [collageUrl, setCollageUrl] = useState(null)
  const [fullSizeImageUrl, setFullSizeImageUrl] = useState(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [albumExpanded, setAlbumExpanded] = useState(true)
  const [expandedStops, setExpandedStops] = useState({})
  const [transitioningStops, setTransitioningStops] = useState(new Set())

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

  // Helper function to convert base64 to File object
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
      setImageLoaded(false) // Reset image loaded state for new image
      
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
    // Random titles from ALL_LOCATIONS
    const shuffled = [...ALL_LOCATIONS].sort(() => Math.random() - 0.5)
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
    setImageLoaded(false)
    setAlbumExpanded(true)
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
          <button 
            onClick={reset} 
            className='px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/30 rounded-full text-white text-sm font-medium transition-all duration-200 hover:scale-105'
          >
            ↻
          </button>
        </div>
      </header>

      <main className='max-w-screen-sm mx-auto px-4 py-5'>
        <div className='border rounded-lg shadow-sm p-4 bg-white'>
          <h2 className='text-xl font-semibold'>Vail Village</h2>
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
              
              {/* Progress Gauge */}
              <div className='mt-3 flex items-center gap-2 text-sm'>
                <span className='text-blue-600 font-semibold'>{completeCount}/{STOPS.length}</span>
                <div className='flex-1 bg-slate-200 rounded-full h-1.5'>
                  <div 
                    className='bg-blue-500 h-1.5 rounded-full transition-all duration-500'
                    style={{width: `${percent}%`}}
                  />
                </div>
              </div>
              
            </>
          )}
        </div>

        {/* Album container - collapsible after prize is claimed */}
        {collageUrl && (
          <div className={`mt-6 shadow-sm border rounded-lg bg-white p-4 ${
            albumExpanded ? 'border-blue-200' : 'border-gray-200'
          }`}>
            <div 
              className='flex justify-between items-center cursor-pointer'
              onClick={() => setAlbumExpanded(!albumExpanded)}
            >
              <div className='flex items-center gap-2'>
                <span className='text-lg'>📸</span>
                <h3 className='text-lg font-semibold text-slate-700'>Album</h3>
              </div>
              <span className='text-blue-500'>
                {albumExpanded ? '▼' : '▶'}
              </span>
            </div>
            
            {albumExpanded && imageLoaded && (
              <div className='flex justify-center transition-all duration-300 ease-in-out mt-4'>
                <img 
                  src={fullSizeImageUrl} 
                  alt="Full size collage" 
                  className='max-w-full h-auto rounded-lg shadow-md'
                  style={{ maxHeight: '70vh' }}
                />
              </div>
            )}
          </div>
        )}
        
        {/* Hidden image for preloading */}
        {fullSizeImageUrl && !imageLoaded && (
          <img 
            src={fullSizeImageUrl} 
            alt="Preloading collage" 
            className='hidden'
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageLoaded(true)} // Show even if there's an error
          />
        )}

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

          const handlePhotoUpload = async (e) => {
            const file = e.target.files[0]
            if (file && file.type.startsWith('image/')) {
              // Step 1: Add to transitioning stops to keep it in place
              setTransitioningStops(prev => new Set([...prev, s.id]))
              
              try {
                const compressedPhoto = await compressImage(file)
                
                // Step 2: Mark as complete but keep in current position
                setProgress(p => ({
                  ...p,
                  [s.id]: { ...state, photo: compressedPhoto, done: true }
                }))
                
                // Step 3: Wait for completion animation, then allow reorganization
                setTimeout(() => {
                  setTransitioningStops(prev => {
                    const newSet = new Set(prev)
                    newSet.delete(s.id)
                    return newSet
                  })
                }, 1500) // 1.5 second delay for user to see the completion
                
              } catch (error) {
                console.error('Error processing image:', error)
                // Fallback to original method if compression fails
                const reader = new FileReader()
                reader.onloadend = () => {
                  const photoData = reader.result
                  setProgress(p => ({
                    ...p,
                    [s.id]: { ...state, photo: photoData, done: true }
                  }))
                  
                  // Same delay for fallback method
                  setTimeout(() => {
                    setTransitioningStops(prev => {
                      const newSet = new Set(prev)
                      newSet.delete(s.id)
                      return newSet
                    })
                  }, 1500)
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