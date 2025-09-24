import React, { useState, useEffect } from 'react'
import { useAppStore } from '../../store/appStore'
import { apiClient } from '../../client/api-client'

interface TeamRanking {
  teamId: string
  rank: number
  completedStops: number
  totalStops: number
  percentComplete: number
  latestActivity: string | null
}

interface LeaderboardData {
  huntId: string
  orgId: string
  teams: TeamRanking[]
  lastUpdated: string
}

export default function LeaderboardView() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { organizationId, huntId, teamName } = useAppStore()

  useEffect(() => {
    loadLeaderboard()
  }, [organizationId, huntId])

  const loadLeaderboard = async () => {
    try {
      setLoading(true)
      setError(null)

      const orgId = organizationId || 'bhhs'
      const hunt = huntId || 'fall-2025'
      const response = await apiClient.get(`/api/leaderboard/${orgId}/${hunt}`)

      setLeaderboard(response.data)
    } catch (err) {
      console.error('Failed to load leaderboard:', err)
      setError('Failed to load leaderboard')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return '-'
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">Loading leaderboard...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={loadLeaderboard}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!leaderboard || leaderboard.teams.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">No teams have started yet</div>
      </div>
    )
  }

  return (
    <div className="max-w-screen-sm mx-auto px-4 py-3">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--color-cabernet)' }}>
          Team Rankings
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Hunt: {leaderboard.huntId} • {leaderboard.teams.length} teams competing
        </p>
      </div>

      {/* Rankings List */}
      <div className="space-y-2">
        {leaderboard.teams.map((team) => {
          const isCurrentTeam = team.teamId === teamName

          return (
            <div
              key={team.teamId}
              className={`border rounded-lg p-4 transition-all ${
                isCurrentTeam
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                {/* Rank and Team Name */}
                <div className="flex items-center gap-3">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${
                      team.rank === 1
                        ? 'bg-yellow-400 text-yellow-900'
                        : team.rank === 2
                        ? 'bg-gray-300 text-gray-700'
                        : team.rank === 3
                        ? 'bg-orange-400 text-orange-900'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {team.rank === 1 ? '🥇' : team.rank === 2 ? '🥈' : team.rank === 3 ? '🥉' : team.rank}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">
                      {team.teamId.toUpperCase()}
                      {isCurrentTeam && (
                        <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-0.5 rounded">
                          Your Team
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      Last active: {formatTime(team.latestActivity)}
                    </div>
                  </div>
                </div>

                {/* Progress */}
                <div className="text-right">
                  <div className="font-bold text-lg" style={{ color: team.percentComplete === 100 ? 'var(--color-green)' : 'inherit' }}>
                    {team.percentComplete}%
                  </div>
                  <div className="text-sm text-gray-600">
                    {team.completedStops}/{team.totalStops} stops
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    team.percentComplete === 100
                      ? 'bg-green-500'
                      : isCurrentTeam
                      ? 'bg-blue-500'
                      : 'bg-gray-400'
                  }`}
                  style={{ width: `${team.percentComplete}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Last Updated */}
      <div className="mt-4 text-center text-xs text-gray-500">
        Last updated: {formatTime(leaderboard.lastUpdated)}
        <button
          onClick={loadLeaderboard}
          className="ml-2 text-blue-600 hover:underline"
        >
          Refresh
        </button>
      </div>
    </div>
  )
}