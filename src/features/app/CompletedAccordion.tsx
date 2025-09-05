import React from 'react'
import ProgressRing from '../../components/ProgressRing'

interface CompletedAccordionProps {
  completedStops: any[]
  expandedStops: Record<string, boolean>
  progress: any
  onToggleExpanded: (stopId: string) => void
  completedSectionExpanded: boolean
  onToggleCompletedSection: () => void
}

export default function CompletedAccordion({
  completedStops,
  expandedStops,
  progress,
  onToggleExpanded,
  completedSectionExpanded,
  onToggleCompletedSection
}: CompletedAccordionProps) {
  if (completedStops.length === 0) return null
  
  return (
    <div className='mt-6 border rounded-lg shadow-sm' style={{
      backgroundColor: 'var(--color-white)',
      borderColor: 'var(--color-light-grey)'
    }}>
      {/* Accordion Header */}
      <button
        className='w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-t-lg'
        onClick={onToggleCompletedSection}
        style={{
          backgroundColor: completedSectionExpanded ? 'var(--color-light-pink)' : 'transparent'
        }}
      >
        <div className='flex items-center gap-3'>
          <span className='text-lg font-semibold' style={{ color: 'var(--color-cabernet)' }}>
            📋 Completed Locations
          </span>
          <span 
            className='inline-flex items-center justify-center px-2 py-1 rounded-full text-sm font-bold text-white min-w-[28px] h-7'
            style={{ 
              backgroundColor: '#10B981',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
              fontSize: '13px'
            }}
          >
            {completedStops.length}
          </span>
        </div>
        <span style={{ color: 'var(--color-cabernet)' }}>
          {completedSectionExpanded ? '▼' : '▶'}
        </span>
      </button>

      {/* Accordion Content */}
      {completedSectionExpanded && (
        <div className='border-t' style={{ borderColor: 'var(--color-light-grey)' }}>
          {completedStops.map((s) => {
            const state = progress[s.id]
            const isExpanded = expandedStops[s.id] || false

            return (
              <div key={s.id} className='p-4 border-b last:border-b-0' style={{ borderColor: 'var(--color-light-grey)' }}>
                <button
                  className='w-full text-left flex items-center justify-between hover:bg-gray-50 p-2 -m-2 rounded transition-colors'
                  onClick={() => onToggleExpanded(s.id)}
                >
                  <div className='flex items-center gap-3'>
                    <span className='text-sm' style={{ color: 'var(--color-cabernet)' }}>
                      {isExpanded ? '▼' : '▶'}
                    </span>
                    <ProgressRing 
                      number={s.originalNumber} 
                      isCompleted={true}
                      size={24}
                    />
                    <h3 className='text-base font-medium' style={{ color: 'var(--color-dark-neutral)' }}>
                      {s.title}
                    </h3>
                  </div>
                  <div className='flex items-center'>
                    <span className='inline-flex items-center justify-center w-5 h-5 rounded-full' style={{ 
                      backgroundColor: 'var(--color-success)',
                      color: 'white'
                    }}>
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                  </div>
                </button>
                
                {/* Expanded content */}
                {isExpanded && (
                  <div className='px-4 pb-3'>
                    {state.photo && (
                      <img
                        src={state.photo}
                        alt={`Photo for ${s.title}`}
                        className='w-full max-w-sm mx-auto rounded-lg shadow-sm mt-3'
                        style={{ maxHeight: '300px', objectFit: 'cover' }}
                      />
                    )}
                    <div className='mt-3 text-sm italic' style={{ color: 'var(--color-cabernet)' }}>
                      <span>❤</span> {s.funFact}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}