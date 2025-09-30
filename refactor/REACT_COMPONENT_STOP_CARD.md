# Refactor Report — src/features/app/StopCard.tsx

## Metrics

- **LOC:** 268
- **Exported Components:** 1 (default export)
- **Functions:** 2 (max complexity: 7)
- **JSX Depth:** 8 (exceeds threshold of 6)
- **Hooks per main component:** 0 (all props)
- **Props on main component:** 10 (exceeds threshold of 8)

## Scoring

- **Effort:** 6/10
- **Impact:** 8/10
- **Risk:** 5/10
- **Total Score:** 19 (Effort + Impact + Risk)

## Key Findings

### Issue 1 — File Exceeds 200 LOC Threshold (268 lines)

**Evidence:** Lines 1-268
**Why it's a problem:**
- Single component file is too large
- Mixes multiple concerns (header, content, actions, hints)
- Hard to maintain and understand
- Opportunity for component composition

### Issue 2 — JSX Depth Exceeds Threshold (8 levels)

**Evidence:** Lines 55-266
```tsx
<div> {/* Level 1 */}
  <div> {/* Level 2 */}
    <div> {/* Level 3 */}
      <div> {/* Level 4 */}
        <div> {/* Level 5 */}
          <div> {/* Level 6 */}
            <div> {/* Level 7 */}
              <span> {/* Level 8 */}
```

**Why it's a problem:**
- Deeply nested JSX is hard to read
- Indicates opportunity for component extraction
- Makes styling more complex
- Harder to debug layout issues

### Issue 3 — Too Many Props (10 props)

**Evidence:** Lines 16-28
```tsx
interface StopCardProps {
  stop: any                              // 1
  progress: any                          // 2
  onUpload: (stopId: string, ...) => ... // 3
  onToggleExpanded: (stopId: string) => void // 4
  expanded: boolean                      // 5
  uploadingStops: Set<string>           // 6
  transitioningStops: Set<string>       // 7
  revealNextHint: () => void            // 8
  index: number                          // 9
  previewImage?: string                  // 10
  isSaving?: boolean                     // 11 (optional, but still counts)
}
```

**Why it's a problem:**
- High prop count indicates component doing too much
- Hard to remember what props are needed
- Props drilling (some props only needed by child sections)
- Makes component less reusable
- Violates interface segregation principle

### Issue 4 — Complex Conditional Rendering

**Evidence:** Lines 92, 101-128, 131-193, 198-264

Multiple levels of conditional rendering:
- Line 92: `{!state.photo ? 'blur-sm' : ''}`
- Lines 101-128: Hint button conditionals
- Lines 131-193: Content display conditionals
- Lines 198-264: Detailed content conditionals

**Why it's a problem:**
- Hard to predict what UI will be shown
- Logic spread across component
- Makes testing difficult (many branches)
- Harder to maintain

### Issue 5 — Inline Style Objects

**Evidence:** Multiple lines
```tsx
style={{ backgroundColor: 'var(--color-accent)' }} // Line 62
style={{ color: 'var(--color-text-primary)' }}    // Line 93
style={{ backgroundColor: 'var(--color-surface)' }} // Line 109
// ... many more
```

**Why it's a problem:**
- Runtime style calculation overhead
- Harder to maintain consistent styling
- Can't leverage CSS class optimizations
- Theme values duplicated across files

### Issue 6 — Complex Hint Rendering Logic

**Evidence:** Lines 157-190
```tsx
{!state.photo && (
  <div className='mt-1 space-y-2'>
    {stop.hints && stop.hints.slice(0, state.revealedHints).map((hint: string, hintIndex: number) => {
      const hintConfig = {
        0: { bg: '...', border: '...', text: '...', icon: '🎯' },
        1: { bg: '...', border: '...', text: '...', icon: '🔍' },
        2: { bg: '...', border: '...', text: '...', icon: '💡' }
      }[hintIndex] || { ... }

      return (
        <div key={hintIndex} /* ... 20 lines ... */>
          {/* Complex hint UI */}
        </div>
      )
    })}
  </div>
)}
```

**Why it's a problem:**
- Inline configuration object makes code hard to read
- Hint UI should be extracted to component
- Map with complex render function should be simplified
- Configuration should be external constant

### Issue 7 — Multiple Responsibilities in One Component

**Evidence:** Component handles:
1. **Display state** (completed vs active, expanded vs collapsed)
2. **Photo upload** (file input, preview, uploading state)
3. **Hint system** (reveal, display, styling)
4. **Animation** (transitions, hover states)
5. **Clue/Fun fact display** (conditional content)

**Why it's a problem:**
- Violates Single Responsibility Principle
- Hard to test each concern independently
- Changes to one feature risk breaking others
- Can't reuse parts in other contexts

### Issue 8 — Type Safety Issues

**Evidence:** Lines 17-18
```tsx
stop: any
progress: any
```

**Why it's a problem:**
- No type safety for stop/progress objects
- Easy to introduce bugs with wrong property access
- IDE autocomplete doesn't work
- Runtime errors instead of compile-time checks

## Refactor Suggestions (Prioritized)

### 1. Split into Smaller Components

**Action:** Extract StopCardHeader, StopCardContent, StopCardActions

**Pattern:** Component Composition

**Effort/Impact/Risk:** 6/8/4

**Guidance:**
```tsx
// StopCard.tsx (main component, 60 lines)
export default function StopCard(props: StopCardProps) {
  const { stop, progress, expanded, transitioningStops } = props
  const state = progress[stop.id] || defaultState
  const isTransitioning = transitioningStops.has(stop.id)

  return (
    <div className={getCardClassName(state, isTransitioning)} style={getCardStyle(state, isTransitioning)}>
      <StopCardHeader
        stop={stop}
        state={state}
        expanded={expanded}
        onToggle={props.onToggleExpanded}
        onRevealHint={props.revealNextHint}
      />

      {(!state.done || expanded) && (
        <StopCardContent
          stop={stop}
          state={state}
          previewImage={props.previewImage}
          isUploading={props.uploadingStops.has(stop.id)}
          isSaving={props.isSaving}
          onUpload={props.onUpload}
        />
      )}
    </div>
  )
}

// StopCardHeader.tsx (80 lines)
export function StopCardHeader({ stop, state, expanded, onToggle, onRevealHint }: StopCardHeaderProps) {
  return (
    <div className='flex items-start justify-between gap-3'>
      <div className='flex-1'>
        <StopTitle title={stop.title} isBlurred={!state.photo} isCompleted={state.done} />
        {(!state.done || expanded) && <StopClue clue={stop.clue} showClue={!state.photo} />}
        {!state.photo && <HintsList hints={stop.hints} revealedCount={state.revealedHints} />}
      </div>
      {renderActions(state, expanded, onToggle, onRevealHint)}
    </div>
  )
}

// StopCardContent.tsx (80 lines)
export function StopCardContent({ stop, state, previewImage, isUploading, isSaving, onUpload }: ContentProps) {
  return (
    <>
      <PhotoPreview
        photoUrl={state.photo}
        previewUrl={previewImage}
        placeholder={PLACEHOLDER}
      />
      {!state.photo && (
        <PhotoUploadButton
          stopId={stop.id}
          isUploading={isUploading}
          isSaving={isSaving}
          onUpload={onUpload}
        />
      )}
      {state.done && <FunFact fact={stop.funFact} />}
    </>
  )
}

// HintsList.tsx (60 lines)
// PhotoUploadButton.tsx (40 lines)
// PhotoPreview.tsx (30 lines)
```

**Benefits:**
- StopCard reduced from 268 to ~60 lines
- Each component has single responsibility
- Easier to test components independently
- Can reuse components (PhotoUploadButton, HintsList)
- Clearer prop flow (no props drilling)

### 2. Extract Hint Configuration

**Action:** Move hint config to constants file

**Pattern:** Configuration Extraction

**Effort/Impact/Risk:** 1/3/1

**Guidance:**
```tsx
// constants/hintStyles.ts
export const HINT_STYLES = [
  {
    bg: 'var(--color-surface)',
    border: 'var(--color-accent)',
    text: 'var(--color-accent)',
    icon: '🎯'
  },
  {
    bg: 'var(--color-surface)',
    border: 'var(--color-accent)',
    text: 'var(--color-accent)',
    icon: '🔍'
  },
  {
    bg: 'var(--color-surface)',
    border: 'var(--color-accent)',
    text: 'var(--color-accent)',
    icon: '💡'
  }
] as const

export const DEFAULT_HINT_STYLE = {
  bg: '#f8fafc',
  border: '#64748b',
  text: '#334155',
  icon: '❓'
} as const

// Usage in HintsList component:
const hintStyle = HINT_STYLES[hintIndex] || DEFAULT_HINT_STYLE
```

**Benefits:**
- Cleaner component code
- Easy to add/modify hint styles
- Can be shared across components
- TypeScript ensures correct structure

### 3. Replace Inline Styles with CSS Classes

**Action:** Create CSS module or Tailwind classes for dynamic styling

**Pattern:** CSS-in-JS to CSS Classes

**Effort/Impact/Risk:** 3/5/2

**Guidance:**
```tsx
// StopCard.module.css
.card {
  @apply mt-3 shadow-sm border rounded-lg p-4 transition-all duration-1000 ease-in-out;
}

.card[data-done="true"] {
  @apply cursor-pointer hover:shadow-md transition-shadow;
}

.card[data-transitioning="true"] {
  @apply transform scale-105 -translate-y-1;
  background-color: var(--color-accent);
  border-color: var(--color-success);
  border-width: 2px;
}

// Usage:
<div
  className={styles.card}
  data-done={state.done}
  data-transitioning={isTransitioning}
  onClick={handleClick}
>
```

**Benefits:**
- No runtime style calculation
- Better performance (CSS parser vs JS)
- Easier to maintain consistent styles
- Can leverage CSS features (media queries, pseudo-selectors)

### 4. Add Proper TypeScript Types

**Action:** Define interfaces for Stop and ProgressState

**Pattern:** Type Safety

**Effort/Impact/Risk:** 2/6/1

**Guidance:**
```tsx
// types/hunt.ts
export interface Stop {
  id: string
  title: string
  clue?: string
  hints?: string[]
  funFact?: string
  originalNumber?: number
}

export interface ProgressState {
  done: boolean
  notes: string
  photo: string | null
  revealedHints: number
  completedAt?: string
}

export type ProgressMap = Record<string, ProgressState>

// StopCard.tsx
interface StopCardProps {
  stop: Stop                         // ✅ Typed
  progress: ProgressMap              // ✅ Typed
  onUpload: (stopId: string, file: File) => Promise<void>
  onToggleExpanded: (stopId: string) => void
  expanded: boolean
  uploadingStops: Set<string>
  transitioningStops: Set<string>
  revealNextHint: () => void
  index: number
  previewImage?: string
  isSaving?: boolean
}
```

**Benefits:**
- Autocomplete for stop/progress properties
- Compile-time error checking
- Self-documenting code
- Refactoring safety (find all references)

### 5. Extract Photo Upload UI to Separate Component

**Action:** Create PhotoUploadSection component

**Pattern:** Component Extraction

**Effort/Impact/Risk:** 3/5/2

**Guidance:**
```tsx
// components/PhotoUploadSection.tsx
interface PhotoUploadSectionProps {
  stopId: string
  photoUrl: string | null
  previewUrl: string | null
  isUploading: boolean
  isSaving: boolean
  onUpload: (stopId: string, file: File) => Promise<void>
}

export function PhotoUploadSection({
  stopId,
  photoUrl,
  previewUrl,
  isUploading,
  isSaving,
  onUpload
}: PhotoUploadSectionProps) {
  const displayImage = previewUrl || photoUrl || PLACEHOLDER

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      await onUpload(stopId, file)
    }
  }

  return (
    <div className='mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3'>
      <PhotoPreview
        imageUrl={displayImage}
        isComplete={!!photoUrl || !!previewUrl}
      />

      {!photoUrl && (
        <PhotoUploadButton
          stopId={stopId}
          isUploading={isUploading}
          isSaving={isSaving}
          onFileSelect={handleFileSelect}
        />
      )}
    </div>
  )
}
```

**Benefits:**
- Reduces StopCard by 50+ lines
- Photo upload logic in one place
- Can reuse in other contexts
- Easier to test upload flow

### 6. Reduce Prop Count via Composition

**Action:** Group related props into objects

**Pattern:** Props Grouping

**Effort/Impact/Risk:** 4/6/3

**Guidance:**
```tsx
// Before: 10+ individual props
<StopCard
  stop={stop}
  progress={progress}
  onUpload={onUpload}
  onToggleExpanded={onToggleExpanded}
  expanded={expanded}
  uploadingStops={uploadingStops}
  transitioningStops={transitioningStops}
  revealNextHint={revealNextHint}
  index={index}
  previewImage={previewImage}
  isSaving={isSaving}
/>

// After: Grouped props
<StopCard
  stop={stop}
  state={{
    progress: progress[stop.id],
    expanded,
    isUploading: uploadingStops.has(stop.id),
    isTransitioning: transitioningStops.has(stop.id),
    isSaving,
    previewImage
  }}
  actions={{
    onUpload,
    onToggleExpanded,
    onRevealHint: revealNextHint
  }}
  index={index}
/>
```

**Benefits:**
- Clearer prop categories
- Easier to see what component needs
- Can add new state props without changing signature
- Better encapsulation

## Quick Wins

1. **Extract PLACEHOLDER constant** — Move to constants file
2. **Remove any types** — Add proper Stop/Progress types
3. **Extract hint config** — Move to constants
4. **Add data-* attributes** — Replace inline style objects
5. **Split long component** — At minimum, extract HintsList and PhotoUploadButton

## Test Considerations

### Unit Tests (New Components)
- `StopCardHeader` — Test title, clue, hints rendering
- `StopCardContent` — Test photo preview, upload button
- `HintsList` — Test hint rendering, styles
- `PhotoUploadButton` — Test file selection, loading states

### Integration Tests
- Full card rendering (completed vs active)
- Photo upload flow (select → preview → upload → complete)
- Hint reveal flow
- Expand/collapse behavior

### Visual Regression Tests
- Card states (active, uploading, transitioning, completed)
- Hint display (0, 1, 2, 3 hints)
- Photo preview vs placeholder

## Before/After Sketch

### Before
```tsx
// StopCard.tsx (268 lines, JSX depth 8, 10+ props)
export default function StopCard({ stop, progress, onUpload, ... }: StopCardProps) {
  // 20 lines of state/calculations
  // 15 lines of handlers
  // 230+ lines of deeply nested JSX
}
```

### After
```tsx
// StopCard.tsx (60 lines, JSX depth 3, 4 props)
export default function StopCard({ stop, state, actions, index }: StopCardProps) {
  const cardState = useStopCardState(stop, state)

  return (
    <Card className={cardState.className} style={cardState.style}>
      <StopCardHeader {...cardState.header} {...actions} />
      {cardState.showContent && (
        <StopCardContent {...cardState.content} {...actions} />
      )}
    </Card>
  )
}

// StopCardHeader.tsx (80 lines)
// StopCardContent.tsx (80 lines)
// HintsList.tsx (50 lines)
// PhotoUploadSection.tsx (60 lines)
// PhotoUploadButton.tsx (40 lines)
// PhotoPreview.tsx (30 lines)
// hooks/useStopCardState.ts (40 lines)
// constants/hintStyles.ts (20 lines)
```

**Total LOC:** ~420 lines (vs 268), but split across 8 files
**JSX Depth:** Reduced from 8 to 3-4
**Props per component:** Reduced from 10+ to 3-5
**Testability:** ✅ Excellent
**Reusability:** ✅ High

## Related Files

### Dependencies
- `ProgressRing` — Used for stop number display
- Photo upload system — Managed via props

### Consumers
- `StopsList.tsx` — Maps over stops and renders cards

### Similar Components
- Could create variants: `StopCardCompact`, `StopCardExpanded`

## Decision Log Notes

### Component Split Strategy
- **Decision:** Split into header/content vs all small components
- **Reasoning:** Header/content gives good balance of granularity and simplicity
- **Alternative:** Extract everything (10+ components) — rejected as too granular for this context

### Props Grouping
- **Decision:** Group into state/actions objects
- **Reasoning:** Clearer categorization, easier to add props
- **Alternative:** Keep flat — rejected due to high prop count

### CSS Strategy
- **Decision:** Replace inline styles with CSS modules or data attributes
- **Reasoning:** Better performance, easier theming
- **Alternative:** Keep inline styles — rejected due to runtime overhead

### Hint Configuration
- **Decision:** Extract to constants file
- **Reasoning:** Easy to modify, can be shared
- **Alternative:** Keep inline — rejected for maintainability

---

**Recommendation:** Start with #2 (extract hint config) and #4 (add types) as quick wins, then do #1 (component split) as main refactor. This component is used frequently, so improvements have high impact across the app.
