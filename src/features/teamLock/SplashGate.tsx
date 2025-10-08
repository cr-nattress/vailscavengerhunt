/**
 * SplashGate - Team code entry splash screen
 * Full-screen overlay for team code verification
 */
import React, { useState, useRef, useEffect } from 'react'
import { LoginService } from '../../services/LoginService'
import { TeamLockService } from '../../services/TeamLockService'
import { ClientTeamErrorHandler } from '../../services/TeamErrorHandler'
import { useAppStore } from '../../store/appStore'

interface SplashGateProps {
  onTeamVerified: (teamId: string, teamName: string, fullResponse?: any) => void
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

  const { sessionId } = useAppStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!teamCode.trim() || isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      // Step 1: Verify team code to get organization and hunt info
      const verifyResponse = await fetch('/.netlify/functions/team-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: teamCode.trim().toUpperCase() })
      })

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json()
        throw new Error(errorData.error || 'Team verification failed')
      }

      const verifyData = await verifyResponse.json()

      // Step 2: Use the organization and hunt from the team code
      const orgId = verifyData.organizationId
      const huntId = verifyData.huntId

      if (!orgId || !huntId) {
        throw new Error('Invalid team code response - missing organization or hunt information')
      }

      // Step 3: Call login-initialize with the correct org/hunt
      const response = await LoginService.verifyTeam(
        orgId,
        huntId,
        teamCode.trim().toUpperCase(),
        sessionId
      )

      if (response.teamVerification?.success) {
        // Generate a simple hash of the team code for client-side storage
        const teamCodeHash = btoa(teamCode.trim().toUpperCase()).substring(0, 12)

        // Store lock in localStorage if we have a lock token
        if (response.teamVerification.lockToken) {
          const lock = {
            teamId: response.teamVerification.teamId!,
            issuedAt: Date.now(),
            expiresAt: Date.now() + (response.teamVerification.ttlSeconds || 86400) * 1000,
            teamCodeHash,
            lockToken: response.teamVerification.lockToken,
            organizationId: orgId,
            huntId: huntId
          }
          TeamLockService.storeLock(lock)
        }

        onTeamVerified(response.teamVerification.teamId!, response.teamVerification.teamName!, response)
      } else {
        setError({
          message: response.teamVerification?.error || "That code didn't work. Check with your host.",
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
        <div className="flex items-center justify-center mb-6">
          {/* Generic Logo - Scavenger Hunt Icon */}
          <svg width="64" height="64" viewBox="0 0 64 64" className="text-gray-700">
            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="3" fill="none"/>
            <path d="M32 12 L38 24 L50 26 L41 35 L43 48 L32 42 L21 48 L23 35 L14 26 L26 24 Z" fill="currentColor"/>
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Scavenger Hunt
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
          className="w-full py-3 px-6 rounded-lg font-medium text-white focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          style={{
            backgroundColor: 'var(--color-cabernet)',
            borderColor: 'var(--color-cabernet)'
          }}
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