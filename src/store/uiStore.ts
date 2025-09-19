import { create } from 'zustand'

interface UIStore {
  // State
  expandedStops: Set<string>
  transitioningStops: Set<string>
  completedSectionExpanded: boolean
  showTips: boolean

  // Actions
  toggleStopExpanded: (stopId: string) => void
  setTransitioning: (stopId: string, isTransitioning: boolean) => void
  toggleCompletedSection: () => void
  setShowTips: (show: boolean) => void

  // Bulk operations
  collapseAllStops: () => void
  expandAllStops: (stopIds: string[]) => void
  resetUIState: () => void
}

export const useUIStore = create<UIStore>((set, get) => ({
  // Initial state
  expandedStops: new Set(),
  transitioningStops: new Set(),
  completedSectionExpanded: false,
  showTips: false,

  // Toggle individual stop expansion
  toggleStopExpanded: (stopId) => {
    set((state) => {
      const expanded = new Set(state.expandedStops)
      if (expanded.has(stopId)) {
        expanded.delete(stopId)
      } else {
        expanded.add(stopId)
      }
      return { expandedStops: expanded }
    })
  },

  // Set transitioning state for animation
  setTransitioning: (stopId, isTransitioning) => {
    set((state) => {
      const transitioning = new Set(state.transitioningStops)
      if (isTransitioning) {
        transitioning.add(stopId)
      } else {
        transitioning.delete(stopId)
      }
      return { transitioningStops: transitioning }
    })
  },

  // Toggle completed section expansion
  toggleCompletedSection: () => {
    set((state) => ({ completedSectionExpanded: !state.completedSectionExpanded }))
  },

  // Set tips visibility
  setShowTips: (show) => {
    set({ showTips: show })
  },

  // Collapse all stops
  collapseAllStops: () => {
    set({ expandedStops: new Set() })
  },

  // Expand all stops
  expandAllStops: (stopIds) => {
    set({ expandedStops: new Set(stopIds) })
  },

  // Reset all UI state
  resetUIState: () => {
    set({
      expandedStops: new Set(),
      transitioningStops: new Set(),
      completedSectionExpanded: false,
      showTips: false
    })
  }
}))