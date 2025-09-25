import React from 'react'

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
      backgroundColor: 'var(--color-surface)',
      borderBottomColor: 'var(--color-border)'
    }}>
      <div className='max-w-screen-sm mx-auto px-4 py-2 flex items-center justify-between'>
        <div className='flex items-center justify-start !self-center' style={{ flex: '1.2 0 auto' }}>
          <div className='flex items-center justify-start' style={{ alignItems: 'center !important', width: '100%' }}>
            <img
              src="/app-logo.svg"
              alt="FindrQuest"
              className="h-10 w-auto max-w-[300px] object-contain !self-center"
              style={{
                display: 'block',
                alignSelf: 'center !important',
                margin: '0'
              }}
            />
          </div>
        </div>

        {/* Hamburger Menu Button */}
        <button
          onClick={onToggleMenu}
          className='relative p-1.5 rounded-lg transition-colors'
          style={{
            backgroundColor: 'var(--color-background)',
          }}
          onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = 'var(--color-border)'}
          onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = 'var(--color-background)'}
          aria-label='Menu'
        >
          <div className='w-6 h-5 flex flex-col justify-between relative'>
            <span
              className={`absolute top-0 left-0 right-0 h-0.5 transform transition-transform ${isMenuOpen ? 'rotate-45 translate-y-2' : ''}`}
              style={{ width: '100%', backgroundColor: 'var(--color-text-primary)' }}
            />
            <span
              className={`absolute top-1/2 left-0 right-0 h-0.5 transition-opacity ${isMenuOpen ? 'opacity-0' : ''}`}
              style={{ width: '100%', transform: 'translateY(-50%)', backgroundColor: 'var(--color-text-primary)' }}
            />
            <span
              className={`absolute bottom-0 left-0 right-0 h-0.5 transform transition-transform ${isMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}
              style={{ width: '100%', backgroundColor: 'var(--color-text-primary)' }}
            />
          </div>
        </button>
      </div>
      
      {/* Dropdown Menu */}
      {isMenuOpen && (
        <div 
          className='absolute top-full right-0 left-0 shadow-lg border-t'
          style={{
            backgroundColor: 'var(--color-surface)',
            borderTopColor: 'var(--color-border)',
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
                onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = 'var(--color-background)'}
                onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = 'transparent'}
                onMouseDown={(e) => (e.target as HTMLElement).style.backgroundColor = 'var(--color-border)'}
                onMouseUp={(e) => (e.target as HTMLElement).style.backgroundColor = 'var(--color-background)'}
                style={{
                  animation: 'fadeInSlide 0.3s ease-out 0.1s forwards'
                }}
              >
                <svg className='w-5 h-5 text-gray-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' />
                </svg>
                <span style={{ color: 'var(--color-text-primary)' }}>Rules</span>
              </button>
              
              <div className='pt-3 mt-3 border-t opacity-0' style={{
                borderTopColor: 'var(--color-border)',
                animation: 'fadeInSlide 0.3s ease-out 0.2s forwards'
              }}>
                <div className='px-4 py-2 text-sm' style={{ color: 'var(--color-text-secondary)' }}>
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