import React, { Suspense, lazy } from 'react'
import { useNavigationStore } from './navigationStore'

// Lazy load view components for better performance
const ActiveView = lazy(() => import('../views/ActiveView'))
const HistoryView = lazy(() => import('../views/HistoryView'))
const RankingsView = lazy(() => import('../views/RankingsView'))
const UpdatesView = lazy(() => import('../views/UpdatesView'))

// Loading component for suspense fallback
const LoadingView: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-gray-500">Loading...</div>
  </div>
)

export const TabContainer: React.FC = () => {
  const { activeTab } = useNavigationStore()

  // Add padding bottom for the bottom navigation
  const containerStyle = {
    paddingBottom: '80px', // Account for 64px nav + 16px extra space
  }

  return (
    <div style={containerStyle}>
      <Suspense fallback={<LoadingView />}>
        {activeTab === 'active' && <ActiveView />}
        {activeTab === 'history' && <HistoryView />}
        {activeTab === 'rankings' && <RankingsView />}
        {activeTab === 'updates' && <UpdatesView />}
      </Suspense>
    </div>
  )
}