/**
 * TeamLockWrapper - Wrapper component for team lock functionality
 * Conditionally shows splash screen based on team lock state
 */
import React, { useCallback, useEffect, useState } from 'react'
import { SplashGate } from './SplashGate'
import { useTeamLock } from './useTeamLock'
import { useAppStore } from '../../store/appStore'
import { LoginService } from '../../services/LoginService'

interface TeamLockWrapperProps {
  children: React.ReactNode
}

export function TeamLockWrapper({ children }: TeamLockWrapperProps) {
  const { showSplash, isLoading, onTeamVerified, teamId, teamName } = useTeamLock()
  const { setTeamName, setTeamId, setLocationName, setEventName, setOrganizationId, setHuntId, sessionId } = useAppStore()
  const [isInitializing, setIsInitializing] = useState(false)
  const [hasInitialized, setHasInitialized] = useState(false)

  // Handle team verification and update app store
  const handleTeamVerified = useCallback(async (teamId: string, teamName: string, fullResponse?: any) => {
    // Update the team lock state
    onTeamVerified(teamId, teamName)
    // Update the app store with both team ID and team name
    setTeamId(teamId)  // Set the actual team ID
    setTeamName(teamName)  // Set the human-readable team name

    try {
      setIsInitializing(true)

      // Use the response data if provided (from SplashGate), otherwise fetch it
      const response = fullResponse || await LoginService.quickInit('bhhs', 'fall-2025', sessionId)

      // Update app store with all data from consolidated response
      setOrganizationId(response.organization.id)
      setHuntId(response.hunt.id)

      if (response.activeData?.settings) {
        setLocationName(response.activeData.settings.locationName)
        setEventName(response.activeData.settings.eventName || '')
      }

      console.log('Settings initialized for team:', teamId, 'with name:', teamName)
    } catch (error) {
      console.error('Failed to initialize settings after team verification:', error)
    } finally {
      setIsInitializing(false)
    }
  }, [onTeamVerified, setTeamId, setTeamName, setLocationName, setEventName, setOrganizationId, setHuntId, sessionId])

  // Initialize settings when we have an existing team lock (e.g., on page refresh)
  useEffect(() => {
    // Only run once when we have a team and haven't initialized yet
    if (!isLoading && teamId && teamName && !showSplash && !hasInitialized) {
      const initializeFromExistingLock = async () => {
        console.log('Existing team lock detected, initializing settings for:', teamId)

        // Mark as initialized immediately to prevent re-runs
        setHasInitialized(true)
        setIsInitializing(true)

        // Update the app store with team info
        setTeamId(teamId)
        setTeamName(teamName)

        try {
          // Fetch complete data using consolidated endpoint
          const response = await LoginService.quickInit('bhhs', 'fall-2025', sessionId)

          // Update app store with all data
          setOrganizationId(response.organization.id)
          setHuntId(response.hunt.id)

          if (response.activeData?.settings) {
            setLocationName(response.activeData.settings.locationName)
            setEventName(response.activeData.settings.eventName || '')
          }
        } catch (error) {
          console.error('Failed to initialize settings for existing team lock:', error)
          // Reset initialized flag on error to allow retry if needed
          setHasInitialized(false)
        } finally {
          setIsInitializing(false)
        }
      }

      initializeFromExistingLock()
    }
  }, [isLoading, teamId, teamName, showSplash, hasInitialized]) // Reduced dependencies

  // Show loading state while checking team lock or initializing
  if (isLoading || isInitializing) {
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