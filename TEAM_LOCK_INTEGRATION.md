# Team Lock Integration Guide

This guide shows how to integrate the Team Code Splash feature into the existing application.

## Integration Steps

### 1. Wrap Main App Content

Update `src/App.jsx` to wrap the main content with `TeamLockWrapper`:

```jsx
// Add import at the top
import { TeamLockWrapper } from './features/teamLock/TeamLockWrapper'

// Wrap the main app content
export default function App() {
  // ... existing code ...

  return (
    <TeamLockWrapper>
      <div className='min-h-screen' style={{ backgroundColor: 'var(--color-background)' }}>
        {/* Progress Bar */}
        <div
          className='fixed top-0 left-0 h-1 transition-all duration-500 z-30'
          style={{
            width: `${percent}%`,
            backgroundColor: 'var(--color-blush-pink)'
          }}
        />

        {/* Header */}
        <Header
          isMenuOpen={isMenuOpen}
          onToggleMenu={() => setIsMenuOpen(!isMenuOpen)}
          completeCount={completeCount}
          totalStops={stopsWithProgress.length}
          percent={percent}
          onReset={resetAllProgress}
          onToggleTips={() => setShowTips(!showTips)}
        />

        {/* Rest of existing app content... */}
      </div>
    </TeamLockWrapper>
  )
}
```

### 2. Optional: Environment Variable Control

Add environment variable to control team lock feature:

```bash
# .env.local
VITE_ENABLE_TEAM_LOCKS=true
```

Then modify the `useTeamLock` hook:

```typescript
// In src/features/teamLock/useTeamLock.ts
const isTeamLockEnabled = import.meta.env.VITE_ENABLE_TEAM_LOCKS === 'true'

// Only show splash if feature is enabled
setState({
  showSplash: isAvailable && isTeamLockEnabled,
  // ... rest of state
})
```

### 3. Update Write Operations (Future)

When ready to protect write operations, update services to use `AuthenticatedFetch`:

```typescript
// Example: Update ProgressService to use authenticated requests
import { AuthenticatedFetch } from './AuthenticatedFetch'

// Replace fetch calls with AuthenticatedFetch
const response = await AuthenticatedFetch.postAndHandle(url, data)
```

## Current Behavior

- **Without team verification available**: App works normally (no splash screen)
- **With team verification available but no lock**: Shows splash screen for team code entry
- **With valid team lock**: Shows team chip in header, bypasses splash screen
- **With expired/invalid lock**: Redirects to splash screen automatically

## Testing Team Codes

Use the team setup endpoint to create test team codes:

```bash
curl -X POST http://localhost:8888/.netlify/functions/team-setup
```

Test codes created:
- `ALPHA01` - Team Alpha
- `BETA02` - Team Beta
- `GAMMA03` - Team Gamma

## Files Added

### Foundation Infrastructure
- `src/types/schemas.ts` - Added team lock schemas and types
- `netlify/functions/_lib/lockUtils.js` - JWT token utilities
- `netlify/functions/_lib/teamStorage.js` - Team storage operations
- `netlify/functions/_lib/teamErrors.js` - Error handling utilities
- `netlify/functions/_lib/teamLogger.js` - Secure logging utilities

### Team Verification Service
- `netlify/functions/team-verify.js` - Team verification endpoint
- `netlify/functions/team-current.js` - Team context endpoint
- `netlify/functions/team-setup.js` - Test data setup (dev only)

### Client Lock Management
- `src/services/TeamLockService.ts` - Client lock management
- `src/services/TeamService.ts` - Team operations
- `src/services/TeamErrorHandler.ts` - Client error handling
- `src/services/AuthenticatedFetch.ts` - Authenticated requests
- `src/hooks/useTeamContext.ts` - Team context hook

### UI Components
- `src/features/teamLock/SplashGate.tsx` - Team code entry screen
- `src/features/teamLock/useTeamLock.ts` - Team lock state management
- `src/features/teamLock/TeamLockWrapper.tsx` - Integration wrapper
- `src/components/TeamChip.tsx` - Team indicator component
- `src/features/app/Header.tsx` - Updated to include TeamChip

## Environment Variables

Add to your environment configuration:

```bash
# Team lock configuration
TEAM_LOCK_JWT_SECRET=your-jwt-secret-here
TEAM_LOCK_TTL_SECONDS=86400
DEVICE_HINT_SEED=your-device-seed-here

# Storage configuration (reuses existing)
NETLIFY_BLOBS_STORE_NAME=vail-hunt-state
TEAM_TABLE_NAME=team-mappings

# Feature flags
VITE_ENABLE_TEAM_LOCKS=true
```

## Deployment Notes

1. Set environment variables in Netlify dashboard
2. Deploy Netlify Functions will be available at `/.netlify/functions/`
3. Test team verification in production environment
4. Monitor team lock usage and errors through Netlify Function logs