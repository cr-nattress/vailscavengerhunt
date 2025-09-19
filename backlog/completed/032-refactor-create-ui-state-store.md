# Phase 32: Create UI State Store

## Problem
UI state is scattered across components with prop drilling:
- Expanded stops tracking
- Transitioning stops
- Menu open state
- Tips visibility
- Completed section expansion

## Solution
Create a centralized UI state store.

## Implementation

```typescript
// src/store/uiStore.ts
import { create } from 'zustand'

interface UIStore {
  // State
  expandedStops: Set<string>
  transitioningStops: Set<string>
  completedSectionExpanded: boolean
  uploadingStops: Set<string>

  // Actions
  toggleStopExpanded: (stopId: string) => void
  setTransitioning: (stopId: string, isTransitioning: boolean) => void
  toggleCompletedSection: () => void
  setUploading: (stopId: string, isUploading: boolean) => void

  // Bulk operations
  collapseAllStops: () => void
  expandAllStops: (stopIds: string[]) => void
}

export const useUIStore = create<UIStore>((set, get) => ({
  expandedStops: new Set(),
  transitioningStops: new Set(),
  completedSectionExpanded: false,
  uploadingStops: new Set(),

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

  // ... other methods
}))
```

## Components to Update
1. **ActiveView.tsx** - Remove local UI state
2. **StopCard.tsx** - Use store instead of props
3. **StopsList.tsx** - Simplify prop interface

## Before (ActiveView)
```tsx
const [expandedStops, setExpandedStops] = useState(new Set())
const [transitioningStops, setTransitioningStops] = useState(new Set())
const [completedSectionExpanded, setCompletedSectionExpanded] = useState(false)

// Lots of prop drilling
<StopsList
  expandedStops={expandedStops}
  onToggleExpanded={toggleExpanded}
  transitioningStops={transitioningStops}
  completedSectionExpanded={completedSectionExpanded}
  onToggleCompletedSection={() => setCompletedSectionExpanded(!completedSectionExpanded)}
/>
```

## After
```tsx
// Clean component with no UI state management
const { stops } = useHuntStore()
const { progress } = useProgressStore()

return <StopsList stops={stops} progress={progress} />
```

## Benefits
- Eliminate prop drilling
- Centralized UI state
- Simpler components
- Easier to add new UI features

## Success Criteria
- [ ] UI store created
- [ ] ActiveView simplified
- [ ] Props removed from StopsList
- [ ] UI behavior unchanged