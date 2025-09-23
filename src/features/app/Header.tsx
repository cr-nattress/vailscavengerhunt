import React from 'react'
import { TeamChip } from '../../components/TeamChip'

interface HeaderProps {
  isMenuOpen: boolean
  onToggleMenu: () => void
  completeCount: number
  totalStops: number
  percent: number
  onReset: () => void
  onToggleTips: () => void
}

export default function Header({ 
  isMenuOpen, 
  onToggleMenu, 
  completeCount, 
  totalStops, 
  percent, 
  onReset, 
  onToggleTips 
}: HeaderProps) {
  return (
    <header className='sticky top-0 z-20 backdrop-blur-md border-b' style={{
      backgroundColor: 'var(--color-cabernet)', 
      borderBottomColor: 'var(--color-blush-pink)'
    }}>
      <div className='max-w-screen-sm mx-auto px-4 py-4 flex items-center justify-between'>
        <div className='flex items-center'>
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

        {/* Team Chip (only shows when team lock is active) */}
        <div className="flex-1 flex justify-center">
          <TeamChip />
        </div>

        {/* Hamburger Menu Button */}
        <button
          onClick={onToggleMenu}
          className='relative p-2 rounded-lg transition-colors'
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          }}
          onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
          onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
          aria-label='Menu'
        >
          <div className='w-6 h-5 flex flex-col justify-between relative'>
            <span 
              className={`absolute top-0 left-0 right-0 h-0.5 bg-white transform transition-transform ${isMenuOpen ? 'rotate-45 translate-y-2' : ''}`}
              style={{ width: '100%' }}
            />
            <span 
              className={`absolute top-1/2 left-0 right-0 h-0.5 bg-white transition-opacity ${isMenuOpen ? 'opacity-0' : ''}`}
              style={{ width: '100%', transform: 'translateY(-50%)' }}
            />
            <span 
              className={`absolute bottom-0 left-0 right-0 h-0.5 bg-white transform transition-transform ${isMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}
              style={{ width: '100%' }}
            />
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
                  onToggleTips()
                  onToggleMenu()
                }}
                className='w-full text-left px-4 py-3 rounded-lg transition-all duration-150 transform hover:scale-[1.01] active:scale-[0.99] flex items-center gap-3 opacity-0'
                onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = 'var(--color-light-pink)'}
                onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = 'transparent'}
                onMouseDown={(e) => (e.target as HTMLElement).style.backgroundColor = 'var(--color-blush-pink)'}
                onMouseUp={(e) => (e.target as HTMLElement).style.backgroundColor = 'var(--color-light-pink)'}
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
                  onReset()
                  onToggleMenu()
                }}
                className='w-full text-left px-4 py-3 rounded-lg transition-all duration-150 transform hover:scale-[1.01] active:scale-[0.99] flex items-center gap-3 opacity-0'
                onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = 'var(--color-light-pink)'}
                onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = 'transparent'}
                onMouseDown={(e) => (e.target as HTMLElement).style.backgroundColor = 'var(--color-blush-pink)'}
                onMouseUp={(e) => (e.target as HTMLElement).style.backgroundColor = 'var(--color-light-pink)'}
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
                  Progress: {completeCount}/{totalStops} stops complete ({percent}%)
                </div>
              </div>
            </nav>
          </div>
        </div>
      )}
    </header>
  )
}