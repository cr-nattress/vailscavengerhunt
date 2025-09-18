import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export type TabId = 'active' | 'history' | 'rankings' | 'updates'

interface NavigationState {
  activeTab: TabId
  setActiveTab: (tab: TabId) => void
  scrollPositions: Record<TabId, number>
  saveScrollPosition: (tab: TabId, position: number) => void
  getScrollPosition: (tab: TabId) => number
}

export const useNavigationStore = create<NavigationState>()(
  devtools(
    (set, get) => ({
      activeTab: 'active',
      scrollPositions: {
        active: 0,
        history: 0,
        rankings: 0,
        updates: 0,
      },

      setActiveTab: (tab) => {
        set({ activeTab: tab })
      },

      saveScrollPosition: (tab, position) => {
        set((state) => ({
          scrollPositions: {
            ...state.scrollPositions,
            [tab]: position,
          },
        }))
      },

      getScrollPosition: (tab) => {
        return get().scrollPositions[tab] || 0
      },
    }),
    {
      name: 'navigation-store',
    }
  )
)