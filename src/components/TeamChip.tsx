/**
 * @file components/TeamChip.tsx
 * @component TeamChip
 * @category UI Components
 *
 * @description
 * Compact team indicator with logout functionality.
 * Features:
 * - Shows current team name in a pill badge
 * - Click to switch teams (with confirmation)
 * - Auto-hides when no team is selected
 * - Glassmorphism styling for overlay contexts
 * - Team icon for visual recognition
 *
 * @stateManagement
 * - Reads team state from TeamContext
 * - Uses TeamService for logout operations
 * - No internal state (fully controlled)
 *
 * @ux
 * - Non-intrusive team indicator
 * - Confirmation dialog prevents accidental logouts
 * - Hover effect for interactivity feedback
 * - Tooltip shows full context
 *
 * @accessibility
 * - Semantic button element
 * - Title attribute for screen readers
 * - Keyboard navigable
 *
 * @relatedComponents
 * - useTeamContext: Team state provider
 * - TeamService: Team management logic
 */

import React from 'react'
import { useTeamContext } from '../hooks/useTeamContext'
import { TeamService } from '../services/TeamService'

interface TeamChipProps {
  /** Additional Tailwind classes for positioning/styling */
  className?: string
  /**
   * Custom click handler override.
   * If not provided, shows default team switch dialog
   */
  onClick?: () => void
}

export function TeamChip({ className = '', onClick }: TeamChipProps) {
  const { hasTeamLock, teamName, isLoading } = useTeamContext()

  /**
   * VISIBILITY: Component only renders when team is selected
   * Prevents UI clutter when not needed
   */
  if (!hasTeamLock || isLoading) {
    return null
  }

  const handleClick = () => {
    if (onClick) {
      // FLEXIBILITY: Allow parent to handle click
      onClick()
    } else {
      /**
       * DEFAULT BEHAVIOR: Team switch confirmation
       * - Shows current team for context
       * - Requires explicit confirmation
       * - Prevents accidental data loss
       */
      const confirmLogout = window.confirm(
        `Currently logged in as: ${teamName}\n\nWould you like to switch teams?`
      )

      if (confirmLogout) {
        // SIDE EFFECT: Clears team state and reloads
        TeamService.logout()
      }
    }
  }

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white bg-opacity-20 text-white hover:bg-opacity-30 transition-colors ${className}`}
      title={`Team: ${teamName}`} // ACCESSIBILITY: Tooltip for context
    >
      {/**
       * ICON: Team/group indicator
       * SVG inline for color inheritance and no extra requests
       * Shows 3 people to represent team concept
       */}
      <svg
        className="w-3 h-3 mr-1"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
      {teamName}
    </button>
  )
}