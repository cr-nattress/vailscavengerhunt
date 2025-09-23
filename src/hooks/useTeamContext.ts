/**
 * useTeamContext - Hook for team lock state management
 * Provides team context throughout the application
 */
import { useState, useEffect } from 'react'
import { TeamLockService } from '../services/TeamLockService'
import { TeamService } from '../services/TeamService'

export interface TeamContext {
  hasTeamLock: boolean
  teamId: string | null
  teamName: string | null
  isLoading: boolean
  lockExpiresAt: number | null
  lockExpiresWithin: (minutes: number) => boolean
  clearTeamLock: () => void
  refreshTeamContext: () => Promise<void>
}

export function useTeamContext(): TeamContext {
  const [state, setState] = useState({
    hasTeamLock: false,
    teamId: null as string | null,
    teamName: null as string | null,
    isLoading: true,
    lockExpiresAt: null as number | null
  })

  const checkTeamLock = async () => {
    try {
      const lock = TeamLockService.getLock()
      if (lock) {
        // Get team name from server or use cached value
        const team = await TeamService.getCurrentTeam()
        setState({
          hasTeamLock: true,
          teamId: lock.teamId,
          teamName: team?.teamName || 'Unknown Team',
          isLoading: false,
          lockExpiresAt: lock.expiresAt
        })
      } else {
        setState({
          hasTeamLock: false,
          teamId: null,
          teamName: null,
          isLoading: false,
          lockExpiresAt: null
        })
      }
    } catch (error) {
      console.error('[useTeamContext] Failed to check team lock:', error)
      // Clear invalid lock on error
      TeamLockService.clearLock()
      setState({
        hasTeamLock: false,
        teamId: null,
        teamName: null,
        isLoading: false,
        lockExpiresAt: null
      })
    }
  }

  const clearTeamLock = () => {
    TeamLockService.clearLock()
    setState({
      hasTeamLock: false,
      teamId: null,
      teamName: null,
      isLoading: false,
      lockExpiresAt: null
    })
  }

  const lockExpiresWithin = (minutes: number): boolean => {
    return TeamLockService.lockExpiresWithin(minutes)
  }

  const refreshTeamContext = async () => {
    setState(prev => ({ ...prev, isLoading: true }))
    await checkTeamLock()
  }

  // Initialize team context on mount
  useEffect(() => {
    checkTeamLock()

    // Listen for team lock events
    const handleTeamLockInvalid = () => {
      clearTeamLock()
    }

    const handleTeamLogout = () => {
      clearTeamLock()
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
    lockExpiresWithin,
    clearTeamLock,
    refreshTeamContext
  }
}