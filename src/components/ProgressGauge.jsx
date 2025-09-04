import React from 'react';

/**
 * ProgressGauge Component
 * Displays an enhanced progress bar with gradient colors, animations, and progress dots
 * 
 * @param {Object} props
 * @param {number} props.percent - Completion percentage (0-100)
 * @param {number} props.completeCount - Number of completed stops
 * @param {number} props.totalStops - Total number of stops
 * @param {Array} props.stops - Array of stop objects with id
 * @param {Object} props.progress - Progress object with stop completion status
 */
const ProgressGauge = ({ percent, completeCount, totalStops, stops, progress }) => {
  return (
    <div className='mt-4'>
      <div className='flex items-center justify-between mb-2'>
        <span className='text-xs font-medium uppercase tracking-wider' style={{ color: 'var(--color-medium-grey)' }}>Progress</span>
        <span className='text-sm font-bold' style={{ color: 'var(--color-cabernet)' }}>
          {percent}% Complete
        </span>
      </div>
      <div className='relative'>
        {/* Background track */}
        <div className='overflow-hidden h-3 rounded-full shadow-inner' style={{ backgroundColor: 'var(--color-light-grey)' }}>
          <div 
            className='h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden' style={{ background: 'linear-gradient(to right, var(--color-cabernet), var(--color-cabernet-hover))' }}
            style={{width: `${percent}%`}}
          >
            {/* Animated shimmer effect */}
            <div className='absolute inset-0 animate-pulse' style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.3), transparent)' }} />
          </div>
        </div>
        {/* Progress dots */}
        <div className='absolute top-0 left-0 w-full h-3 flex items-center justify-between px-1'>
          {stops.map((stop) => (
            <div 
              key={stop.id}
              className={`w-2 h-2 rounded-full transition-all duration-500 ${
                progress[stop.id]?.done 
                  ? 'bg-white shadow-sm scale-110' 
                  : 'scale-75' }} style={{ backgroundColor: progress[stop.id]?.done ? 'white' : 'var(--color-warm-grey)'
              }`}
            />
          ))}
        </div>
      </div>
      <div className='flex justify-between mt-2'>
        <span className='text-xs' style={{ color: 'var(--color-medium-grey)' }}>{completeCount} of {totalStops} stops</span>
        {completeCount > 0 && completeCount < totalStops && (
          <span className='text-xs font-medium' style={{ color: 'var(--color-cabernet)' }}>
            {totalStops - completeCount} to go! 
          </span>
        )}
      </div>
    </div>
  );
};

export default React.memo(ProgressGauge);