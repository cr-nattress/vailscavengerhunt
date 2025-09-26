/**
 * useTeamLock - Hook for managing team lock UI state
 * Determines when to show splash screen and handles team verification
 */
import { useState, useEffect } from 'react'
import { TeamLockService } from '../../services/TeamLockService'

export interface TeamLockState {
  showSplash: boolean
  hasLock: boolean
  teamId: string | null
  teamName: string | null
  isLoading: boolean
}

export function useTeamLock(): TeamLockState & {
  onTeamVerified: (teamId: string, teamName: string) => void
  hideSplash: () => void
} {
  const [state, setState] = useState<TeamLockState>({
    showSplash: false,
    hasLock: false,
    teamId: null,
    teamName: null,
    isLoading: true
  })

  const checkLockState = async () => {
    try {
      const lock = TeamLockService.getLock()
      if (lock) {
        // Don't call getCurrentTeam - we'll get team info from login-initialize
        // Use teamId as fallback for teamName temporarily
        setState({
          showSplash: false,
          hasLock: true,
          teamId: lock.teamId,
          teamName: lock.teamId, // Will be updated by TeamLockWrapper
          isLoading: false
        })
      } else {
        // Always show splash when no team lock exists
        setState({
          showSplash: true, // Always show splash if no team lock
          hasLock: false,
          teamId: null,
          teamName: null,
          isLoading: false
        })
      }
    } catch (error) {
      console.error('[useTeamLock] Failed to check lock state:', error)
      // Clear invalid lock on error and show splash
      TeamLockService.clearLock()
      setState({
        showSplash: true, // Show splash on error to allow retry
        hasLock: false,
        teamId: null,
        teamName: null,
        isLoading: false
      })
    }
  }

  const onTeamVerified = (teamId: string, teamName: string) => {
    setState(prev => ({
      ...prev,
      showSplash: false,
      hasLock: true,
      teamId,
      teamName
    }))
  }

  const hideSplash = () => {
    setState(prev => ({ ...prev, showSplash: false }))
  }

  // Initialize team lock state on mount
  useEffect(() => {
    checkLockState()

    // Listen for team lock events
    const handleTeamLockInvalid = () => {
      setState(prev => ({
        ...prev,
        showSplash: true,
        hasLock: false,
        teamId: null,
        teamName: null
      }))
    }

    const handleTeamLogout = () => {
      setState(prev => ({
        ...prev,
        showSplash: true,
        hasLock: false,
        teamId: null,
        teamName: null
      }))
    }

    window.addEventListener('team-lock-invalid', handleTeamLockInvalid)
    window.addEventListener('team-logout', handleTeamLogout)

    // Cleanup
    return () => {
      window.removeEventListener('team-lock-invalid', handleTeamLockInvalid)
      window.removeEventListener('team-logout', handleTeamLogout)
    }
  }, [])

  return {
    ...state,
    onTeamVerified,
    hideSplash
  }
}