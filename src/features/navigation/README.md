# Navigation Feature

## Purpose

Bottom navigation bar with tab-based routing system. Manages active tab state and renders corresponding view components. Uses Zustand for navigation state management.

## Key Entry Points

### BottomNavigation.tsx
- **Purpose**: Bottom tab bar with navigation buttons
- **Used By**: `App.jsx` (rendered at app root)
- **Key Features**:
  - Tab buttons with icons
  - Active tab highlighting
  - Tab switching logic
  - Responsive layout

### TabContainer.tsx
- **Purpose**: Content container that renders active view based on selected tab
- **Used By**: `App.jsx` (renders view content)
- **Key Features**:
  - Conditional view rendering
  - View component lazy loading
  - Transition animations

### navigationStore.ts
- **Purpose**: Zustand store for navigation state
- **State**: `activeTab` (string)
- **Actions**: `setActiveTab(tab: string)`
- **Key Features**:
  - Centralized navigation state
  - No persistence (resets on refresh)

## Data Flow

### Tab Navigation Flow

```
User clicks tab button
    ↓
BottomNavigation.handleTabClick(tabName)
    ↓
navigationStore.setActiveTab(tabName)
    ↓
navigationStore state updates
    ↓
TabContainer re-renders
    ↓
TabContainer conditionally renders view based on activeTab
    ↓
View component (e.g., ActiveView) mounts and fetches data
```

## State Management

### navigationStore (Zustand)
- **activeTab**: Current tab name ('active', 'leaderboard', 'history', 'updates')
- **Default**: 'active'
- **Persistence**: None (ephemeral, resets on page load)

### No React Router
- **Rationale**: Single-page app with tab-based navigation (no URL routing needed)
- **Trade-off**: No deep linking or browser history (acceptable for PWA use case)

## Tab Configuration

### Available Tabs

| Tab Name | Icon | View Component | Purpose |
|----------|------|----------------|---------|
| `active` | 🎯 | `ActiveView` | Main hunt interface |
| `leaderboard` | 🏆 | `LeaderboardView` | Team rankings |
| `history` | 📜 | `HistoryView` | Completed stops |
| `updates` | 🔔 | `UpdatesView` | Activity feed |

### Adding a New Tab

1. Add tab button to `BottomNavigation.tsx`:
   ```tsx
   <button onClick={() => setActiveTab('my-tab')}>
     My Tab
   </button>
   ```
2. Add view rendering to `TabContainer.tsx`:
   ```tsx
   {activeTab === 'my-tab' && <MyView />}
   ```
3. Create view component in `/src/features/views/MyView.tsx`
4. Update this README with new tab documentation

## Related Files

- **Views**: `/src/features/views/ActiveView.tsx`, `/src/features/views/LeaderboardView.tsx`, etc.
- **Stores**: `/src/store/navigationStore.ts`
- **App**: `/src/App.jsx` (renders navigation components)

## Testing

### Manual Testing Checklist
- [ ] All tabs are clickable
- [ ] Active tab is highlighted
- [ ] View content changes on tab switch
- [ ] Navigation persists during view interactions
- [ ] Bottom bar is always visible (sticky)

## Extension Points

### Adding URL Routing (React Router)

If deep linking is needed in the future:

1. Install `react-router-dom`
2. Replace `navigationStore` with `useNavigate()` and `useLocation()`
3. Update `BottomNavigation.tsx` to use `<Link>` components
4. Update `TabContainer.tsx` to use `<Routes>` and `<Route>`
5. Add route configuration in `App.jsx`

### Adding Tab Badges (Notification Counts)

1. Add badge state to `navigationStore`:
   ```typescript
   interface NavigationState {
     activeTab: string
     badges: Record<string, number> // { updates: 5, leaderboard: 0 }
   }
   ```
2. Update `BottomNavigation.tsx` to render badge:
   ```tsx
   {badges.updates > 0 && <span className="badge">{badges.updates}</span>}
   ```
3. Update badge counts from API responses

## Notes

- **No URL routing**: Navigation is state-based, not URL-based
- **No browser history**: Back button does not navigate tabs
- **Sticky positioning**: Bottom bar is always visible (CSS `position: sticky`)
- **Mobile-first**: Designed for touch targets (min 44x44px)
- **Accessibility**: Use semantic HTML (`<nav>`, `<button>`) and ARIA labels
