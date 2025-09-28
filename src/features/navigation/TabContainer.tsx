import React, { Suspense, lazy, useEffect } from 'react'
import { useNavigationStore } from './navigationStore'

// Lazy load view components for better performance
const ActiveView = lazy(() => import('../views/ActiveView'))
const HistoryView = lazy(() => import('../views/HistoryView'))
const RankingsView = lazy(() => import('../views/RankingsView'))
const HealthView = lazy(() => import('../views/HealthView'))
const DiagnosticsView = lazy(() => import('../views/DiagnosticsView'))

// Loading component for suspense fallback
const LoadingView: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div style={{ color: 'var(--color-text-secondary)' }}>Loading...</div>
  </div>
)

export const TabContainer: React.FC = () => {
  const { activeTab, setActiveTab } = useNavigationStore()

  // Check for special paths on mount
  useEffect(() => {
    const path = window.location.pathname
    if (path === '/health') {
      setActiveTab('health' as any)
    } else if (path === '/diagnostics') {
      setActiveTab('diagnostics' as any)
    }
  }, [setActiveTab])

  // Add padding bottom for the bottom navigation (except for health/diagnostics views)
  const containerStyle = {
    paddingBottom: (activeTab === 'health' || activeTab === 'diagnostics') ? '0' : '80px', // Account for 64px nav + 16px extra space
  }

  return (
    <div style={containerStyle}>
      <Suspense fallback={<LoadingView />}>
        {activeTab === 'active' && <ActiveView />}
        {activeTab === 'history' && <HistoryView />}
        {activeTab === 'rankings' && <RankingsView />}
        {activeTab === 'health' && <HealthView />}
        {activeTab === 'diagnostics' && <DiagnosticsView />}
      </Suspense>
    </div>
  )
}