import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppState {
  locationName: string
  teamName: string
  sessionId: string
  eventName: string
  lockedByQuery: boolean
}

interface AppActions {
  setLocationName: (locationName: string) => void
  setTeamName: (teamName: string) => void
  setSessionId: (sessionId: string) => void
  setEventName: (eventName: string) => void
  setLockedByQuery: (locked: boolean) => void
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

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      // State
      locationName: 'BHHS',
      teamName: '',
      sessionId: generateSessionId(),
      eventName: '',
      lockedByQuery: false,
      
      // Actions
      setLocationName: (locationName: string) => set({ locationName }),
      setTeamName: (teamName: string) => set({ teamName }),
      setSessionId: (sessionId: string) => set({ sessionId }),
      setEventName: (eventName: string) => set({ eventName }),
      setLockedByQuery: (locked: boolean) => set({ lockedByQuery: locked }),
    }),
    {
      name: 'app-store', // localStorage key
      // Only initialize sessionId once on first load
      partialize: (state) => ({ 
        locationName: state.locationName,
        teamName: state.teamName,
        sessionId: state.sessionId,
        eventName: state.eventName
      })
    }
  )
)