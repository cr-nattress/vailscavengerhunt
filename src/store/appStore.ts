import { create } from 'zustand'
import serverSettingsService from '../services/ServerSettingsService'

interface AppState {
  locationName: string
  teamName: string
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
  setSessionId: (sessionId: string) => void
  setEventName: (eventName: string) => void
  setLockedByQuery: (locked: boolean) => void
  setOrganizationId: (orgId: string) => void
  setHuntId: (huntId: string) => void
  initializeSettings: (orgId: string, teamId: string, huntId: string) => Promise<void>
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
    // Auto-save to server after change
    const store = get()
    if (store.organizationId && store.teamName && store.huntId) {
      await store.saveSettingsToServer()
    }
  },

  setTeamName: async (teamName: string) => {
    set({ teamName })
    // Auto-save to server after change
    const store = get()
    if (store.organizationId && teamName && store.huntId) {
      await store.saveSettingsToServer()
    }
  },

  setSessionId: (sessionId: string) => set({ sessionId }),

  setEventName: async (eventName: string) => {
    set({ eventName })
    // Auto-save to server after change
    const store = get()
    if (store.organizationId && store.teamName && store.huntId) {
      await store.saveSettingsToServer()
    }
  },

  setLockedByQuery: (locked: boolean) => set({ lockedByQuery: locked }),

  setOrganizationId: (orgId: string) => set({ organizationId: orgId }),

  setHuntId: (huntId: string) => set({ huntId }),

  // Initialize settings from server
  initializeSettings: async (orgId: string, teamId: string, huntId: string) => {
    set({ isLoading: true, error: null })

    try {
      const { sessionId } = get()
      const settings = await serverSettingsService.initializeSettings(
        orgId,
        teamId,
        huntId,
        sessionId
      )

      if (settings) {
        set({
          locationName: settings.locationName || 'BHHS',
          teamName: settings.teamName || teamId,
          eventName: settings.eventName || '',
          organizationId: orgId,
          huntId,
          isLoading: false
        })
      }
    } catch (error) {
      console.error('[AppStore] Failed to initialize settings:', error)
      set({
        error: error instanceof Error ? error.message : 'Failed to load settings',
        isLoading: false,
        // Use defaults on error
        organizationId: orgId,
        huntId,
        teamName: teamId
      })
    }
  },

  // Save current settings to server
  saveSettingsToServer: async () => {
    const state = get()
    const { organizationId, teamName, huntId, sessionId } = state

    if (!organizationId || !teamName || !huntId) {
      console.warn('[AppStore] Cannot save - missing org/team/hunt info')
      return
    }

    try {
      const settings = {
        locationName: state.locationName,
        teamName: state.teamName,
        sessionId: state.sessionId,
        eventName: state.eventName,
        organizationId,
        huntId
      }

      const success = await serverSettingsService.saveSettings(
        organizationId,
        teamName,
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