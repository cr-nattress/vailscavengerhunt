# Views Feature

## Purpose

Top-level view components that represent full-screen pages in the application. Each view corresponds to a tab in the bottom navigation and orchestrates data fetching, state management, and UI composition for its domain.

## Key Entry Points

### ActiveView.tsx
- **Purpose**: Main hunt interface where teams complete stops and upload photos
- **Route**: Default view (index)
- **Data Sources**: `useActiveData()` hook → `/api/consolidated/active`
- **Key Features**:
  - Stop cards with photo upload
  - Progress gauge
  - Sponsor cards
  - Album viewer (collage)
  - Settings panel

### LeaderboardView.tsx / RankingsView.tsx
- **Purpose**: Real-time team rankings based on completion percentage
- **Route**: Leaderboard tab
- **Data Sources**: `useQuery()` → `/api/consolidated/rankings`
- **Key Features**:
  - Team list with progress bars
  - Current team highlighting
  - Manual refresh button
  - Last activity timestamps

### HistoryView.tsx
- **Purpose**: Completed stops and progress history
- **Route**: History tab
- **Data Sources**: `useQuery()` → `/api/consolidated/history`
- **Key Features**:
  - Completed stops list
  - Photo gallery
  - Completion timestamps

### UpdatesView.tsx
- **Purpose**: Activity feed showing recent team actions
- **Route**: Updates tab
- **Data Sources**: `useQuery()` → `/api/consolidated/updates`
- **Key Features**:
  - Real-time activity stream
  - Team action notifications

### HealthView.tsx
- **Purpose**: System health monitoring and diagnostics
- **Route**: Admin/debug view
- **Data Sources**: `/api/health`
- **Key Features**:
  - Service status checks
  - Database connectivity
  - Cloudinary status

### DiagnosticsView.tsx
- **Purpose**: Debug panel for development and troubleshooting
- **Route**: Admin/debug view
- **Data Sources**: Local state, localStorage inspection
- **Key Features**:
  - State inspection
  - Log viewer
  - Cache invalidation tools

## Data Flow

```
View Component
    ↓
Custom Hook (e.g., useActiveData)
    ↓
Service Layer (e.g., ConsolidatedDataService)
    ↓
apiClient (HTTP wrapper)
    ↓
Netlify Function (e.g., consolidated-active.js)
    ↓
Supabase (PostgreSQL)
```

### Example: ActiveView Data Flow

1. **Component Mount**: `ActiveView` renders, calls `useActiveData(orgId, teamId, huntId)`
2. **Hook Execution**: `useActiveData` uses SWR to fetch from `/api/consolidated/active`
3. **API Request**: `apiClient.get()` sends authenticated request
4. **Server Processing**: `consolidated-active.js` function queries Supabase for:
   - Hunt stops (`hunt_locations` table)
   - Team progress (`hunt_progress` table)
   - Team settings (`settings` table)
   - Sponsor data (`sponsor_assets` table)
5. **Response**: Single JSON payload with all data
6. **Cache Update**: SWR caches response, triggers re-render
7. **UI Update**: `ActiveView` displays stops, progress, sponsors

## State Management

### Local State (useState)
- `fullSizeImageUrl`: Album viewer modal state
- Component-specific UI state

### Global State (Zustand)
- **appStore**: Team identity, hunt config (`teamId`, `huntId`, `organizationId`)
- **uiStore**: UI interactions (`expandedStops`, `transitioningStops`, `showTips`)

### Server State (SWR/TanStack Query)
- Cached API responses with automatic revalidation
- Optimistic updates for mutations

## Related Files

- **Hooks**: `/src/hooks/useActiveData.ts`, `/src/hooks/useProgress.ts`
- **Services**: `/src/services/ConsolidatedDataService.ts`
- **API**: `/netlify/functions/consolidated-active.js`, `/netlify/functions/consolidated-rankings.js`
- **Types**: `/src/types/consolidated.ts`, `/src/types/hunt-system.ts`
- **Stores**: `/src/store/appStore.ts`, `/src/store/uiStore.ts`

## Testing

- **Unit Tests**: `__tests__/ActiveView.sponsor-integration.test.tsx`
- **Test Focus**: Sponsor integration, data loading states, error handling

## Extension Points

### Adding a New View

1. Create `MyView.tsx` in this folder
2. Add data fetching hook (e.g., `useMyData()`)
3. Register in `BottomNavigation.tsx`
4. Add corresponding Netlify Function if needed
5. Document data flow in this README

### View Component Template

```typescript
/**
 * Exports: MyView component
 * Runtime: client
 * Used by: /src/features/navigation/BottomNavigation.tsx
 * @ai-purpose: Displays [purpose] with data from [API endpoint]
 * @ai-dont: Don't fetch data directly; use useMyData() hook
 * @ai-related-files: /src/hooks/useMyData.ts, /netlify/functions/my-endpoint.js
 */
import React from 'react'
import { useMyData } from '../../hooks/useMyData'

export default function MyView() {
  const { data, isLoading, error } = useMyData()
  
  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  
  return <div>{/* View content */}</div>
}
```

## Notes

- All views are **client-side only** (no SSR)
- Views should be **lazy-loaded** for optimal bundle size
- Use **consolidated endpoints** when fetching multiple resources
- Always handle **loading** and **error** states
- Views should be **responsive** (mobile-first design)
