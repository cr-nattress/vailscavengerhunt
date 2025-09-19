# Phase 33: Simplify ActiveView Component

## Problem
ActiveView.tsx is 376 lines with mixed responsibilities:
- Business logic
- State management
- Server communication
- UI rendering

## Goal
Reduce ActiveView to <150 lines by extracting logic to stores and hooks.

## Refactoring Steps

### 1. Extract Progress Management
Move to `useProgressStore` (Phase 30)
- Lines saved: ~50

### 2. Extract Photo Upload
Move to `usePhotoUpload` hook or store (Phase 31)
- Lines saved: ~100

### 3. Extract UI State
Move to `useUIStore` (Phase 32)
- Lines saved: ~30

### 4. Extract Collage Logic
Move to separate hook/service
- Lines saved: ~30

### 5. Simplify Component Structure
```tsx
export default function ActiveView() {
  // Use stores
  const { stops } = useHuntStore()
  const { progress, updateProgress } = useProgressStore()
  const { uploadPhoto } = usePhotoUpload()

  // Simple effects
  useEffect(() => {
    loadInitialData()
  }, [])

  // Clean render
  return (
    <div className="container">
      <ProgressBar progress={progress} />
      <StopsList stops={stops} />
      <CompletionSection />
    </div>
  )
}
```

## Target Structure
```
ActiveView.tsx (~150 lines)
├── Store connections (20 lines)
├── Effects (30 lines)
├── Event handlers (20 lines)
└── Render (80 lines)
```

## Success Criteria
- [ ] ActiveView < 150 lines
- [ ] All logic in appropriate stores
- [ ] No business logic in component
- [ ] Clean, readable structure
- [ ] All functionality preserved

## Order of Execution
1. First complete Phase 30 (Progress Store)
2. Then Phase 31 (Photo Upload)
3. Then Phase 32 (UI Store)
4. Finally this phase to clean up