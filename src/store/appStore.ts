import { create } from 'zustand'
import serverSettingsService from '../services/ServerSettingsService'
import ConsolidatedDataService from '../services/ConsolidatedDataService'

interface AppState {
  locationName: string
  teamName: string
  teamId: string  // Actual team ID from team verification
  sessionId: string
  eventName: string
  lockedByQuery: boolean
  organizationId: string
  huntId: string
  isLoading: boolean
  error: string | null
}

interface AppActions {
  setLocationName: (locationName: string) => void
  setTeamName: (teamName: string) => void
  setTeamId: (teamId: string) => void
  setSessionId: (sessionId: string) => void
  setEventName: (eventName: string) => void
  setLockedByQuery: (locked: boolean) => void
  setOrganizationId: (orgId: string) => void
  setHuntId: (huntId: string) => void
  initializeSettings: (orgId: string, teamId: string, huntId: string, teamName?: string) => Promise<void>
  saveSettingsToServer: () => Promise<void>
}

type AppStore = AppState & AppActions

// Generate a unique session ID (GUID)
const generateSessionId = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// Store without persist middleware - server sync instead
export const useAppStore = create<AppStore>((set, get) => ({
  // State
  locationName: 'BHHS',
  teamName: '',
  teamId: '',
  sessionId: generateSessionId(),
  eventName: '',
  lockedByQuery: false,
  organizationId: '',
  huntId: '',
  isLoading: false,
  error: null,

  // Actions
  setLocationName: async (locationName: string) => {
    set({ locationName })
    // Don't auto-save - let user explicitly save if needed
  },

  setTeamName: async (teamName: string) => {
    set({ teamName })
    // Don't auto-save - let user explicitly save if needed
  },

  setTeamId: (teamId: string) => set({ teamId }),

  setSessionId: (sessionId: string) => set({ sessionId }),

  setEventName: async (eventName: string) => {
    set({ eventName })
    // Don't auto-save - let user explicitly save if needed
  },

  setLockedByQuery: (locked: boolean) => set({ lockedByQuery: locked }),

  setOrganizationId: (orgId: string) => set({ organizationId: orgId }),

  setHuntId: (huntId: string) => set({ huntId }),

  // Initialize settings from consolidated data
  initializeSettings: async (orgId: string, teamId: string, huntId: string, teamName?: string) => {
    set({ isLoading: true, error: null })

    try {
      const { sessionId } = get()

      // Try to get settings from consolidated data first
      try {
        const consolidatedData = await ConsolidatedDataService.getActiveData(orgId, teamId, huntId)

        if (consolidatedData?.settings) {
          // Use settings from consolidated data
          const settings = consolidatedData.settings
          set({
            locationName: settings.locationName || 'BHHS',
            teamName: settings.teamName || teamName || teamId,
            teamId: teamId,
            eventName: settings.eventName || '',
            organizationId: orgId,
            huntId,
            isLoading: false
          })
          console.log('[AppStore] Initialized settings from consolidated data')
          return
        }
      } catch (error) {
        console.log('[AppStore] Could not get consolidated data, will create new settings:', error)
      }

      // If no existing settings, just use defaults locally
      // Don't save to server - let the consolidated endpoint handle that
      const defaultSettings = {
        locationName: 'BHHS',
        teamName: teamName || teamId,
        sessionId,
        eventName: '',
        organizationId: orgId,
        huntId
      }

      set({
        ...defaultSettings,
        teamId: teamId,
        isLoading: false
      })
      console.log('[AppStore] Using default settings (no server save needed)')

    } catch (error) {
      console.error('[AppStore] Failed to initialize settings:', error)
      set({
        error: error instanceof Error ? error.message : 'Failed to load settings',
        isLoading: false,
        // Use defaults on error
        organizationId: orgId,
        huntId,
        teamName: teamName || teamId,
        teamId: teamId
      })
    }
  },

  // Save current settings to server
  saveSettingsToServer: async () => {
    const state = get()
    const { organizationId, teamName, teamId, huntId, sessionId } = state

    // Use teamId if available, otherwise fallback to teamName
    const effectiveTeamId = teamId || teamName

    if (!organizationId || !effectiveTeamId || !huntId) {
      console.warn('[AppStore] Cannot save - missing org/team/hunt info')
      return
    }

    try {
      const settings = {
        locationName: state.locationName,
        teamName: state.teamName,  // This is the display name
        teamId: state.teamId,        // This is the actual ID
        sessionId: state.sessionId,
        eventName: state.eventName,
        organizationId,
        huntId
      }

      const success = await serverSettingsService.saveSettings(
        organizationId,
        effectiveTeamId,  // Use the team ID for the key
        huntId,
        settings,
        sessionId
      )

      if (!success) {
        console.error('[AppStore] Failed to save settings to server')
        set({ error: 'Failed to save settings' })
      }
    } catch (error) {
      console.error('[AppStore] Error saving settings:', error)
      set({ error: error instanceof Error ? error.message : 'Save failed' })
    }
  }
}))
