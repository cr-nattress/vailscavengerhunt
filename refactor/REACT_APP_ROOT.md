# Refactor Report — src/App.jsx

## Metrics

- **LOC:** 253
- **Exported Components:** 1 (default export)
- **Functions:** 3 (max complexity: 8)
- **JSX Depth:** 6
- **Hooks per main component:** 7
- **Props on main component:** 0

## Scoring

- **Effort:** 5/10
- **Impact:** 8/10
- **Risk:** 5/10
- **Total Score:** 18 (Effort + Impact + Risk)

## Key Findings

### Issue 1 — File Exceeds 200 LOC Threshold (253 lines)

**Evidence:** Lines 1-253
**Why it's a problem:**
- App-level component should be thin orchestration layer
- Too much initialization logic embedded
- Makes app structure unclear
- Hard to test initialization separately

### Issue 2 — Complex Initialization useEffect (97 lines)

**Evidence:** Lines 51-152

```jsx
useEffect(() => {
  const applyFromPath = () => { /* 20 lines */ }
  const initializeApp = async () => { /* 70 lines */ }
  applyFromPath()
  // ... more logic
  initializeApp()
  return () => { /* cleanup */ }
}, []) // Empty dependency array
```

**Why it's a problem:**
- 97 lines in single effect is too complex
- Mixes URL parsing, app initialization, Sentry setup
- Hard to test individual concerns
- Effect runs once but has multiple responsibilities
- Difficult to debug if initialization fails

### Issue 3 — URL Parameter Handling Logic

**Evidence:** Lines 53-73, 81-110

```jsx
const params = getPathParams(window.location.pathname)
if (isValidParamSet(params)) {
  const { location, event, team } = normalizeParams(params)
  setLocationName(location)
  setEventName(event)
  setTeamName(team)
  setLockedByQuery(true)
}
// ... later ...
const urlParams = new URLSearchParams(window.location.search)
const hasOrgParam = urlParams.has('org')
const hasHuntParam = urlParams.has('hunt')
// ... complex conditional logic
```

**Why it's a problem:**
- URL parsing logic should be in utility or hook
- Complex conditional logic for query vs path params
- Makes component hard to test with different URL scenarios
- Mixing concerns (URL handling + state management)

### Issue 4 — Sentry Integration in App Component

**Evidence:** Lines 124-141

```jsx
try {
  console.log('🧪 Sending Sentry test log...')
  Sentry.addBreadcrumb({ /* ... */ })
  Sentry.captureMessage('User triggered test log - App initialization complete', {
    level: 'info',
    tags: { log_source: 'sentry_test', component: 'app_init' },
    extra: { sessionId, orgId, huntId }
  })
  console.log('✅ Sentry test log sent successfully')
} catch (sentryError) {
  console.warn('⚠️ Sentry test log failed:', sentryError)
}
```

**Why it's a problem:**
- Test logging should not be in production app initialization
- Should be in development-only wrapper or removed
- Pollutes Sentry with test messages
- Makes initialization harder to understand

### Issue 5 — Inline Tips Modal (50+ lines)

**Evidence:** Lines 193-245

**Why it's a problem:**
- Large JSX block for modal should be extracted
- Modal is shared with ActiveView (duplication)
- Makes App component harder to read
- Modal state (showTips) managed here

### Issue 6 — Event Handler Registration Pattern

**Evidence:** Lines 75-76, 149-151

```jsx
const onPopState = () => applyFromPath()
window.addEventListener('popstate', onPopState)
// ...
return () => {
  window.removeEventListener('popstate', onPopState)
}
```

**Why it's a problem:**
- Window event listener management in component
- Should use custom hook for route listening
- Cleanup is easy to miss in refactors
- Not React-y pattern (imperative vs declarative)

## Refactor Suggestions (Prioritized)

### 1. Extract Initialization to useAppInitialization Hook

**Action:** Create custom hook for all initialization logic

**Pattern:** Custom Hook

**Effort/Impact/Risk:** 5/8/4

**Guidance:**
```jsx
// hooks/useAppInitialization.ts
export function useAppInitialization() {
  const {
    setLocationName,
    setTeamName,
    setEventName,
    setOrganizationId,
    setHuntId,
    setLockedByQuery,
    sessionId
  } = useAppStore()

  useEffect(() => {
    initializeFromURL()
    initializeAppServices()
  }, [])

  function initializeFromURL() {
    const params = parseURLParams()
    if (params.isValid) {
      applyURLParams(params)
    }
  }

  async function initializeAppServices() {
    try {
      const orgId = await determineOrganization()
      const huntId = await determineHunt()

      setOrganizationId(orgId)
      setHuntId(huntId)

      if (import.meta.env.DEV) {
        setupDevLogging(sessionId, orgId, huntId)
      }
    } catch (error) {
      console.error('❌ Failed to initialize app:', error)
    }
  }
}

// Usage in App.jsx:
export default function App() {
  useAppInitialization()
  // ... rest of component
}
```

**Benefits:**
- App.jsx reduced by ~100 lines
- Initialization logic is testable
- Can mock hook for App tests
- Clear single responsibility

### 2. Extract URL Handling to useURLParams Hook

**Action:** Create hook for URL parameter management

**Pattern:** Custom Hook

**Effort/Impact/Risk:** 3/5/2

**Guidance:**
```jsx
// hooks/useURLParams.ts
export function useURLParams() {
  const [params, setParams] = useState(null)

  useEffect(() => {
    function parseCurrentURL() {
      const pathParams = getPathParams(window.location.pathname)
      const queryParams = getQueryParams(window.location.search)

      // Merge with precedence: query > path > defaults
      const mergedParams = mergeParams(queryParams, pathParams)

      setParams(mergedParams)
    }

    parseCurrentURL()

    // Listen for URL changes
    const handlePopState = () => parseCurrentURL()
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  return params
}

// Usage:
const urlParams = useURLParams()
useEffect(() => {
  if (urlParams) {
    applyParamsToStore(urlParams)
  }
}, [urlParams])
```

**Benefits:**
- Cleaner URL parameter handling
- Reusable in other components
- Easier to test URL parsing logic
- Automatic URL change detection

### 3. Remove Sentry Test Logging from Production

**Action:** Move to dev-only file or remove entirely

**Pattern:** Environment-Specific Code

**Effort/Impact/Risk:** 1/4/1

**Guidance:**
```jsx
// Remove from App.jsx completely

// Instead, add to /src/utils/devTools.ts
export function setupDevLogging(sessionId: string, orgId: string, huntId: string) {
  if (import.meta.env.DEV) {
    console.log('🧪 Sending Sentry test log...')
    Sentry.addBreadcrumb({
      message: 'App initialized successfully',
      level: 'info',
      data: { sessionId, orgId, huntId }
    })
    console.log('✅ Sentry test log sent successfully')
  }
}

// Or use the existing SentryTestComponent for manual testing
```

**Benefits:**
- Cleaner production code
- No test messages in production Sentry
- Easier to understand app initialization
- Dev tools centralized

### 4. Extract TipsModal to Shared Component

**Action:** Create reusable TipsModal component (shared with ActiveView)

**Pattern:** Component Extraction

**Effort/Impact/Risk:** 2/4/1

**Guidance:**
```jsx
// components/TipsModal.tsx (see ActiveView.tsx.md for full implementation)

// App.jsx usage:
import { TipsModal } from './components/TipsModal'

export default function App() {
  const [showTips, setShowTips] = useState(false)

  return (
    <>
      <Header onToggleTips={() => setShowTips(!showTips)} />
      <main>{/* ... */}</main>
      <TipsModal isOpen={showTips} onClose={() => setShowTips(false)} />
      <BottomNavigation />
    </>
  )
}
```

**Benefits:**
- Removes 50+ lines from App.jsx
- Shared between App and ActiveView (DRY)
- Modal content in one place (easier to update)
- Can add modal variants (success, error, etc.)

### 5. Simplify Component Structure

**Action:** Remove unnecessary nesting and wrapper divs

**Pattern:** Component Simplification

**Effort/Impact/Risk:** 2/3/1

**Guidance:**
```jsx
// Before: Multiple wrapper divs
<TeamLockWrapper>
  <div className='min-h-screen' style={{...}}>
    <Header {...headerProps} />
    <main className='max-w-screen-sm mx-auto'>
      <TabContainer />
      {showTips && <TipsModal />}
    </main>
    {activeTab !== 'health' && <BottomNavigation />}
  </div>
</TeamLockWrapper>

// After: Cleaner structure
<TeamLockWrapper>
  <AppLayout>
    <Header {...headerProps} />
    <TabContainer />
    <TipsModal isOpen={showTips} onClose={closeTips} />
    {showBottomNav && <BottomNavigation />}
  </AppLayout>
</TeamLockWrapper>

// components/AppLayout.tsx
export function AppLayout({ children }) {
  return (
    <div className='min-h-screen' style={{ backgroundColor: 'var(--color-background)' }}>
      <main className='max-w-screen-sm mx-auto'>
        {children}
      </main>
    </div>
  )
}
```

**Benefits:**
- Clearer component hierarchy
- Easier to add global layout changes
- Can add responsive breakpoints in one place
- App.jsx focuses on orchestration

## Quick Wins

1. **Remove console.logs** — Replace with proper logging service
2. **Extract reset handler** — Move to Header component or hook
3. **Add error boundary** — Wrap main content for better error handling
4. **Type conversion** — Convert from .jsx to .tsx
5. **Extract constants** — Move hardcoded values to config file

## Test Considerations

### Unit Tests
- `useAppInitialization()` — Test URL parsing, org/hunt determination
- `useURLParams()` — Test path params, query params, merging logic
- TipsModal — Test open/close behavior

### Integration Tests
- App initializes correctly with different URL formats
- Popstate events trigger URL re-parsing
- Team lock wrapper shows/hides content correctly
- Bottom navigation shows/hides based on active tab

### E2E Tests
- User can navigate via URL directly
- Team verification flow works
- Tips modal opens and closes
- All tabs are accessible

## Before/After Sketch

### Before
```jsx
// 253 lines, complex initialization
export default function App() {
  // 15 state variables
  // 97-line useEffect
  // 20-line event handler setup
  // 50-line inline modal
  // 70+ lines of JSX
}
```

### After
```jsx
// App.jsx (80 lines, clean orchestration)
export default function App() {
  useAppInitialization() // All init logic
  const { showTips, closeTips, openTips } = useTipsModal()

  return (
    <TeamLockWrapper>
      <AppLayout>
        <Header onToggleTips={openTips} />
        <TabContainer />
        <TipsModal isOpen={showTips} onClose={closeTips} />
        <ConditionalBottomNav />
      </AppLayout>
    </TeamLockWrapper>
  )
}

// hooks/useAppInitialization.ts (60 lines)
// hooks/useURLParams.ts (40 lines)
// hooks/useTipsModal.ts (20 lines)
// components/AppLayout.tsx (30 lines)
// components/TipsModal.tsx (60 lines)
// components/ConditionalBottomNav.tsx (20 lines)
```

**Total LOC:** ~310 lines (vs 253), but split across 7 files
**Complexity:** Reduced from 8 to 2-3 per file
**Testability:** ✅ High
**Clarity:** ✅ Excellent

## Related Files

### Dependencies
- `TeamLockWrapper` — Authentication gate
- `Header` — App header with menu
- `TabContainer` — Main content area
- `BottomNavigation` — Bottom nav bar
- `useAppStore` — Global state management

### Consumers
- `main.jsx` — Mounts App component
- `index.html` — Root element

### Similar Patterns
- `ActiveView.tsx` — Also has complex initialization
- Other views — Could use similar URL param handling

## Decision Log Notes

### Why Extract Initialization?
- **Trade-off:** More files vs clearer responsibilities
- **Decision:** Extract because initialization is complex and needs testing
- **Alternative:** Keep in App with better organization — rejected due to testing difficulty

### Sentry Test Logging
- **Decision:** Remove from production initialization
- **Reasoning:** Test logging pollutes production monitoring
- **Alternative:** Keep but guard with env check — rejected to keep init clean

### TipsModal Duplication
- **Decision:** Extract to shared component
- **Reasoning:** Same modal in App and ActiveView (DRY violation)
- **Alternative:** Keep separate for flexibility — rejected, modal is identical

### URL Parameter Precedence
- Query params > Path params > Defaults
- This allows override via query string for testing
- Document this behavior in hook

---

**Recommendation:** This is a critical refactor. Start with Sentry logging removal (quick win), then extract useAppInitialization hook (main refactor). This will set the pattern for other app-level concerns.
