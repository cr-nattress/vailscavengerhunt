/**
 * TeamLockWrapper - Wrapper component for team lock functionality
 * Conditionally shows splash screen based on team lock state
 */
import React, { useCallback, useEffect, useState, useRef } from 'react'
import { SplashGate } from './SplashGate'
import { useTeamLock } from './useTeamLock'
import { useAppStore } from '../../store/appStore'
import { LoginService } from '../../services/LoginService'
import * as Sentry from '@sentry/react'

interface TeamLockWrapperProps {
  children: React.ReactNode
}

export function TeamLockWrapper({ children }: TeamLockWrapperProps) {
  const { showSplash, isLoading, onTeamVerified, teamId, teamName } = useTeamLock()
  const { setTeamName, setTeamId, setLocationName, setEventName, setOrganizationId, setHuntId, sessionId } = useAppStore()
  const [isInitializing, setIsInitializing] = useState(false)
  const [hasInitialized, setHasInitialized] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  const retryCount = useRef(0)
  const retryTimeout = useRef<NodeJS.Timeout | null>(null)
  const MAX_RETRIES = 3
  const RETRY_DELAYS = [1000, 2000, 4000] // Exponential backoff: 1s, 2s, 4s

  // Handle team verification and update app store
  const handleTeamVerified = useCallback(async (teamId: string, teamName: string, fullResponse?: any) => {
    // Update the team lock state
    onTeamVerified(teamId, teamName)
    // Update the app store with both team ID and team name
    setTeamId(teamId)  // Set the actual team ID
    setTeamName(teamName)  // Set the human-readable team name

    try {
      setIsInitializing(true)

      // The fullResponse from SplashGate should always be provided now
      // and contains the correct organization and hunt data
      if (!fullResponse) {
        console.error('No response data provided to handleTeamVerified')
        throw new Error('Missing initialization data')
      }

      // Update app store with all data from consolidated response
      setOrganizationId(fullResponse.organization.id)
      setHuntId(fullResponse.hunt.id)

      if (fullResponse.activeData?.settings) {
        setLocationName(fullResponse.activeData.settings.locationName)
        setEventName(fullResponse.activeData.settings.eventName || '')
      }

      console.log('Settings initialized for team:', teamId, 'with name:', teamName,
                  'org:', fullResponse.organization.id, 'hunt:', fullResponse.hunt.id)
    } catch (error) {
      console.error('Failed to initialize settings after team verification:', error)
    } finally {
      setIsInitializing(false)
    }
  }, [onTeamVerified, setTeamId, setTeamName, setLocationName, setEventName, setOrganizationId, setHuntId])

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
          // Get the stored lock to retrieve org and hunt info
          const { TeamLockService } = await import('../../services/TeamLockService')
          const lock = TeamLockService.getLock()

          // Use stored org/hunt or fall back to defaults
          const orgId = lock?.organizationId || 'bhhs'
          const huntId = lock?.huntId || 'fall-2025'

          console.log('Initializing with org:', orgId, 'hunt:', huntId)

          // Fetch complete data using consolidated endpoint
          const response = await LoginService.quickInit(orgId, huntId, sessionId)

          // Update app store with all data
          setOrganizationId(response.organization.id)
          setHuntId(response.hunt.id)

          if (response.activeData?.settings) {
            setLocationName(response.activeData.settings.locationName)
            setEventName(response.activeData.settings.eventName || '')
          }
        } catch (error) {
          console.error('Failed to initialize settings for existing team lock:', error)

          // Report to Sentry
          Sentry.captureException(error, {
            tags: {
              component: 'TeamLockWrapper',
              action: 'initialization',
              retry_count: retryCount.current
            },
            extra: {
              teamId,
              teamName,
              sessionId
            },
            level: 'error'
          })

          // Handle retry logic with exponential backoff
          if (retryCount.current < MAX_RETRIES) {
            const delay = RETRY_DELAYS[retryCount.current] || 4000
            retryCount.current++
            console.log(`Retrying initialization in ${delay}ms (attempt ${retryCount.current}/${MAX_RETRIES})`)

            // Clear any existing timeout
            if (retryTimeout.current) {
              clearTimeout(retryTimeout.current)
            }

            // Schedule a retry with exponential backoff
            retryTimeout.current = setTimeout(() => {
              setHasInitialized(false) // Only reset for retry
            }, delay)
          } else {
            // Max retries reached - show error state
            console.error('Max retries reached for initialization')
            const errorMessage = error instanceof Error ? error.message : 'Failed to initialize application'
            setInitError(errorMessage)

            // Report max retries reached to Sentry
            Sentry.captureMessage('Max retries reached for team initialization', {
              level: 'error',
              tags: {
                component: 'TeamLockWrapper',
                max_retries_reached: true
              },
              extra: {
                teamId,
                teamName,
                sessionId,
                error: errorMessage
              }
            })

            // Keep hasInitialized as true to prevent further retries
            setHasInitialized(true)
          }
        } finally {
          setIsInitializing(false)
        }
      }

      initializeFromExistingLock()
    }

    // Cleanup timeout on unmount
    return () => {
      if (retryTimeout.current) {
        clearTimeout(retryTimeout.current)
      }
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

  // Show error state if initialization failed after max retries
  if (initError) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Application</h2>
          <p className="text-gray-600 mb-6">{initError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh Page
          </button>
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