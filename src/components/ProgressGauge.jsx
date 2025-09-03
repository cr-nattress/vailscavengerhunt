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
        <span className='text-xs font-medium text-slate-600 uppercase tracking-wider'>Progress</span>
        <span className='text-sm font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent'>
          {percent}% Complete
        </span>
      </div>
      <div className='relative'>
        {/* Background track */}
        <div className='overflow-hidden h-3 bg-slate-100 rounded-full shadow-inner'>
          <div 
            className='h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full transition-all duration-1000 ease-out relative overflow-hidden'
            style={{width: `${percent}%`}}
          >
            {/* Animated shimmer effect */}
            <div className='absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse' />
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
                  : 'bg-slate-300/50 scale-75'
              }`}
            />
          ))}
        </div>
      </div>
      <div className='flex justify-between mt-2'>
        <span className='text-xs text-slate-500'>{completeCount} of {totalStops} stops</span>
        {completeCount > 0 && completeCount < totalStops && (
          <span className='text-xs font-medium text-purple-600'>
            {totalStops - completeCount} to go! 
          </span>
        )}
      </div>
    </div>
  );
};

export default React.memo(ProgressGauge);