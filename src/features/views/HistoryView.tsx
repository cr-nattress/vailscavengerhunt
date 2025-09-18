import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { progressService } from '../../services/ProgressService'
import { useAppStore } from '../../store/appStore'
import { useToastActions } from '../notifications/ToastProvider'
import { getRandomStops } from '../../utils/random'
import { useNavigationStore } from '../navigation/navigationStore'

interface HistoryEntry {
  stopId: string
  stopTitle: string
  photo: string
  timestamp: string
  done: boolean
}

const HistoryView: React.FC = () => {
  const { info } = useToastActions()
  const { organizationId, teamName, huntId, locationName } = useAppStore()
  const { activeTab } = useNavigationStore()
  const [expandedPhotos, setExpandedPhotos] = useState<Set<string>>(new Set())

  // Fetch progress data from server with auto-refresh
  const { data: progress, isLoading, error, refetch } = useQuery({
    queryKey: ['history', organizationId, teamName, huntId],
    queryFn: async () => {
      const orgId = organizationId || 'bhhs'
      const teamId = teamName || 'default'
      const hunt = huntId || 'winter-2024'

      try {
        return await progressService.getProgress(orgId, teamId, hunt)
      } catch (err) {
        console.error('Failed to fetch history:', err)
        return {}
      }
    },
    enabled: !!teamName && !!organizationId && !!huntId,
    refetchInterval: 10000, // Refresh every 10 seconds
    refetchOnWindowFocus: true, // Refresh when window regains focus
    refetchOnMount: 'always', // Always fetch fresh data on mount
  })

  // Refetch when tab becomes active
  useEffect(() => {
    if (activeTab === 'history') {
      refetch()
    }
  }, [activeTab, refetch])

  // Get stops information
  const stops = getRandomStops(locationName || 'BHHS')

  // Transform progress data into history entries
  const historyEntries: HistoryEntry[] = stops
    .filter(stop => progress?.[stop.id]?.done)
    .map(stop => ({
      stopId: stop.id,
      stopTitle: stop.title,
      photo: progress[stop.id].photo,
      timestamp: progress[stop.id].timestamp,
      done: true,
    }))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  const togglePhotoExpanded = (stopId: string) => {
    setExpandedPhotos(prev => {
      const next = new Set(prev)
      if (next.has(stopId)) {
        next.delete(stopId)
      } else {
        next.add(stopId)
      }
      return next
    })
  }

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading history...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-500">Failed to load history</div>
      </div>
    )
  }

  return (
    <div className="max-w-screen-sm mx-auto px-4 py-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">History</h2>
        <p className="text-sm text-gray-600 mt-1">
          {historyEntries.length > 0
            ? `${historyEntries.length} completed stops`
            : 'No completed stops yet'}
        </p>
      </div>

      {historyEntries.length === 0 ? (
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
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-gray-500">Complete stops to see them here</p>
          <p className="text-sm text-gray-400 mt-2">
            Your photo memories will appear in this history view
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {historyEntries.map((entry) => (
            <div
              key={entry.stopId}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm"
            >
              <div className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {entry.stopTitle}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatDate(entry.timestamp)}
                    </p>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                    Completed
                  </span>
                </div>

                {entry.photo && (
                  <div
                    className="relative cursor-pointer"
                    onClick={() => togglePhotoExpanded(entry.stopId)}
                  >
                    <img
                      src={entry.photo}
                      alt={entry.stopTitle}
                      className={`
                        w-full rounded-lg object-cover transition-all duration-300
                        ${expandedPhotos.has(entry.stopId) ? 'max-h-none' : 'max-h-48'}
                      `}
                    />
                    {!expandedPhotos.has(entry.stopId) && (
                      <div className="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded-md text-xs">
                        Tap to expand
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default HistoryView