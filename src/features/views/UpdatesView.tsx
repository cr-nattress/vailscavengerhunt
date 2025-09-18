import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAppStore } from '../../store/appStore'

interface Update {
  id: string
  type: 'team_progress' | 'photo_upload' | 'completion' | 'announcement'
  teamName: string
  message: string
  timestamp: string
  metadata?: {
    stopName?: string
    photoUrl?: string
    completionTime?: string
  }
}

const UpdatesView: React.FC = () => {
  const { organizationId, huntId, teamName: currentTeam } = useAppStore()
  const [filter, setFilter] = useState<'all' | 'team' | 'others'>('all')

  // Fetch recent updates
  const { data: updates, isLoading, error } = useQuery({
    queryKey: ['updates', organizationId, huntId],
    queryFn: async () => {
      // For now, return mock data since we don't have a real updates endpoint yet
      // In production, this would fetch from /api/updates/:orgId/:huntId
      const mockUpdates: Update[] = [
        {
          id: '1',
          type: 'announcement',
          teamName: 'System',
          message: 'Welcome to the Vail Love Hunt! Complete all stops to win prizes.',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '2',
          type: 'team_progress',
          teamName: 'Team Alpha',
          message: 'Team Alpha completed "Bridge to Vail" stop',
          timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          metadata: {
            stopName: 'Bridge to Vail',
          },
        },
        {
          id: '3',
          type: 'completion',
          teamName: 'Team Beta',
          message: 'Team Beta finished the hunt! 🎉',
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          metadata: {
            completionTime: '1h 45m',
          },
        },
      ]

      return mockUpdates
    },
    enabled: !!organizationId && !!huntId,
    refetchInterval: 60000, // Refresh every minute
  })

  const getUpdateIcon = (type: Update['type']) => {
    switch (type) {
      case 'team_progress':
        return '📍'
      case 'photo_upload':
        return '📸'
      case 'completion':
        return '🏆'
      case 'announcement':
        return '📢'
      default:
        return '📌'
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  const filteredUpdates = updates?.filter(update => {
    if (filter === 'all') return true
    if (filter === 'team') return update.teamName === currentTeam
    if (filter === 'others') return update.teamName !== currentTeam
    return true
  }) || []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading updates...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-500">Failed to load updates</div>
      </div>
    )
  }

  return (
    <div className="max-w-screen-sm mx-auto px-4 py-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Updates</h2>
        <p className="text-sm text-gray-600 mt-1">
          Recent activity from all teams
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`
            px-3 py-1 rounded-full text-sm font-medium transition-colors
            ${filter === 'all'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }
          `}
        >
          All Updates
        </button>
        <button
          onClick={() => setFilter('team')}
          className={`
            px-3 py-1 rounded-full text-sm font-medium transition-colors
            ${filter === 'team'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }
          `}
        >
          Your Team
        </button>
        <button
          onClick={() => setFilter('others')}
          className={`
            px-3 py-1 rounded-full text-sm font-medium transition-colors
            ${filter === 'others'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }
          `}
        >
          Other Teams
        </button>
      </div>

      {filteredUpdates.length === 0 ? (
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
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-gray-500">No updates yet</p>
          <p className="text-sm text-gray-400 mt-2">
            Activity will appear here as teams make progress
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredUpdates.map((update) => {
            const isOwnTeam = update.teamName === currentTeam
            const isSystem = update.teamName === 'System'

            return (
              <div
                key={update.id}
                className={`
                  bg-white rounded-lg border overflow-hidden shadow-sm
                  ${isSystem ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'}
                `}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">
                      {getUpdateIcon(update.type)}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className={`font-semibold ${
                          isSystem ? 'text-yellow-800' :
                          isOwnTeam ? 'text-blue-600' : 'text-gray-900'
                        }`}>
                          {update.teamName}
                          {isOwnTeam && !isSystem && (
                            <span className="ml-1 text-xs font-normal text-blue-500">
                              (You)
                            </span>
                          )}
                        </h3>
                        <span className="text-xs text-gray-500">
                          {formatTime(update.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">
                        {update.message}
                      </p>

                      {/* Metadata */}
                      {update.metadata && (
                        <div className="mt-2">
                          {update.metadata.completionTime && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Time: {update.metadata.completionTime}
                            </span>
                          )}
                          {update.metadata.photoUrl && (
                            <img
                              src={update.metadata.photoUrl}
                              alt="Update"
                              className="mt-2 rounded-lg max-h-32 object-cover"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Auto-refresh indicator */}
      <div className="mt-6 text-center text-xs text-gray-400">
        Updates refresh automatically every minute
      </div>
    </div>
  )
}

export default UpdatesView