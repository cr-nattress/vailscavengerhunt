# Refactor Report — src/features/views/ActiveView.tsx

## Metrics

- **LOC:** 321
- **Exported Components:** 1
- **Functions:** 8 (max complexity: 8)
- **JSX Depth:** 7
- **Hooks per main component:** 12
- **Props on main component:** 0

## Scoring

- **Effort:** 7/10
- **Impact:** 9/10
- **Risk:** 6/10
- **Total Score:** 22 (Effort + Impact + Risk)

## Key Findings

### Issue 1 — File Exceeds 200 LOC Threshold (321 lines)

**Evidence:** Entire file spans lines 1-321
**Why it's a problem:**
- Large file makes it difficult to understand component responsibilities
- Violates Single Responsibility Principle
- Harder to test in isolation
- More prone to merge conflicts
- Cognitive load too high for maintainers

### Issue 2 — Too Many Hooks (12 hooks)

**Evidence:** Lines 18-74
```tsx
const { locationName, teamName, teamId, ... } = useAppStore()
const [stops, setStops] = useState<any[]>([])
const { progress, setProgress, seedProgress, ... } = useProgress(stops)
const [fullSizeImageUrl, setFullSizeImageUrl] = useState(null)
const { expandedStops, transitioningStops, ... } = useUIStore()
const { collageUrl } = useCollage({ stops, progress, teamName })
const { data: activeData, ... } = useActiveData(...)
const queryClient = useQueryClient()
const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({})
const [savingStops, setSavingStops] = useState<Set<string>>(new Set())
const { uploadPhoto, uploadingStops } = usePhotoUpload({...})
// Multiple useEffect hooks
```

**Why it's a problem:**
- Too much state management in a single component
- Difficult to track state dependencies
- Hard to debug state-related issues
- Component re-renders frequently due to many state changes

### Issue 3 — Mixed Concerns (Data + UI + Business Logic)

**Evidence:** Lines 120-160 (data fetching), lines 166-178 (business logic), lines 189-318 (rendering)

**Why it's a problem:**
- Data fetching logic mixed with UI rendering
- Business logic (photo upload handlers) embedded in view component
- Violates separation of concerns
- Makes component difficult to test
- Can't reuse logic in other components

### Issue 4 — Deeply Nested JSX (7 levels)

**Evidence:** Lines 196-265 (nested div > div > div > div > div > div > img)

**Why it's a problem:**
- Reduces readability
- Makes it harder to find bugs in markup
- Indicates opportunities for component extraction
- Makes styling more complex

### Issue 5 — Complex useEffect Dependencies

**Evidence:** Lines 120-160

```tsx
useEffect(() => {
  if (activeData?.locations?.locations) {
    // Complex shuffle and selection logic
    const allLocations = [...activeData.locations.locations]
    // Fisher-Yates shuffle
    for (let i = allLocations.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allLocations[i], allLocations[j]] = [allLocations[j], allLocations[i]]
    }
    const stopCount = locationName === 'BHHS' ? allLocations.length : Math.min(5, allLocations.length)
    const selectedStops = allLocations.slice(0, stopCount)
    setStops(selectedStops)
  }
}, [activeData?.locations, locationName])
```

**Why it's a problem:**
- Complex shuffle algorithm embedded in effect
- Business logic (stop selection) in UI component
- Hard to test shuffle logic
- Effect dependencies could cause unnecessary re-runs

### Issue 6 — Multiple State Updates in Callbacks

**Evidence:** Lines 85-118 (onSuccess callback)

**Why it's a problem:**
- Multiple state updates can cause multiple re-renders
- Logic is spread across callback and effect
- Hard to track side effects
- Difficult to debug asynchronous flow

### Issue 7 — Tightly Coupled to Multiple Stores

**Evidence:** Lines 32-53 (useAppStore, useUIStore)

**Why it's a problem:**
- Component knows too much about global state structure
- Hard to test without mocking multiple stores
- Changes to store structure require changes here
- Violates dependency inversion principle

### Issue 8 — Inline Modal JSX (50+ lines)

**Evidence:** Lines 267-315 (Tips modal)

**Why it's a problem:**
- Modal markup embedded in main component
- Could be extracted to separate component
- Makes main component harder to read
- Modal logic (showTips state) managed here

### Issue 9 — Magic Numbers and Hardcoded Values

**Evidence:**
- Line 134: `Math.min(5, allLocations.length)` - hardcoded 5
- Line 109: `setTimeout(..., 600)` - hardcoded 600ms

**Why it's a problem:**
- Unclear business rules (why 5 stops?)
- Hard to maintain if values need to change
- Should be configuration or constants

### Issue 10 — Missing Error Handling for Photo Upload

**Evidence:** Lines 166-178 (handlePhotoUpload)

**Why it's a problem:**
- No try/catch around upload logic
- User won't see helpful error messages
- Errors could cause component to be in inconsistent state

## Refactor Suggestions (Prioritized)

### 1. Extract Container/Presentational Split

**Action:** Split into `ActiveViewContainer` (logic) + `ActiveViewUI` (presentation)

**Pattern:** Container/Presentational Pattern

**Effort/Impact/Risk:** 6/9/4

**Guidance:**
```tsx
// ActiveViewContainer.tsx
export function ActiveViewContainer() {
  const viewModel = useActiveViewModel()
  return <ActiveViewUI {...viewModel} />
}

// ActiveViewUI.tsx
export function ActiveViewUI({
  stops,
  progress,
  handlePhotoUpload,
  sponsors,
  // ... other props
}) {
  return (
    <div className="max-w-screen-sm mx-auto px-4 py-3">
      {sponsors && <SponsorCard {...sponsors} />}
      <ProgressCard progress={progress} stops={stops} />
      <StopsList stops={stops} onPhotoUpload={handlePhotoUpload} />
    </div>
  )
}
```

**Benefits:**
- Separates data fetching from rendering
- Makes UI component easily testable with mock data
- Reusable UI in storybook/demos
- Easier to optimize rendering

### 2. Create useActiveViewModel Custom Hook

**Action:** Extract all state management and business logic to custom hook

**Pattern:** Custom Hook

**Effort/Impact/Risk:** 5/8/3

**Guidance:**
```tsx
// hooks/useActiveViewModel.ts
export function useActiveViewModel() {
  const { organizationId, teamId, huntId, teamName, locationName } = useAppStore()
  const { data: activeData, refetch } = useActiveData(organizationId, teamId, huntId)

  const stops = useStopSelection(activeData, locationName)
  const { progress, setProgress, seedProgress, completeCount, percent } = useProgress(stops)
  const { collageUrl } = useCollage({ stops, progress, teamName })
  const photoUpload = usePhotoUploadHandler({ stops, refetch, setProgress })

  return {
    stops,
    progress,
    completeCount,
    percent,
    sponsors: activeData?.sponsors,
    collageUrl,
    handlePhotoUpload: photoUpload.handleUpload,
    // ... other view model data
  }
}
```

**Benefits:**
- All logic in one place, easy to test
- Can mock hook for UI tests
- Reusable in other views
- Clearer dependency graph

### 3. Extract Stop Selection Logic

**Action:** Create `useStopSelection` hook with shuffle algorithm

**Pattern:** Custom Hook

**Effort/Impact/Risk:** 2/4/1

**Guidance:**
```tsx
// hooks/useStopSelection.ts
function fisherYatesShuffle<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export function useStopSelection(
  activeData: ActiveData | undefined,
  locationName: string,
  config = { defaultCount: 5 }
) {
  return useMemo(() => {
    if (!activeData?.locations?.locations) return []

    const shuffled = fisherYatesShuffle(activeData.locations.locations)
    const count = locationName === 'BHHS'
      ? shuffled.length
      : Math.min(config.defaultCount, shuffled.length)

    return shuffled.slice(0, count)
  }, [activeData?.locations, locationName, config.defaultCount])
}
```

**Benefits:**
- Shuffle algorithm is testable
- Logic is reusable
- Magic number (5) now configurable
- useMemo prevents unnecessary recalculations

### 4. Extract Tips Modal to Separate Component

**Action:** Create `TipsModal` component

**Pattern:** Component Composition

**Effort/Impact/Risk:** 2/3/1

**Guidance:**
```tsx
// components/TipsModal.tsx
interface TipsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function TipsModal({ isOpen, onClose }: TipsModalProps) {
  if (!isOpen) return null

  return (
    <div className='fixed inset-0 z-30'>
      <div className='absolute inset-0 bg-black/40 backdrop-blur-sm' onClick={onClose} />
      <div className='absolute inset-x-0 bottom-0 rounded-t-3xl p-5 shadow-2xl'>
        {/* Modal content */}
      </div>
    </div>
  )
}

// Usage in ActiveView:
<TipsModal isOpen={showTips} onClose={() => setShowTips(false)} />
```

**Benefits:**
- Cleaner main component
- Modal is reusable
- Easier to test modal behavior
- Can add animations/transitions in one place

### 5. Extract Progress Card to Component

**Action:** Create `ProgressCard` component

**Pattern:** Component Extraction

**Effort/Impact/Risk:** 2/4/1

**Guidance:**
```tsx
// components/ProgressCard.tsx
interface ProgressCardProps {
  teamName: string | null
  huntId: string | null
  percent: number
  completeCount: number
  totalStops: number
  stops: any[]
  progress: any
}

export function ProgressCard({ teamName, huntId, percent, completeCount, totalStops, stops, progress }: ProgressCardProps) {
  return (
    <div className="border rounded-lg shadow-sm px-4 py-3">
      <div className='flex items-center justify-between text-sm'>
        {teamName && <span className='text-blue-600 font-medium uppercase'>{teamName}</span>}
        {huntId && <span className='text-gray-700 uppercase'>{huntId}</span>}
      </div>
      {percent === 100 ? (
        <div className='mt-1'>
          <p className='text-lg font-semibold'>🎉 Congratulations! You completed the scavenger hunt.</p>
        </div>
      ) : (
        <div className='mt-1'>
          <ProgressGauge
            percent={percent}
            completeCount={completeCount}
            totalStops={totalStops}
            stops={stops}
            progress={progress}
          />
        </div>
      )}
    </div>
  )
}
```

**Benefits:**
- Reduces ActiveView LOC by ~40 lines
- Progress card logic in one place
- Easier to style/theme consistently
- Can add props for customization

### 6. Simplify Photo Upload Handler

**Action:** Move complex logic to custom hook

**Pattern:** Custom Hook

**Effort/Impact/Risk:** 3/5/3

**Guidance:**
```tsx
// hooks/usePhotoUploadHandler.ts
export function usePhotoUploadHandler({
  stops,
  refetchData,
  uploadPhoto,
  setPreviewUrls
}: PhotoUploadHandlerOptions) {

  const handleUpload = useCallback(async (stopId: string, fileOrDataUrl: File | string) => {
    // Set preview
    const previewUrl = fileOrDataUrl instanceof File
      ? URL.createObjectURL(fileOrDataUrl)
      : fileOrDataUrl

    setPreviewUrls(prev => ({ ...prev, [stopId]: previewUrl }))

    // Find stop details
    const stop = stops.find(s => s.id === stopId)
    if (!stop) {
      throw new Error(`Stop ${stopId} not found`)
    }

    // Upload with error handling
    try {
      await uploadPhoto(stopId, fileOrDataUrl, stop.title)
    } catch (error) {
      // Clean up preview on error
      setPreviewUrls(prev => {
        const { [stopId]: _omit, ...rest } = prev
        return rest
      })
      throw error // Re-throw for upstream handling
    }
  }, [stops, uploadPhoto, setPreviewUrls])

  return { handleUpload }
}
```

**Benefits:**
- Error handling in one place
- Testable upload logic
- Preview management encapsulated
- Can add retry logic easily

## Quick Wins

1. **Extract constants** — Move magic numbers to top of file as const (5 stops, 600ms timeout)
2. **Add error boundaries** — Wrap main content in <ErrorBoundary> for photo upload failures
3. **Add loading states** — Show skeleton while activeData is loading
4. **useMemo for expensive calculations** — Wrap stop shuffling in useMemo
5. **Add PropTypes or strict TypeScript** — Replace `any[]` with proper types

## Test Considerations

### Unit Tests (New Hooks)
- `useActiveViewModel()` — Mock all dependencies, test state management
- `useStopSelection()` — Test shuffle randomness, stop count logic
- `usePhotoUploadHandler()` — Test preview management, error handling

### Integration Tests
- Full photo upload flow (select file → preview → upload → mark complete)
- Progress updates correctly after photo upload
- Data refetching works after upload
- Modal open/close behavior

### Visual Regression Tests
- Snapshot test of ProgressCard
- Snapshot test of TipsModal
- Sponsor card rendering (with/without sponsors)

### End-to-End Tests
- User can complete a stop by uploading a photo
- Progress bar updates correctly
- Collage generates after multiple photos
- Team/hunt info displays correctly

## Before/After Sketch

### Before
```tsx
// 321 lines, 12 hooks, mixed concerns
export default function ActiveView() {
  // 50+ lines of state management
  // 40+ lines of useEffect logic
  // 30+ lines of handlers
  // 200+ lines of JSX
}
```

### After
```tsx
// ActiveViewContainer.tsx (60 lines)
export function ActiveViewContainer() {
  const viewModel = useActiveViewModel()
  return <ActiveViewUI {...viewModel} />
}

// ActiveViewUI.tsx (80 lines, pure presentation)
export function ActiveViewUI({ stops, progress, ... }) {
  return (
    <UploadProvider>
      {sponsors && <SponsorCard {...sponsors} />}
      <ProgressCard {...progressProps} />
      <AlbumViewer collageUrl={collageUrl} />
      <StopsList {...stopsListProps} />
      <TipsModal isOpen={showTips} onClose={closeTips} />
    </UploadProvider>
  )
}

// hooks/useActiveViewModel.ts (100 lines, all logic)
export function useActiveViewModel() {
  // Clean, testable hook with all business logic
}

// hooks/useStopSelection.ts (30 lines)
// hooks/usePhotoUploadHandler.ts (40 lines)
// components/ProgressCard.tsx (50 lines)
// components/TipsModal.tsx (60 lines)
```

**Total LOC:** ~420 lines (vs 321), but split across 7 files
**Complexity:** Reduced from 8 to 3-4 per file
**Testability:** ✅ High (each piece testable independently)
**Maintainability:** ✅ Excellent (clear responsibilities)

## Related Files

### Imports (Dependencies)
- `useAppStore` — Will need to mock for tests
- `useUIStore` — Will need to mock for tests
- `useProgress` — Already a custom hook, good pattern
- `usePhotoUpload` — Hook for upload logic
- `useCollage` — Hook for collage generation
- `useActiveData` — Data fetching hook

### Consumers (Used By)
- `TabContainer.tsx` — Lazy loads this view
- Bottom navigation switches to this tab

### Similar Files (Share Patterns)
- `HistoryView.tsx` — Similar data fetching pattern
- `RankingsView.tsx` — Similar view structure
- Other view components — Could benefit from same container/presentational split

## Decision Log Notes

### Why Container/Presentational Split?
- **Trade-off:** Adds one more file, but dramatically improves testability
- **Assumption:** Most changes will be to UI, not logic — split makes UI changes safer
- **Alternative considered:** Keep as single file with better organization — rejected because still too complex

### Why Custom Hooks for Business Logic?
- **Trade-off:** More files, but each is focused and testable
- **Assumption:** Business logic will be reused in other views
- **Alternative considered:** Keep in component with better comments — rejected because hard to test

### Why Extract Modal?
- **Trade-off:** Small modal might not need extraction — but improves readability
- **Assumption:** Modal will grow (add animations, variants)
- **Alternative considered:** Keep inline with conditional render — rejected because reduces main component clarity

### Configuration vs Hardcoding
- Default stop count (5) should be in env var or config file
- Transition timing (600ms) should be in theme constants
- These are business rules that may change

### Type Safety
- Replace `any[]` with proper types for stops and progress
- Consider creating a `StopViewModel` type for better DX
- TypeScript will catch bugs during refactor

---

**Recommendation:** Start with refactor #3 (useStopSelection) as a proof of concept, then do #1 (container split) as main refactor. This is a high-impact refactor that will set the pattern for other views.
