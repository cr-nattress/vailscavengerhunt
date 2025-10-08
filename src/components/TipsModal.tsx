/**
 * Exports: TipsModal component — Hunt rules and tips overlay
 * Runtime: client
 * Used by: /src/features/views/ActiveView.tsx
 *
 * @ai-purpose: Displays hunt rules modal with close functionality
 * @ai-dont: Don't manage modal state here; receive isOpen/onClose as props
 * @ai-related-files: /src/features/views/ActiveView.tsx
 * @stable
 */
import React from 'react'

interface TipsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function TipsModal({ isOpen, onClose }: TipsModalProps) {
  if (!isOpen) return null

  return (
    <div className='fixed inset-0 z-30'>
      <div
        className='absolute inset-0 bg-black/40 backdrop-blur-sm'
        onClick={onClose}
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
              onClick={onClose}
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
  )
}
