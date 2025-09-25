/**
 * TeamLockWrapper - Wrapper component for team lock functionality
 * Conditionally shows splash screen based on team lock state
 */
import React, { useCallback } from 'react'
import { SplashGate } from './SplashGate'
import { useTeamLock } from './useTeamLock'
import { useAppStore } from '../../store/appStore'

interface TeamLockWrapperProps {
  children: React.ReactNode
}

export function TeamLockWrapper({ children }: TeamLockWrapperProps) {
  const { showSplash, isLoading, onTeamVerified } = useTeamLock()
  const { setTeamName, setTeamId, initializeSettings, organizationId, huntId } = useAppStore()

  // Handle team verification and update app store
  const handleTeamVerified = useCallback(async (teamId: string, teamName: string) => {
    // Update the team lock state
    onTeamVerified(teamId, teamName)
    // Update the app store with both team ID and team name
    setTeamId(teamId)  // Set the actual team ID
    setTeamName(teamName)  // Set the human-readable team name

    // Initialize settings for this team from the server
    // Use default org/hunt if not already set
    const orgId = organizationId || 'bhhs'
    const hunt = huntId || 'fall-2025'

    try {
      await initializeSettings(orgId, teamId, hunt)
      console.log('Settings initialized for team:', teamId)
    } catch (error) {
      console.error('Failed to initialize settings after team verification:', error)
    }
  }, [onTeamVerified, setTeamId, setTeamName, initializeSettings, organizationId, huntId])

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
    return <SplashGate onTeamVerified={handleTeamVerified} />
  }

  // Show main app content
  return <>{children}</>
}