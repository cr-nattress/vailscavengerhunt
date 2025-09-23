/**
 * TeamChip - Small team indicator component
 * Shows current team name when team lock is active
 */
import React from 'react'
import { useTeamContext } from '../hooks/useTeamContext'
import { TeamService } from '../services/TeamService'

interface TeamChipProps {
  className?: string
  onClick?: () => void
}

export function TeamChip({ className = '', onClick }: TeamChipProps) {
  const { hasTeamLock, teamName, isLoading } = useTeamContext()

  // Don't show anything if no team lock
  if (!hasTeamLock || isLoading) {
    return null
  }

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      // Default action - show team options
      const confirmLogout = window.confirm(
        `Currently logged in as: ${teamName}\n\nWould you like to switch teams?`
      )

      if (confirmLogout) {
        TeamService.logout()
      }
    }
  }

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white bg-opacity-20 text-white hover:bg-opacity-30 transition-colors ${className}`}
      title={`Team: ${teamName}`}
    >
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