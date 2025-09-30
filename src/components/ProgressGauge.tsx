/**
 * @file components/ProgressGauge.tsx
 * @component ProgressGauge
 * @category UI Components
 *
 * @description
 * Visual progress indicator with enhanced UX features.
 * Features:
 * - Animated gradient progress bar
 * - Individual stop completion dots
 * - Percentage and count displays
 * - Shimmer animation for active progress
 * - Responsive to theme variables
 *
 * @visualization
 * ```
 * Progress                    75% Complete
 * [=========•••••○○○○○]       6 of 8 stops | 2 to go!
 * ```
 *
 * @performance
 * - Memoized with React.memo to prevent unnecessary re-renders
 * - CSS transitions handle animations (GPU-accelerated)
 * - Lightweight component with minimal state
 *
 * @accessibility
 * - Progress information conveyed through text and visual cues
 * - High contrast between completed and pending states
 *
 * @styling
 * - Uses CSS variables for theme consistency
 * - Gradient effect for visual appeal
 * - Responsive sizing with relative units
 */

import React from 'react'

interface Stop {
  id: string
  [key: string]: any
}

interface ProgressItem {
  done?: boolean
  [key: string]: any
}

interface ProgressGaugeProps {
  /** Completion percentage (0-100) */
  percent: number
  /** Number of completed stops */
  completeCount: number
  /** Total number of stops in hunt */
  totalStops: number
  /** Stop objects for dot rendering */
  stops: Stop[]
  /** Completion map by stop ID */
  progress: Record<string, ProgressItem>
}

/**
 * Renders a progress gauge with completion visualization.
 *
 * @example
 * <ProgressGauge
 *   percent={75}
 *   completeCount={6}
 *   totalStops={8}
 *   stops={[{id: '1'}, {id: '2'}]}
 *   progress={{'1': {done: true}, '2': {done: false}}}
 * />
 */
const ProgressGauge: React.FC<ProgressGaugeProps> = ({ 
  percent, 
  completeCount, 
  totalStops, 
  stops, 
  progress 
}) => {
  return (
    <div className='mt-4'>
      <div className='flex items-center justify-between mb-2'>
        <span className='text-xs font-medium uppercase tracking-wider' style={{ color: 'var(--color-medium-grey)' }}>Progress</span>
        <span className='text-sm font-bold' style={{ color: 'var(--color-cabernet)' }}>
          {percent}% Complete
        </span>
      </div>
      <div className='relative'>
        {/* VISUAL: Background track provides contrast for progress fill */}
        <div className='overflow-hidden h-3 rounded-full shadow-inner' style={{ backgroundColor: 'var(--color-light-grey)' }}>
          <div
            className='h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden'
            style={{
              /**
               * ANIMATION: Gradient + width animation
               * - 700ms duration for smooth progress updates
               * - Gradient adds depth and visual interest
               */
              background: 'linear-gradient(to right, var(--color-cabernet), var(--color-cabernet-hover))',
              width: `${percent}%`
            }}
          >
            {/* POLISH: Shimmer effect indicates active progress */}
            <div className='absolute inset-0 animate-pulse' style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.3), transparent)' }} />
          </div>
        </div>

        {/**
         * OVERLAY: Individual stop indicators
         * Shows granular progress beyond percentage
         * Helps users identify specific incomplete stops
         */}
        <div className='absolute top-0 left-0 w-full h-3 flex items-center justify-between px-1'>
          {stops.map((stop) => (
            <div
              key={stop.id}
              className={`w-2 h-2 rounded-full transition-all duration-500 ${
                /**
                 * STATE VISUALIZATION:
                 * - Completed: White, larger, with shadow
                 * - Pending: Grey, smaller scale
                 * Transition duration matches bar animation
                 */
                progress[stop.id]?.done
                  ? 'bg-white shadow-sm scale-110'
                  : 'scale-75' }} style={{ backgroundColor: progress[stop.id]?.done ? 'white' : 'var(--color-warm-grey)'
              }`}
            />
          ))}
        </div>
      </div>
      <div className='flex justify-between mt-2'>
        <span className='text-xs' style={{ color: 'var(--color-medium-grey)' }}>
          {completeCount} of {totalStops} stops
        </span>
        {/**
         * MOTIVATION: Countdown message
         * Only shown when progress is partial (not at start or end)
         * Provides encouragement and clear goal visibility
         */}
        {completeCount > 0 && completeCount < totalStops && (
          <span className='text-xs font-medium' style={{ color: 'var(--color-cabernet)' }}>
            {totalStops - completeCount} to go!
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * OPTIMIZATION: React.memo prevents re-renders
 * Component only updates when props actually change
 * Important for parent components that render frequently
 */
export default React.memo(ProgressGauge)
