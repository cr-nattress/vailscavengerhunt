# App Feature

## Purpose

Core application UI components that are shared across multiple views. These components handle the primary user interactions for the scavenger hunt experience, including stop management, settings, and progress display.

## Key Entry Points

### Header.tsx
- **Purpose**: Top navigation bar with app title and menu button
- **Used By**: All views (rendered in `App.jsx`)
- **Key Features**:
  - App branding
  - Settings panel toggle
  - Responsive layout

### StopCard.tsx
- **Purpose**: Individual stop card with photo upload, hints, and completion tracking
- **Used By**: `StopsList.tsx` → `ActiveView.tsx`
- **Props**:
  - `stop`: Stop data (id, title, clue, hints, location)
  - `progress`: Progress state for this stop
  - `onUpload`: Photo upload handler
  - `onToggleExpanded`: Expand/collapse handler
  - `expanded`: Expansion state
  - `uploadingStops`: Set of currently uploading stop IDs
  - `transitioningStops`: Set of stops in transition animation
  - `revealNextHint`: Hint reveal handler
  - `index`: Stop index for display
  - `previewImage`: Optional preview image URL
  - `isSaving`: Save in progress flag
- **Key Features**:
  - Photo upload with preview
  - Progressive hint reveal
  - Completion animation
  - Expand/collapse for completed stops

### StopsList.tsx
- **Purpose**: Renders list of stop cards with orchestrated state
- **Used By**: `ActiveView.tsx`
- **Key Features**:
  - Maps stops array to StopCard components
  - Passes shared handlers and state
  - Manages card ordering

### SettingsPanel.tsx
- **Purpose**: Slide-out panel for team settings configuration
- **Used By**: `Header.tsx` → All views
- **Key Features**:
  - Location name input
  - Event name input
  - Sponsor layout selection (1x1, 1x2, 1x3)
  - Save to server
  - Slide animation

### CompletedAccordion.tsx
- **Purpose**: Collapsible section for completed stops
- **Used By**: `ActiveView.tsx`
- **Key Features**:
  - Accordion expand/collapse
  - Completed stops list
  - Photo thumbnails

## Data Flow

### StopCard Photo Upload Flow

```
User selects photo
    ↓
StopCard.handlePhotoUpload()
    ↓
onUpload(stopId, file) [prop from parent]
    ↓
usePhotoUpload.uploadPhoto()
    ↓
PhotoUploadService.uploadPhotoOrchestrated()
    ↓
apiClient.postFormData('/api/photo-upload-complete')
    ↓
Netlify Function: photo-upload-complete.js
    ↓
Cloudinary upload + Supabase progress update (atomic)
    ↓
Response: { photoUrl, progress }
    ↓
SWR revalidates cache
    ↓
UI updates with new photo
```

### Settings Save Flow

```
User edits settings
    ↓
SettingsPanel.handleSave()
    ↓
appStore.saveSettingsToServer()
    ↓
ServerSettingsService.saveSettings()
    ↓
apiClient.post('/api/settings/:orgId/:teamId/:huntId')
    ↓
Netlify Function: settings-set-supabase.js
    ↓
Supabase: UPDATE settings table
    ↓
Response: { success: true }
    ↓
Settings panel closes
```

## State Management

### Props-Based State
- **StopCard**: Receives all state via props (no internal state for data)
- **Rationale**: Single source of truth in parent component

### Local State
- **SettingsPanel**: Form input state (controlled components)
- **Header**: Menu open/closed state

### Global State (Zustand)
- **appStore**: `locationName`, `eventName`, `teamName`, `teamId`
- **uiStore**: `expandedStops`, `transitioningStops`, `showTips`

## Related Files

- **Hooks**: `/src/hooks/usePhotoUpload.ts`, `/src/hooks/useProgress.ts`
- **Services**: `/src/services/ServerSettingsService.ts`, `/src/client/PhotoUploadService.ts`
- **Components**: `/src/components/ProgressRing.tsx`, `/src/components/ProgressGauge.tsx`
- **API**: `/netlify/functions/photo-upload-complete.js`, `/netlify/functions/settings-set-supabase.js`
- **Types**: `/src/types/hunt-system.ts`, `/src/types/config.ts`
- **Stores**: `/src/store/appStore.ts`, `/src/store/uiStore.ts`

## Testing

- **Unit Tests**: `StopCard.test.tsx`
- **Test Focus**: Photo upload, hint reveal, completion state, prop handling

## Component Patterns

### StopCard: Controlled Component Pattern

```typescript
// ✅ GOOD: All state managed by parent
<StopCard
  stop={stop}
  progress={progress[stop.id]}
  onUpload={handleUpload}
  expanded={expandedStops.has(stop.id)}
/>

// ❌ BAD: Internal state creates sync issues
<StopCard stop={stop} /> // manages own progress internally
```

### SettingsPanel: Form State Pattern

```typescript
// ✅ GOOD: Local form state, sync on save
const [localSettings, setLocalSettings] = useState(appStore.settings)
const handleSave = () => appStore.saveSettingsToServer()

// ❌ BAD: Direct store mutation
const handleChange = (e) => appStore.setLocationName(e.target.value)
```

## Extension Points

### Adding a New Stop Card Feature

1. Add prop to `StopCardProps` interface
2. Update `StopsList.tsx` to pass prop
3. Implement feature in `StopCard.tsx`
4. Add tests in `StopCard.test.tsx`

### Adding a New Settings Field

1. Add field to `SettingsPanel.tsx` form
2. Update `appStore` state and actions
3. Update `ServerSettingsService.saveSettings()`
4. Update Supabase `settings` table schema
5. Update `/netlify/functions/settings-set-supabase.js`

## Notes

- **StopCard** is the most complex component; changes require careful testing
- **Photo uploads** are atomic (upload + progress update in one request)
- **Settings** are saved to server immediately (no local persistence)
- **Animations** use CSS transitions (see `transitioningStops` in uiStore)
- **Accessibility**: Ensure keyboard navigation and ARIA labels
