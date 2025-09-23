/**
 * TeamLockWrapper - Wrapper component for team lock functionality
 * Conditionally shows splash screen based on team lock state
 */
import React from 'react'
import { SplashGate } from './SplashGate'
import { useTeamLock } from './useTeamLock'

interface TeamLockWrapperProps {
  children: React.ReactNode
}

export function TeamLockWrapper({ children }: TeamLockWrapperProps) {
  const { showSplash, isLoading, onTeamVerified } = useTeamLock()

  // Show loading state while checking team lock
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center">
        <div className="flex items-center space-x-2">
          <svg className="animate-spin h-8 w-8 text-gray-600" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"/>
            <path fill="currentColor" opacity="0.75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
          </svg>
          <span className="text-gray-600">Loading...</span>
        </div>
      </div>
    )
  }

  // Show splash screen when team lock is required and not present
  if (showSplash) {
    return <SplashGate onTeamVerified={onTeamVerified} />
  }

  // Show main app content
  return <>{children}</>
}