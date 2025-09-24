import React from 'react'

interface ProgressRingProps {
  number: number
  isCompleted: boolean
  size?: number
  strokeWidth?: number
}

export default function ProgressRing({ 
  number, 
  isCompleted, 
  size = 36, 
  strokeWidth = 3 
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const center = size / 2

  if (isCompleted) {
    // Mini achievement badge for completed stops
    return (
      <div 
        className="inline-flex items-center justify-center rounded-full font-semibold text-white"
        style={{
          width: `${size * 0.67}px`, // Smaller for completed
          height: `${size * 0.67}px`,
          backgroundColor: 'var(--color-success)',
          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
          fontSize: `${size * 0.31}px`
        }}
      >
        {number}
      </div>
    )
  }

  // Animated progress ring for active/current stop
  return (
    <div 
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={strokeWidth}
        />
        
        {/* Progress ring with pulsing animation */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * 0.25} // 75% progress
          style={{
            animation: 'progressPulse 2s ease-in-out infinite'
          }}
        />
      </svg>
      
      {/* Number in center */}
      <div 
        className="absolute inset-0 flex items-center justify-center font-bold"
        style={{ fontSize: `${size * 0.39}px`, color: 'var(--color-text-primary)' }}
      >
        {number}
      </div>
    </div>
  )
}