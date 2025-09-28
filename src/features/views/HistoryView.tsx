import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAppStore } from '../../store/appStore'
import { useToastActions } from '../notifications/ToastProvider'
import { useNavigationStore } from '../navigation/navigationStore'
import { apiClient } from '../../services/apiClient'

interface HistoryEntry {
  locationId: string
  title: string
  description: string
  address: string
  position: { lat: number; lng: number } | null
  photo: string | null
  completedAt: string
  done: boolean
  notes: string | null
  revealedHints: number
}

interface ConsolidatedHistoryResponse {
  orgId: string
  teamId: string
  huntId: string
  settings: Record<string, any>
  history: HistoryEntry[]
  config: Record<string, any>
  lastUpdated: string
}

const HistoryView: React.FC = () => {
  const { info } = useToastActions()
  const { organizationId, teamName, huntId, locationName } = useAppStore()
  const { activeTab } = useNavigationStore()
  const [expandedPhotos, setExpandedPhotos] = useState<Set<string>>(new Set())

  // Fetch history data from consolidated endpoint
  const { data, isLoading, error, refetch } = useQuery<ConsolidatedHistoryResponse>({
    queryKey: ['consolidated-history', organizationId, teamName, huntId],
    queryFn: async () => {
      const orgId = organizationId || 'bhhs'
      const teamId = teamName || 'berrypicker'
      const hunt = huntId || 'fall-2025'

      try {
        const response = await apiClient.get<ConsolidatedHistoryResponse>(`/consolidated/history/${orgId}/${teamId}/${hunt}`)

        // Ensure we always return a valid response object
        if (!response) {
          return {
            orgId,
            teamId,
            huntId,
            settings: {},
            history: [],
            config: {},
            lastUpdated: new Date().toISOString()
          }
        }

        // The apiClient.get already returns the parsed body, not a Response object with .data
        return response
      } catch (err) {
        console.error('Failed to fetch history:', err)
        // Return empty history on error rather than throwing to prevent React Query error
        return {
          orgId,
          teamId,
          huntId,
          settings: {},
          history: [],
          config: {},
          lastUpdated: new Date().toISOString()
        }
      }
    },
    enabled: !!teamName && !!organizationId && !!huntId,
    refetchInterval: 30000, // Refresh every 30 seconds (less frequent than before)
    refetchOnWindowFocus: true, // Refresh when window regains focus
    refetchOnMount: 'always', // Always fetch fresh data on mount
    staleTime: 0, // Consider data stale immediately
    gcTime: 0, // Don't cache (previously cacheTime)
  })

  // Refetch when tab becomes active
  useEffect(() => {
    if (activeTab === 'history') {
      refetch()
    }
  }, [activeTab, refetch])

  const togglePhotoExpanded = (locationId: string) => {
    setExpandedPhotos(prev => {
      const next = new Set(prev)
      if (next.has(locationId)) {
        next.delete(locationId)
      } else {
        next.add(locationId)
      }
      return next
    })
  }

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)

    // Handle invalid dates gracefully
    if (isNaN(date.getTime())) {
      return 'Recently'
    }

    try {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    } catch (error) {
      // Fallback for any formatting errors
      return 'Recently'
    }
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

  const historyEntries = data?.history || []

  return (
    <div className="max-w-screen-sm mx-auto px-4 py-4">

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
              key={entry.locationId}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm"
            >
              <div className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {entry.title}
                    </h3>
                    {entry.description && (
                      <p className="text-sm text-gray-600 mt-1">
                        {entry.description}
                      </p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">
                      {formatDate(entry.completedAt)}
                    </p>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                    Completed
                  </span>
                </div>

                {entry.photo && (
                  <div
                    className="relative cursor-pointer"
                    onClick={() => togglePhotoExpanded(entry.locationId)}
                  >
                    <img
                      src={entry.photo}
                      alt={entry.title}
                      className={`
                        w-full rounded-lg object-cover transition-all duration-300
                        ${expandedPhotos.has(entry.locationId) ? 'max-h-none' : 'max-h-48'}
                      `}
                    />
                    {!expandedPhotos.has(entry.locationId) && (
                      <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                        Tap to expand
                      </div>
                    )}
                  </div>
                )}

                {entry.notes && (
                  <div className="mt-3 p-2 bg-gray-50 rounded text-sm text-gray-700">
                    <span className="font-medium">Notes:</span> {entry.notes}
                  </div>
                )}

                {entry.revealedHints > 0 && (
                  <div className="mt-2 text-xs text-gray-500">
                    {entry.revealedHints} hint{entry.revealedHints !== 1 ? 's' : ''} revealed
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