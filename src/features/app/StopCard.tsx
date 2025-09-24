import React from 'react'
import ProgressRing from '../../components/ProgressRing'

const PLACEHOLDER = '/images/selfie-placeholder.svg'

interface StopCardProps {
  stop: any
  progress: any
  onUpload: (stopId: string, file: File) => Promise<void>
  onToggleExpanded: (stopId: string) => void
  expanded: boolean
  uploadingStops: Set<string>
  transitioningStops: Set<string>
  revealNextHint: () => void
  index: number
}

export default function StopCard({
  stop,
  progress,
  onUpload,
  onToggleExpanded,
  expanded,
  uploadingStops,
  transitioningStops,
  revealNextHint,
  index
}: StopCardProps) {
  const state = progress[stop.id] || { done: false, notes: '', photo: null, revealedHints: 0 }
  const displayImage = state.photo || PLACEHOLDER
  const isTransitioning = transitioningStops.has(stop.id)
  const isUploading = uploadingStops.has(stop.id)

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      await onUpload(stop.id, file)
    }
  }

  return (
    <div 
      className={`mt-3 shadow-sm border rounded-lg p-4 transition-all duration-1000 ease-in-out ${
        state.done ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
      }`}
      onClick={state.done && !isTransitioning ? () => onToggleExpanded(stop.id) : undefined}
      style={{
        backgroundColor: isTransitioning ? 'var(--color-accent)' : 'var(--color-surface)',
        borderColor: isTransitioning 
          ? 'var(--color-success)' 
          : state.done
            ? 'var(--color-accent)'
            : 'var(--color-border)',
        borderWidth: isTransitioning ? '2px' : '1px',
        transform: isTransitioning ? 'scale(1.05) translateY(-4px)' : 'scale(1)',
        transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
        animation: `fadeInSlide 0.4s ease-out ${index * 0.15}s forwards`,
        opacity: 0
      }}
    >
      <div className='flex items-start justify-between gap-3'>
        <div className='flex-1'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              {state.done ? (
                <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              ) : (
                <ProgressRing 
                  number={stop.originalNumber} 
                  isCompleted={false}
                  size={36}
                />
              )}
              <h3 className={`text-base font-semibold ${!state.photo ? 'blur-sm' : ''}`} style={{ color: 'var(--color-text-primary)' }}>{stop.title}</h3>
            </div>
            {state.done && (
              <span style={{ color: 'var(--color-text-primary)' }}>
                {expanded ? '▼' : '▶'}
              </span>
            )}
            
            {/* Minimal Icon Badge hint button */}
            {(!state.done || expanded) && !state.photo && stop.hints && stop.hints.length > 0 && state.revealedHints < stop.hints.length && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  revealNextHint()
                }}
                className='relative w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 shadow-sm'
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)'
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = 'var(--color-background)'
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = 'var(--color-surface)'
                }}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" style={{ color: 'var(--color-text-primary)' }}>
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
                <span className='absolute -top-1 -right-1 w-4 h-4 text-white text-xs rounded-full flex items-center justify-center font-bold'
                      style={{ backgroundColor: 'var(--color-accent)' }}>
                  {state.revealedHints + 1}
                </span>
              </button>
            )}
          </div>
          
          {/* Show detailed content for incomplete stops or expanded completed stops */}
          {(!state.done || expanded) && (
            <>
              {/* Display the main clue if it exists - always show for incomplete stops */}
              {!state.photo && stop.clue && (
                <div className='mt-3'>
                  <div
                    className='border-l-3 p-3 rounded-r-lg transition-all duration-300'
                    style={{
                      backgroundColor: 'var(--color-surface)',
                      borderColor: 'var(--color-accent)',
                      animation: `slideInFromLeft 0.4s ease-out forwards`,
                      opacity: 0
                    }}
                  >
                    <div className='flex items-center gap-2'>
                      <span>🎯</span>
                      <p className='text-sm' style={{ color: 'var(--color-text-primary)' }}>
                        <strong>Clue:</strong> {stop.clue}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Display revealed hints */}
              {!state.photo && (
                <div className='mt-3 space-y-2'>
                  {stop.hints && stop.hints.slice(0, state.revealedHints).map((hint: string, hintIndex: number) => {
                    const hintConfig = {
                      0: { bg: 'var(--color-surface)', border: 'var(--color-accent)', text: 'var(--color-accent)', icon: '🎯' },
                      1: { bg: 'var(--color-surface)', border: 'var(--color-accent)', text: 'var(--color-accent)', icon: '🔍' },
                      2: { bg: 'var(--color-surface)', border: 'var(--color-accent)', text: 'var(--color-accent)', icon: '💡' }
                    }[hintIndex] || { bg: '#f8fafc', border: '#64748b', text: '#334155', icon: String(hintIndex + 1) }
                    
                    return (
                      <div 
                        key={hintIndex}
                        className='border-l-3 p-3 rounded-r-lg transition-all duration-300'
                        style={{
                          backgroundColor: hintConfig.bg,
                          borderColor: hintConfig.border,
                          animation: `slideInFromLeft 0.4s ease-out ${hintIndex * 0.1}s forwards`,
                          opacity: 0
                        }}
                      >
                        <div className='flex items-center gap-2'>
                          <span 
                            className='flex-shrink-0 w-6 h-6 text-white text-xs font-bold rounded-full flex items-center justify-center'
                            style={{ backgroundColor: hintConfig.border }}
                          >
                            {hintConfig.icon}
                          </span>
                          <p className='text-sm leading-snug flex-1' style={{ color: 'var(--color-text-primary)' }}>
                            {hint}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Detailed content only for incomplete stops or expanded completed stops */}
      {(!state.done || expanded) && (
        <>
          <div className='mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3'>
            <div className='rounded-xl p-3' style={{ border: '1px solid var(--color-border)' }}>
              {state.photo && (
                <div className={`text-xs uppercase tracking-wide`} style={{ color: 'var(--color-success)' }}>
                  ✅ Photo Complete
                </div>
              )}
              {/* If this image fails to load, confirm the path root (see PHOTO_GUIDES note). */}
              {displayImage && <img src={displayImage} alt='Selfie' className='mt-2 rounded-md object-cover w-full h-40' onError={(e) => {(e.target as HTMLElement).style.display='none'}} />}
              <div className='mt-2 flex items-center gap-2 text-xs' style={{ color: 'var(--color-text-secondary)' }}>
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
                id={`file-${stop.id}`}
              />
              <label 
                htmlFor={`file-${stop.id}`}
                className={`w-full px-4 py-3 text-white font-medium rounded-lg cursor-pointer flex items-center justify-center gap-2 transition-all duration-200 transform ${
                  isUploading 
                    ? 'cursor-wait hover:scale-[1.02] active:scale-[0.98]' 
                    : 'hover:scale-[1.02] active:scale-[0.98]'
                }`} 
                style={{ backgroundColor: isUploading ? 'var(--color-warm-grey)' : 'var(--color-accent)' }}
                onMouseEnter={(e) => { if (!isUploading) (e.target as HTMLElement).style.backgroundColor = 'var(--color-accent)' }}
                onMouseLeave={(e) => { if (!isUploading) (e.target as HTMLElement).style.backgroundColor = 'var(--color-accent)' }}
                onClick={(e) => e.stopPropagation()}
              >
                {isUploading ? (
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
            <div className='mt-3 flex items-center gap-2 text-sm italic' style={{ color: 'var(--color-text-secondary)' }}>
              <span>❤</span> {stop.funFact}
            </div>
          )}
        </>
      )}
    </div>
  )
}