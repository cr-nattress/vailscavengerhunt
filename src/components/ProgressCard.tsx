/**
 * Exports: ProgressCard component — Team info and hunt progress display
 * Runtime: client
 * Used by: /src/features/views/ActiveView.tsx
 *
 * @ai-purpose: Displays team/hunt info, progress gauge, and completion message
 * @ai-dont: Don't manage progress state here; receive as props
 * @ai-related-files: /src/components/ProgressGauge.tsx, /src/features/views/ActiveView.tsx
 * @stable
 */
import React from 'react'
import ProgressGauge from './ProgressGauge'

interface Stop {
  id: string
  title: string
  [key: string]: any
}

interface Progress {
  [key: string]: any
}

interface ProgressCardProps {
  teamName: string | null
  huntId: string | null
  percent: number
  completeCount: number
  totalStops: number
  stops: Stop[]
  progress: Progress
  hasSponsors?: boolean
}

export function ProgressCard({
  teamName,
  huntId,
  percent,
  completeCount,
  totalStops,
  stops,
  progress,
  hasSponsors = false
}: ProgressCardProps) {
  return (
    <div
      className={`border rounded-lg shadow-sm px-4 py-3 relative ${hasSponsors ? 'mt-3' : 'mt-0'}`}
      style={{
        backgroundColor: 'var(--color-white)',
        borderColor: 'var(--color-light-grey)'
      }}
    >
      {/* Team and Hunt Name */}
      <div className='flex items-center justify-between text-sm'>
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
            totalStops={totalStops}
            stops={stops}
            progress={progress}
          />
        </div>
      )}
    </div>
  )
}
