# Zustand Store - Separation of Concerns Analysis

## Current State Assessment

### 🔴 Critical Issues Found

The application **violates separation of concerns** with significant business logic residing in React components instead of Zustand stores.

## Current Architecture Problems

### 1. Single Store Anti-Pattern
- **Only ONE Zustand store exists** (`appStore.ts`) handling basic app settings
- No dedicated stores for:
  - Progress management
  - Photo uploads
  - Session management
  - Hunt/stop data
  - UI state

### 2. Business Logic in Components

#### App.jsx (579 lines - MAJOR VIOLATION)
Contains extensive business logic that should be in stores:

**Photo Upload Logic (lines 148-255)**
- Complex upload workflow with multiple fallbacks
- Cloudinary integration
- Progress state updates
- Error handling and retries
- Base64 conversion fallback
- Should be in: `usePhotoStore`

**Session Management (lines 101-116)**
- Session initialization
- GUID generation
- DualWriteService calls
- Should be in: `useSessionStore`

**Settings Management (lines 84-98, 345-362)**
- Loading/saving settings
- DualWriteService integration
- Should be in: Extended `appStore` or `useSettingsStore`

**Collage Creation (lines 259-310)**
- Complex image processing
- Multiple service calls
- State management
- Should be in: `useCollageStore`

**URL Parameter Parsing (lines 55-75)**
- Complex URL logic
- State updates based on routes
- Should be in: `useRouterStore`

### 3. Hook with Business Logic

#### useProgress Hook
- **Direct localStorage access** (violates server-only goal)
- Quota exceeded handling
- Progress calculations
- Should be: Zustand store with proper abstraction

### 4. Prop Drilling Issues
Components pass numerous callbacks and state pieces:
```jsx
<StopsList
  stops={stops}
  progress={progress}
  transitioningStops={transitioningStops}
  completedSectionExpanded={completedSectionExpanded}
  onToggleCompletedSection={() => setCompletedSectionExpanded(!completedSectionExpanded)}
  expandedStops={expandedStops}
  onToggleExpanded={toggleExpanded}
  uploadingStops={uploadingStops}
  onPhotoUpload={handlePhotoUpload}
  setProgress={setProgress}
/>
```

## Recommended Zustand Store Architecture

### 1. Core Stores Needed

#### `useProgressStore`
```typescript
interface ProgressStore {
  // State
  progress: Record<string, StopProgress>
  completeCount: number
  percent: number

  // Actions
  updateStopProgress: (stopId: string, data: Partial<StopProgress>) => Promise<void>
  markStopComplete: (stopId: string) => Promise<void>
  revealNextHint: (stopId: string) => void
  resetProgress: () => Promise<void>
  loadProgress: (orgId: string, teamId: string, huntId: string) => Promise<void>

  // Computed
  getStopProgress: (stopId: string) => StopProgress | undefined
  isStopComplete: (stopId: string) => boolean
}
```

#### `usePhotoStore`
```typescript
interface PhotoStore {
  // State
  uploadingStops: Set<string>
  uploadProgress: Record<string, number>

  // Actions
  uploadPhoto: (stopId: string, file: File, metadata: PhotoMetadata) => Promise<string>
  retryUpload: (stopId: string) => Promise<void>
  getExistingPhoto: (stopId: string) => Promise<string | null>

  // Internal handlers
  handleCloudinaryUpload: (file: File, metadata: PhotoMetadata) => Promise<string>
  handleFallbackUpload: (file: File) => Promise<string>
}
```

#### `useSessionStore`
```typescript
interface SessionStore {
  // State
  sessionId: string
  sessionData: SessionData
  isInitialized: boolean

  // Actions
  initializeSession: (orgId: string, teamId: string, huntId: string) => Promise<void>
  updateSessionActivity: () => Promise<void>
  endSession: () => Promise<void>
}
```

#### `useHuntStore`
```typescript
interface HuntStore {
  // State
  stops: Stop[]
  currentStopIndex: number
  huntMetadata: HuntMetadata

  // Actions
  loadHunt: (orgId: string, teamId: string, huntId: string) => Promise<void>
  generateRandomStops: (location: string) => void
  getNextStop: () => Stop | null
  getPreviousStop: () => Stop | null
}
```

#### `useUIStore`
```typescript
interface UIStore {
  // State
  isMenuOpen: boolean
  isEditMode: boolean
  showTips: boolean
  expandedStops: Set<string>
  transitioningStops: Set<string>
  completedSectionExpanded: boolean

  // Actions
  toggleMenu: () => void
  toggleEditMode: () => void
  toggleTips: () => void
  toggleStopExpanded: (stopId: string) => void
  addTransitioningStop: (stopId: string) => void
  removeTransitioningStop: (stopId: string) => void
}
```

#### `useCollageStore`
```typescript
interface CollageStore {
  // State
  collageUrl: string | null
  storybookUrl: string | null
  isGenerating: boolean

  // Actions
  generateCollage: (stops: Stop[], progress: Progress) => Promise<void>
  previewStorybook: () => Promise<void>
  clearCollage: () => void
}
```

### 2. Service Layer Integration

Each store should integrate with services:
- `ProgressStore` → `ProgressService` (server API)
- `PhotoStore` → `PhotoUploadService`
- `SessionStore` → `SessionService` (new)
- `CollageStore` → `CollageService`

### 3. Component Simplification

#### Simplified App.jsx
```jsx
function App() {
  const { locationName, teamName } = useAppStore()
  const { stops } = useHuntStore()
  const { progress, resetProgress } = useProgressStore()
  const { uploadPhoto } = usePhotoStore()
  const { isMenuOpen, toggleMenu } = useUIStore()

  return (
    <div>
      <Header />
      <StopsList />
      {/* Components just render, stores handle logic */}
    </div>
  )
}
```

## Migration Plan

### Phase 1: Create New Stores (Week 1)
1. Create `useProgressStore` to replace `useProgress` hook
2. Create `usePhotoStore` for upload logic
3. Create `useUIStore` for UI state
4. Create `useSessionStore` for session management

### Phase 2: Migrate Business Logic (Week 2)
1. Move photo upload logic from App.jsx to `usePhotoStore`
2. Move progress logic to `useProgressStore`
3. Move session logic to `useSessionStore`
4. Move UI state to `useUIStore`

### Phase 3: Simplify Components (Week 3)
1. Refactor App.jsx to use stores
2. Remove prop drilling
3. Simplify StopsList component
4. Update other components

### Phase 4: Remove localStorage (Week 4)
1. Update stores to use server APIs
2. Remove all localStorage access
3. Add proper loading states
4. Implement error boundaries

## Benefits of Refactoring

### 1. **Separation of Concerns**
- Components only handle presentation
- Business logic centralized in stores
- Services handle external integrations

### 2. **Testability**
- Stores can be tested in isolation
- Mock services easily
- Components become simple to test

### 3. **Maintainability**
- Clear responsibilities
- Easier to debug
- Simpler onboarding for new developers

### 4. **Performance**
- Reduced re-renders
- Better state management
- Optimized subscriptions

### 5. **Type Safety**
- Strong typing in stores
- Clear interfaces
- Better IDE support

## Implementation Priority

### High Priority (Do First)
1. **Create `useProgressStore`** - Critical for removing localStorage
2. **Create `usePhotoStore`** - Complex logic needs isolation
3. **Migrate App.jsx photo upload** - Biggest violation

### Medium Priority
4. **Create `useUIStore`** - Improve component simplicity
5. **Create `useSessionStore`** - Clean session management
6. **Simplify App.jsx** - Remove remaining logic

### Low Priority
7. **Create `useCollageStore`** - Nice to have
8. **Create `useHuntStore`** - Can wait
9. **Add comprehensive tests** - After refactoring

## Code Smells to Fix

1. **579-line App.jsx** - Should be < 150 lines
2. **Direct localStorage access** - Should use stores
3. **Complex event handlers in components** - Move to stores
4. **Prop drilling** - Use store subscriptions
5. **Mixed concerns** - Separate UI from business logic
6. **No error boundaries** - Add proper error handling
7. **Inline async operations** - Move to store actions

## Conclusion

The current architecture has **significant separation of concerns violations**. The main App component contains extensive business logic that belongs in Zustand stores. Additionally, only one store exists when at least 5-6 stores are needed for proper separation.

**Immediate Action Required:** Create dedicated Zustand stores for progress, photos, sessions, and UI state, then migrate all business logic out of React components.

## Next Steps
1. Create `useProgressStore` to replace the `useProgress` hook
2. Create `usePhotoStore` and migrate photo upload logic
3. Refactor App.jsx to use stores instead of local state/logic
4. Continue with remaining stores per priority list