import React, { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAppStore } from '../../store/appStore'
import { useToastActions } from '../notifications/ToastProvider'
import { useNavigationStore } from '../navigation/navigationStore'

interface LeaderboardEntry {
  teamId: string
  completedStops: number
  totalStops: number
  percentComplete: number
  totalTimeMs?: number | null
  totalTimeFormatted?: string | null
  averageTimeMs?: number | null
  averageTimeFormatted?: string | null
  firstCompletedAt?: string | null
  lastCompletedAt?: string | null
  isComplete?: boolean
  rank: number
}

const RankingsView: React.FC = () => {
  // const { error: showError } = useToastActions()
  const { organizationId, huntId, teamName: currentTeam } = useAppStore()
  const { activeTab } = useNavigationStore()

  // Fetch leaderboard data
  const { data: leaderboardData, isLoading, error, refetch } = useQuery({
    queryKey: ['leaderboard', organizationId, huntId],
    queryFn: async () => {
      // Safety check: Ensure all required auth context is present
      if (!organizationId || !huntId) {
        console.error('[RankingsView] Missing required authentication context', {
          organizationId: !!organizationId,
          huntId: !!huntId
        })
        throw new Error('Missing required authentication context')
      }

      try {
        const response = await fetch(`/api/leaderboard/${organizationId}/${huntId}`)
        if (!response.ok) {
          if (response.status === 404) {
            // No data yet, return empty leaderboard
            return { teams: [] }
          }
          throw new Error('Failed to fetch leaderboard')
        }
        const data = await response.json()
        return data
      } catch (err) {
        console.error('Failed to fetch leaderboard:', err)
        return { teams: [] }
      }
    },
    enabled: !!organizationId && !!huntId,
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  // Refetch when tab becomes active
  useEffect(() => {
    if (activeTab === 'rankings') {
      refetch()
    }
  }, [activeTab, refetch])

  const leaderboard = leaderboardData?.teams || []

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇'
      case 2:
        return '🥈'
      case 3:
        return '🥉'
      default:
        return `#${rank}`
    }
  }

  const getCompletionPercentage = (completed: number, total: number) => {
    if (total === 0) return 0
    return Math.round((completed / total) * 100)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading rankings...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-500">Failed to load rankings</div>
      </div>
    )
  }

  // The leaderboard is already sorted and ranked by the server
  const sortedLeaderboard = leaderboard

  return (
    <div className="max-w-screen-sm mx-auto px-4 py-4">

      {sortedLeaderboard.length === 0 ? (
        <div className="text-center py-12">
          <svg
            className="w-16 h-16 mx-auto text-gray-300 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
            />
          </svg>
          <p className="text-gray-500">Be the first to start!</p>
          <p className="text-sm text-gray-400 mt-2">
            Complete stops to appear on the leaderboard
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedLeaderboard.map((entry: LeaderboardEntry) => {
            const percentage = entry.percentComplete || getCompletionPercentage(entry.completedStops, entry.totalStops)
            const isCurrentTeam = entry.teamId === currentTeam
            const isWinner = entry.isComplete && entry.rank === 1

            return (
              <div
                key={entry.teamId}
                className={`
                  bg-white rounded-lg border overflow-hidden shadow-sm
                  ${isCurrentTeam ? 'border-blue-500 border-2' : 'border-gray-200'}
                  ${isWinner ? 'ring-2 ring-yellow-400' : ''}
                `}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold">
                        {getRankIcon(entry.rank)}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className={`font-semibold ${isCurrentTeam ? 'text-blue-600' : 'text-gray-900'}`}>
                            {entry.teamId.toUpperCase()}
                            {isCurrentTeam && (
                              <span className="ml-2 text-xs font-normal text-blue-500">
                                (You)
                              </span>
                            )}
                          </h3>
                          {isWinner && (
                            <span className="px-2 py-0.5 text-xs font-bold bg-yellow-100 text-yellow-800 rounded-full">
                              🏆 WINNER
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {entry.completedStops} of {entry.totalStops} stops
                          {entry.totalTimeFormatted && (
                            <span className="ml-2">• {entry.totalTimeFormatted} total</span>
                          )}
                        </p>
                        {entry.averageTimeFormatted && entry.completedStops > 0 && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            Avg: {entry.averageTimeFormatted} per stop
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        {percentage}%
                      </div>
                      {entry.isComplete && (
                        <p className="text-xs text-green-600">
                          Finished!
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        entry.isComplete
                          ? 'bg-green-500'
                          : isCurrentTeam
                          ? 'bg-blue-500'
                          : 'bg-gray-400'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Legend */}
      {sortedLeaderboard.length > 0 && (
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-sm text-gray-700 mb-2">How Rankings Work</h3>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Teams with more completed stops rank higher</li>
            <li>• Teams with same completions are ranked by fastest total time</li>
            <li>• First team to complete ALL stops wins overall 🏆</li>
            <li>• Total time = time from first to last completion</li>
            <li>• Rankings update automatically every 30 seconds</li>
          </ul>
        </div>
      )}
    </div>
  )
}

export default RankingsView