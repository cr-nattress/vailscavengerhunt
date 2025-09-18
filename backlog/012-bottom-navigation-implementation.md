# Bottom Navigation Implementation Plan

## Overview
Implement a mobile-friendly persistent bottom navigation that swaps views entirely client-side without changing the URL, using the existing React + Vite + Tailwind CSS stack.

## Current Architecture Analysis

### Technology Stack
- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS with inline styles and CSS variables
- **State Management**: Zustand (appStore)
- **Data Fetching**: React Query
- **Current Navigation**: Top header with hamburger menu

### Key Findings
1. App is a single-page React app, not Next.js
2. Uses Tailwind CSS for styling (no CSS modules or styled-components)
3. Currently has a top header component at `src/features/app/Header.tsx`
4. Main app content is in `src/App.jsx`
5. Features are organized in `src/features/` directory

## Implementation Strategy

### 1. State Management for Tab Navigation
Create a new Zustand store slice or extend existing appStore to manage:
- `activeTab: 'active' | 'history' | 'rankings' | 'updates'`
- `setActiveTab: (tab) => void`

### 2. Component Architecture

```
App.jsx
├── Header (existing)
├── MainContent
│   ├── TabContainer (new)
│   │   ├── ActiveView (refactor from current main view)
│   │   ├── HistoryView (new)
│   │   ├── RankingsView (new)
│   │   └── UpdatesView (new)
│   └── [Other existing components]
└── BottomNavigation (new)
```

### 3. File Structure

```
src/
├── features/
│   ├── navigation/
│   │   ├── BottomNavigation.tsx
│   │   ├── TabContainer.tsx
│   │   └── navigationStore.ts
│   ├── views/
│   │   ├── ActiveView.tsx (refactor from App.jsx)
│   │   ├── HistoryView.tsx
│   │   ├── RankingsView.tsx
│   │   └── UpdatesView.tsx
```

## Detailed Implementation Steps

### Phase 1: Setup Navigation State
1. Create `navigationStore.ts` using Zustand
2. Add tab state management
3. Integrate with existing app store if needed

### Phase 2: Create Bottom Navigation Component
1. Create `BottomNavigation.tsx` with:
   - Fixed position at bottom
   - Four tab buttons
   - Active state styling
   - Icon support (using SVG or existing icon approach)
   - Mobile-optimized touch targets (min 44px height)

### Phase 3: Refactor Current View
1. Extract current scavenger hunt logic into `ActiveView.tsx`
2. Create `TabContainer.tsx` to conditionally render views
3. Implement view switching logic without URL changes

### Phase 4: Create New Views
1. **HistoryView**: Display completed hunts, past photos, timestamps
2. **RankingsView**: Show leaderboard using existing API endpoints
3. **UpdatesView**: Display recent activity, notifications

### Phase 5: Styling & Polish
1. Use existing Tailwind classes
2. Match existing color scheme (CSS variables)
3. Add transitions between views
4. Ensure responsive design

## Technical Implementation Details

### BottomNavigation Component Structure
```typescript
interface TabItem {
  id: 'active' | 'history' | 'rankings' | 'updates'
  label: string
  icon: JSX.Element
}

const BottomNavigation: React.FC = () => {
  const { activeTab, setActiveTab } = useNavigationStore()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t">
      {/* Tab buttons */}
    </nav>
  )
}
```

### Tab Container Logic
```typescript
const TabContainer: React.FC = () => {
  const { activeTab } = useNavigationStore()

  // No routing, just conditional rendering
  switch(activeTab) {
    case 'active': return <ActiveView />
    case 'history': return <HistoryView />
    case 'rankings': return <RankingsView />
    case 'updates': return <UpdatesView />
  }
}
```

### State Persistence
- Keep tab state in memory only (no localStorage)
- URL remains unchanged
- Optional: Save last active tab to localStorage for return visits

## Styling Guidelines

### Bottom Navigation Styles
```css
/* Using Tailwind classes */
.bottom-nav {
  @apply fixed bottom-0 left-0 right-0 z-50;
  @apply bg-white border-t border-gray-200;
  @apply flex justify-around items-center;
  @apply h-16 px-2 safe-area-bottom; /* iOS safe area */
}

.tab-button {
  @apply flex-1 flex flex-col items-center justify-center;
  @apply py-2 px-3 text-xs;
  @apply transition-colors duration-200;
}

.tab-button.active {
  @apply text-blue-600;
}
```

### Mobile Considerations
- Min touch target: 44x44px
- Safe area padding for iOS devices
- Smooth transitions between views
- Preserve scroll position when switching tabs

## API Integration

### Existing Endpoints to Use
- **Rankings**: `/api/leaderboard/:orgId/:huntId`
- **History**: `/api/progress/:orgId/:teamId/:huntId`
- **Updates**: Create new endpoint or use existing progress data

### Data Flow
1. Each view manages its own data fetching
2. Use React Query for caching
3. Prefetch data for better UX

## Testing Strategy

1. **Unit Tests**: Navigation state management
2. **Component Tests**: Tab switching logic
3. **Integration Tests**: Data persistence across tab switches
4. **Manual Testing**:
   - Mobile devices (iOS/Android)
   - Different screen sizes
   - Performance with data

## Performance Considerations

1. **Lazy Loading**: Load view components only when needed
2. **Memoization**: Prevent unnecessary re-renders
3. **Data Caching**: Use React Query's built-in cache
4. **Animations**: Use CSS transforms for smooth transitions

## Constraints Addressed

✅ **No page reloads**: Pure client-side navigation
✅ **No URL changes**: No hash routing or History API
✅ **Re-use existing styles**: Tailwind CSS only
✅ **Minimal bundle impact**: No new dependencies
✅ **Mobile-friendly**: Touch-optimized, responsive

## Implementation Timeline

1. **Day 1**: Setup navigation state, create BottomNavigation component
2. **Day 2**: Refactor current view, implement TabContainer
3. **Day 3**: Create History and Rankings views
4. **Day 4**: Create Updates view, polish transitions
5. **Day 5**: Testing, bug fixes, performance optimization

## Success Criteria

1. Smooth tab switching without URL changes
2. < 100ms view transition time
3. Maintains scroll position per tab
4. Works on all mobile devices
5. Passes accessibility standards (WCAG 2.1 AA)

## Potential Challenges & Solutions

### Challenge 1: Scroll Position Management
**Solution**: Store scroll positions in navigation state, restore on tab switch

### Challenge 2: Data Freshness
**Solution**: Use React Query's refetch on focus/mount

### Challenge 3: iOS Safe Areas
**Solution**: Use env(safe-area-inset-bottom) CSS

### Challenge 4: Animation Performance
**Solution**: Use transform/opacity only, avoid layout shifts

## Future Enhancements

1. Tab badges for new content
2. Swipe gestures between tabs
3. Customizable tab order
4. Tab-specific deep linking (without URL change)
5. Offline support with service workers

---

## Summary

This implementation provides a clean, performant bottom navigation that:
- Maintains the single-page app architecture
- Uses existing technology stack
- Provides smooth client-side navigation
- Requires no additional dependencies
- Follows mobile best practices

The modular approach allows for incremental implementation and easy maintenance.