/**
 * @file components/ProgressRing.tsx
 * @component ProgressRing
 * @category UI Components
 *
 * @description
 * Animated circular progress indicator for stop numbers.
 * Features:
 * - SVG-based circular progress ring
 * - Two states: active (pulsing ring) and completed (badge)
 * - Scalable vector graphics for crisp display
 * - CSS animations for engagement
 *
 * @visualization
 * Active:     ⭕ with number inside and animated stroke
 * Completed:  🟢 smaller badge with white number
 *
 * @performance
 * - SVG rendering is GPU-accelerated
 * - Minimal DOM nodes (2-3 elements)
 * - CSS animations use transform for performance
 *
 * @accessibility
 * - Numbers provide clear sequential indication
 * - Color contrast meets WCAG standards
 * - Size scalable for visibility needs
 *
 * @styling
 * - Theme variables for consistent colors
 * - Responsive sizing via props
 * - Shadow effects for depth perception
 */

import React from 'react'

interface ProgressRingProps {
  /** Stop number to display (1-based index) */
  number: number
  /** Whether this stop has been completed */
  isCompleted: boolean
  /** Diameter of the ring in pixels @default 36 */
  size?: number
  /** Width of the ring stroke @default 3 */
  strokeWidth?: number
}

export default function ProgressRing({ 
  number, 
  isCompleted, 
  size = 36, 
  strokeWidth = 3 
}: ProgressRingProps) {
  /**
   * MATH: Calculate SVG circle dimensions
   * - Radius accounts for stroke width to prevent clipping
   * - Circumference used for dash animation
   */
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const center = size / 2

  if (isCompleted) {
    /**
     * COMPLETED STATE: Achievement badge
     * - 67% of original size for visual hierarchy
     * - Success color with shadow for depth
     * - White text for maximum contrast
     */
    return (
      <div
        className="inline-flex items-center justify-center rounded-full font-semibold text-white"
        style={{
          width: `${size * 0.67}px`, // RATIO: Smaller size indicates completion
          height: `${size * 0.67}px`,
          backgroundColor: 'var(--color-success)',
          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)', // DEPTH: Soft shadow for elevation
          fontSize: `${size * 0.31}px` // PROPORTION: Font scales with container
        }}
      >
        {number}
      </div>
    )
  }

  /**
   * ACTIVE STATE: Animated progress ring
   * Indicates current or upcoming stop with visual emphasis
   */
  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className="transform -rotate-90" // TRANSFORM: Start at 12 o'clock position
      >
        {/* LAYER 1: Background ring for contrast */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={strokeWidth}
        />

        {/**
         * LAYER 2: Animated progress ring
         * - strokeDasharray creates dashed line
         * - strokeDashoffset controls visible portion (75% shown)
         * - Animation creates attention-grabbing pulse effect
         */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={strokeWidth}
          strokeLinecap="round" // POLISH: Rounded ends for softer appearance
          strokeDasharray={circumference}
          strokeDashoffset={circumference * 0.25} // MATH: 25% offset = 75% visible
          style={{
            /**
             * ANIMATION: Pulse effect
             * 2s duration balances attention vs annoyance
             * ease-in-out for natural motion
             */
            animation: 'progressPulse 2s ease-in-out infinite'
          }}
        />
      </svg>

      {/* OVERLAY: Centered number display */}
      <div
        className="absolute inset-0 flex items-center justify-center font-bold"
        style={{
          fontSize: `${size * 0.39}px`, // PROPORTION: 39% of container for readability
          color: 'var(--color-text-primary)'
        }}
      >
        {number}
      </div>
    </div>
  )
}