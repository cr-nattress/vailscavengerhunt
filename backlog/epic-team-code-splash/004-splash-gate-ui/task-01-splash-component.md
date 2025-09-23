# Task 004.01: Create SplashGate Component with Existing UI Patterns

## Problem
Need a full-screen splash component for team code entry that matches existing UI patterns and provides smooth user experience.

## Solution
Create a SplashGate component following existing component patterns in `src/features/` directories.

## Implementation

### 1. Create SplashGate Component
```tsx
// src/features/teamLock/SplashGate.tsx
import React, { useState, useRef, useEffect } from 'react'
import { TeamService } from '../../services/TeamService'
import { TeamLockService } from '../../services/TeamLockService'
import { ClientTeamErrorHandler } from '../../services/TeamErrorHandler'

interface SplashGateProps {
  onTeamVerified: (teamId: string, teamName: string) => void
  onCancel?: () => void
}

export function SplashGate({ onTeamVerified, onCancel }: SplashGateProps) {
  const [teamCode, setTeamCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<{ message: string; canRetry: boolean } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!teamCode.trim() || isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await TeamService.verifyTeamCode({
        code: teamCode.trim().toUpperCase()
      })

      if (response) {
        // Store lock in localStorage
        const lock = {
          teamId: response.teamId,
          issuedAt: Date.now(),
          expiresAt: Date.now() + (response.ttlSeconds * 1000),
          teamCodeHash: '', // Will be set by service
          lockToken: response.lockToken
        }

        TeamLockService.storeLock(lock)
        onTeamVerified(response.teamId, response.teamName)
      } else {
        setError({
          message: "That code didn't work. Check with your host.",
          canRetry: true
        })
      }
    } catch (error: any) {
      const errorInfo = ClientTeamErrorHandler.handleVerificationError(error)
      setError({
        message: errorInfo.message,
        canRetry: errorInfo.canRetry
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    setTeamCode(value)
    if (error) setError(null) // Clear error on input change
  }

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center p-6">
      {/* Logo/Header Area */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Join Your Team
        </h1>
        <p className="text-gray-600">
          Enter your team code to get started
        </p>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="w-full max-w-md">
        <div className="mb-6">
          <label
            htmlFor="team-code"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Team Code
          </label>
          <input
            ref={inputRef}
            id="team-code"
            type="text"
            value={teamCode}
            onChange={handleInputChange}
            placeholder="Enter your team code"
            className="w-full px-4 py-3 text-lg text-center font-mono uppercase border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
            maxLength={20}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error.message}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!teamCode.trim() || isLoading}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"/>
                <path fill="currentColor" opacity="0.75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              Verifying...
            </span>
          ) : (
            'Join Team'
          )}
        </button>

        {/* Cancel Button (optional) */}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="w-full mt-4 text-gray-600 hover:text-gray-800 font-medium"
          >
            Cancel
          </button>
        )}
      </form>

      {/* Help Text */}
      <div className="mt-8 text-center max-w-md">
        <p className="text-sm text-gray-500">
          Don't have a team code? Contact your event organizer for assistance.
        </p>
      </div>
    </div>
  )
}
```

### 2. Create Hook for Team Lock State
```tsx
// src/features/teamLock/useTeamLock.ts
import { useState, useEffect } from 'react'
import { TeamLockService } from '../../services/TeamLockService'

export interface TeamLockState {
  hasLock: boolean
  teamId: string | null
  teamName: string | null
  isLoading: boolean
}

export function useTeamLock(): TeamLockState {
  const [state, setState] = useState<TeamLockState>({
    hasLock: false,
    teamId: null,
    teamName: null,
    isLoading: true
  })

  useEffect(() => {
    checkLockState()
  }, [])

  const checkLockState = async () => {
    try {
      const lock = TeamLockService.getLock()
      if (lock) {
        // Get team name from server
        const team = await TeamService.getCurrentTeam()
        setState({
          hasLock: true,
          teamId: lock.teamId,
          teamName: team?.teamName || 'Unknown Team',
          isLoading: false
        })
      } else {
        setState({
          hasLock: false,
          teamId: null,
          teamName: null,
          isLoading: false
        })
      }
    } catch (error) {
      console.error('[useTeamLock] Failed to check lock state:', error)
      setState({
        hasLock: false,
        teamId: null,
        teamName: null,
        isLoading: false
      })
    }
  }

  return state
}
```

## Benefits
- Full-screen splash follows existing UI patterns
- Form handling is keyboard and mobile friendly
- Error states provide clear user guidance
- Hook pattern matches existing codebase conventions

## Success Criteria
- [ ] Component matches existing design patterns
- [ ] Form works smoothly on mobile and desktop
- [ ] Error handling provides actionable feedback
- [ ] Loading states are clear and responsive
- [ ] Accessibility features work properly

## Files Created
- `src/features/teamLock/SplashGate.tsx` - Main splash component
- `src/features/teamLock/useTeamLock.ts` - Team lock state hook

## Dependencies
- TeamService and TeamLockService from foundation tasks
- Existing UI patterns and styling approaches