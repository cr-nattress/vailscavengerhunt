import React, {useState, useEffect} from 'react'
import { ServerStorageService } from './services/ServerStorageService'
import Header from './features/app/Header'
import { BottomNavigation } from './features/navigation/BottomNavigation'
import { TabContainer } from './features/navigation/TabContainer'
import { useNavigationStore } from './features/navigation/navigationStore'
import { useToastActions } from './features/notifications/ToastProvider.tsx'
import { useAppStore } from './store/appStore'
import { getPathParams, isValidParamSet, normalizeParams } from './utils/url'
import { TeamLockWrapper } from './features/teamLock/TeamLockWrapper'
import * as Sentry from '@sentry/react'

/**
 * Vail Scavenger Hunt — React single-page app for a couples' scavenger/date experience in Vail.
 *
 * Key behaviors:
 * - Shows a list of romantic stops with clues and a selfie mission per stop.
 * - Tracks completion and notes on server (team-shared data).
 * - Provides a share action, date tips overlay, and progress bar.
 * - Bottom navigation for switching between views
 */

export default function App() {
  // Toast notifications
  const { success, error: showError, warning, info } = useToastActions()

  // Navigation state
  const { activeTab } = useNavigationStore()

  // Use Zustand store for central state management
  const {
    locationName,
    teamName,
    sessionId,
    eventName,
    organizationId,
    huntId,
    isLoading: settingsLoading,
    setLocationName,
    setTeamName,
    setEventName,
    setOrganizationId,
    setHuntId,
    lockedByQuery,
    setLockedByQuery,
    initializeSettings
  } = useAppStore()

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showTips, setShowTips] = useState(false)

  // Initialize session and load saved settings on app startup
  useEffect(() => {
    // Phase 2: initialize from path params
    const applyFromPath = () => {
      try {
        const params = getPathParams(window.location.pathname)
        if (isValidParamSet(params)) {
          const { location, event, team } = normalizeParams(params)
          setLocationName(location)
          setEventName(event)
          setTeamName(team)
          setLockedByQuery(true)
          console.log('[URL] Locked by path params:', { location, event, team })
        } else {
          setLockedByQuery(false)
          console.log('[URL] No valid path params detected; app remains unlocked')
        }
      } catch (e) {
        setLockedByQuery(false)
        console.warn('[URL] Failed to parse path params; defaulting to unlocked mode:', e)
      }
    }

    applyFromPath()

    const onPopState = () => applyFromPath()
    window.addEventListener('popstate', onPopState)

    const initializeApp = async () => {
      try {
        // Extract org/team/hunt from URL or use defaults
        const pathParts = window.location.pathname.split('/').filter(Boolean)
        let orgId = 'bhhs' // default org
        let teamId = 'berrypicker'
        let huntId = 'fall-2025'

        // If we have path params, use them
        if (pathParts.length >= 3) {
          orgId = pathParts[0]
          teamId = pathParts[2] // Assuming /{org}/{event}/{team} format
          huntId = pathParts[1]
        }

        // Check for query parameters to override path params
        // All three parameters must be present for query params to be used
        const urlParams = new URLSearchParams(window.location.search)
        const hasOrgParam = urlParams.has('org')
        const hasTeamParam = urlParams.has('team')
        const hasHuntParam = urlParams.has('hunt')

        if (hasOrgParam && hasTeamParam && hasHuntParam) {
          // All parameters present - use query params
          orgId = urlParams.get('org')
          teamId = urlParams.get('team')
          huntId = urlParams.get('hunt')
          console.log('📎 Using query params for configuration:', { orgId, teamId, huntId })
        } else if (hasOrgParam || hasTeamParam || hasHuntParam) {
          // Partial parameters - warn and ignore
          console.warn('⚠️ Partial query parameters detected. All three (org, team, hunt) are required.')
          console.warn('  Received:', {
            org: hasOrgParam ? urlParams.get('org') : 'missing',
            team: hasTeamParam ? urlParams.get('team') : 'missing',
            hunt: hasHuntParam ? urlParams.get('hunt') : 'missing'
          })
          console.warn('  Using defaults/path params instead.')
        }

        // Set org and hunt in store
        setOrganizationId(orgId)
        setHuntId(huntId)

        // Initialize settings from server
        console.log('🚀 Initializing settings from server:', { orgId, teamId, huntId })
        await initializeSettings(orgId, teamId, huntId)

        // Initialize session tracking (audit only)
        const sessionData = {
          id: sessionId,
          location: locationName,
          startTime: new Date().toISOString(),
          userAgent: navigator.userAgent
        }

        console.log('📊 Session initialized for tracking:', sessionId)

        // Use ServerStorageService for session tracking
        const result = await ServerStorageService.createSession(sessionId, sessionData)
        console.log('✅ Session tracking started:', result)

        // Verify Sentry integration is working
        try {
          console.log('🧪 Sending Sentry test log...')
          Sentry.addBreadcrumb({
            message: 'App initialized successfully',
            level: 'info',
            data: { sessionId, orgId, teamId, huntId }
          })
          Sentry.captureMessage('User triggered test log - App initialization complete', {
            level: 'info',
            tags: { log_source: 'sentry_test', component: 'app_init' },
            extra: { sessionId, orgId, teamId, huntId }
          })

          // Additional Sentry logger test
          Sentry.logger.info('User triggered test log', { log_source: 'sentry_test' })

          console.log('✅ Sentry test log sent successfully')
        } catch (sentryError) {
          console.warn('⚠️ Sentry test log failed:', sentryError)
        }
      } catch (error) {
        console.error('❌ Failed to initialize app:', error)
      }
    }

    initializeApp()

    return () => {
      window.removeEventListener('popstate', onPopState)
    }
  }, []) // Empty dependency array means this runs once on mount

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMenuOpen && !event.target.closest('header')) {
        setIsMenuOpen(false)
      }
    }

    if (isMenuOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [isMenuOpen])

  // Reset handler
  const reset = () => {
    if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
      // Clear progress will be handled in ActiveView
      window.location.reload()
    }
  }

  return (
    <TeamLockWrapper>
      <div className='min-h-screen text-slate-900' style={{backgroundColor: 'var(--color-background)'}}>
        <Header
          isMenuOpen={isMenuOpen}
          onToggleMenu={() => setIsMenuOpen(!isMenuOpen)}
          completeCount={0} // Will be managed in ActiveView
          totalStops={0} // Will be managed in ActiveView
          percent={0} // Will be managed in ActiveView
          onReset={reset}
          onToggleTips={() => setShowTips(!showTips)}
        />

        <main className='max-w-screen-sm mx-auto'>
          {/* Tab Container - Main Content */}
          <TabContainer />

        {/* Tips Modal */}
        {showTips && (
          <div className='fixed inset-0 z-30'>
            <div
              className='absolute inset-0 bg-black/40 backdrop-blur-sm'
              onClick={()=>setShowTips(false)}
              style={{
                animation: 'fadeIn 0.2s ease-out forwards'
              }}
            />
            <div
              className='absolute inset-x-0 bottom-0 rounded-t-3xl p-5 shadow-2xl'
              style={{
                backgroundColor: 'var(--color-surface)',
                animation: 'slideUpModal 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                marginBottom: '64px' // Account for bottom navigation
              }}
            >
              <div className='mx-auto max-w-screen-sm'>
                <div className='flex items-center justify-between'>
                  <h3 className='text-lg font-semibold flex items-center gap-2' style={{ color: 'var(--color-text-primary)' }}>📖 Rules</h3>
                  <button
                    className='p-2 rounded-lg transition-all duration-150 transform hover:scale-110 active:scale-95'
                    style={{ backgroundColor: 'transparent' }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--color-background)'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    onClick={()=>setShowTips(false)}
                    aria-label='Close'
                  >
                    <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24' style={{ color: 'var(--color-text-secondary)' }}>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                    </svg>
                  </button>
                </div>
                <div className='mt-3 space-y-3 text-sm' style={{ color: 'var(--color-text-primary)' }}>
                  <p className='font-medium'>Take a group photo in front of each location to prove you completed the clue.</p>

                  <div className='space-y-2'>
                    <p className='font-medium'>Two winners will be crowned:</p>
                    <ul className='list-disc pl-5 space-y-1'>
                      <li>The team that finishes first.</li>
                      <li>The team with the most creative photos.</li>
                    </ul>
                  </div>

                  <p>Pay attention to your surroundings — details you notice along the way might help you.</p>

                  <p>Work together, be creative, and enjoy exploring Vail Village!</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

        {/* Bottom Navigation - Hide on health/diagnostics pages */}
        {activeTab !== 'health' && activeTab !== 'diagnostics' && <BottomNavigation />}
      </div>
    </TeamLockWrapper>
  )
}