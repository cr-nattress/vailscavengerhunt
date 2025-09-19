# Phase 30: Create Progress Store

## Problem
Progress management logic is scattered across ActiveView.tsx (376 lines) with complex state management and server communication mixed with UI logic.

## Solution
Create a dedicated Zustand store for progress management.

## Implementation

### 1. Create the Progress Store
```typescript
// src/store/progressStore.ts
import { create } from 'zustand'
import { ServerStorageService } from '../services/ServerStorageService'

interface ProgressStore {
  // State
  progress: Record<string, StopProgress>
  isLoading: boolean
  error: string | null

  // Actions
  loadProgress: (orgId: string, teamId: string, huntId: string) => Promise<void>
  updateStopProgress: (stopId: string, updates: Partial<StopProgress>) => Promise<void>
  toggleStopComplete: (stopId: string) => Promise<void>
  clearProgress: () => Promise<void>

  // Computed helpers
  getCompletedCount: () => number
  getProgressPercent: () => number
}

export const useProgressStore = create<ProgressStore>((set, get) => ({
  progress: {},
  isLoading: false,
  error: null,

  loadProgress: async (orgId, teamId, huntId) => {
    set({ isLoading: true, error: null })
    try {
      const data = await ServerStorageService.getProgress(orgId, teamId, huntId)
      set({ progress: data || {}, isLoading: false })
    } catch (error) {
      set({ error: error.message, isLoading: false })
    }
  },

  updateStopProgress: async (stopId, updates) => {
    const { progress } = get()
    const updated = {
      ...progress,
      [stopId]: { ...progress[stopId], ...updates }
    }
    set({ progress: updated })

    // Save to server
    const { orgId, teamId, huntId } = useAppStore.getState()
    await ServerStorageService.saveProgress(orgId, teamId, huntId, updated)
  },

  // ... other methods
}))
```

### 2. Update ActiveView to Use Store
```typescript
// Before: Complex local state management
const [progress, setProgress] = useState({})
const [isLoading, setIsLoading] = useState(true)

// After: Clean store usage
const { progress, loadProgress, updateStopProgress } = useProgressStore()
```

## Benefits
- Centralized progress logic
- Easier testing
- Reusable across components
- Clear separation of concerns

## Success Criteria
- [ ] Progress store created
- [ ] ActiveView uses store instead of local state
- [ ] Server sync works correctly
- [ ] No regression in functionality