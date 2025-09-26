# Consolidated Login API Enhancement

## Current State Analysis

### API Calls During Initial Page Load (Pre-Login)

When a user lands on the application without a team code, the following API calls are made:

1. **public-config** - Gets public configuration (Cloudinary, Supabase, Sentry settings)
2. **team-current** (if lock token exists) - Checks if user has existing team lock
3. **team-verify** (when entering code) - Validates team code and gets team info
4. **settings-get** or **consolidated-active** - Fetches team settings after verification
5. **settings-set** - Saves initial/updated settings

### API Calls After Login (Active Tab)

Once logged in with a team code, the Active tab makes:

1. **consolidated-active** - Single call that returns:
   - Team settings
   - Progress data
   - Sponsor information
   - Public configuration
   - Current team info

## Problem Statement

The initial login flow requires multiple sequential API calls:
1. User enters team code → team-verify
2. After verification → initializeSettings → consolidated-active or settings-get
3. If new team → settings-set to create settings
4. Then → consolidated-active to get all data

This creates:
- Multiple network round trips
- Slower initial load time
- Complex state management during initialization

## Proposed Solution: Consolidated Login Endpoint

### New Endpoint: `/api/login/initialize`

A single endpoint that handles the complete initialization flow.

#### Request
```typescript
interface LoginInitializeRequest {
  // Organization and hunt context
  orgId: string;
  huntId: string;

  // Optional team verification
  teamCode?: string;  // If provided, verify and unlock team

  // Optional existing lock token
  lockToken?: string; // If provided, validate existing lock

  // Session info
  sessionId: string;
  deviceFingerprint?: string;
}
```

#### Response
```typescript
interface LoginInitializeResponse {
  // Public configuration (always returned)
  config: PublicConfig;

  // Organization metadata
  organization: {
    id: string;
    name: string;
    logoUrl?: string;
  };

  // Hunt metadata
  hunt: {
    id: string;
    name: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    isActive: boolean;
  };

  // Team verification result (if teamCode provided)
  teamVerification?: {
    success: boolean;
    teamId?: string;
    teamName?: string;
    lockToken?: string;
    error?: string;
  };

  // Existing team from lock token (if valid)
  currentTeam?: {
    teamId: string;
    teamName: string;
    lockValid: boolean;
  };

  // Full active data (if team is verified/locked)
  activeData?: {
    settings: TeamSettings;
    progress: ProgressData;
    sponsors: SponsorsResponse;
  };

  // Available features for this hunt
  features: {
    sponsorCardEnabled: boolean;
    photoUploadsEnabled: boolean;
    leaderboardEnabled: boolean;
    tipsEnabled: boolean;
  };
}
```

### Implementation Flow

1. **No Team Code/Lock Token**: Returns public config, org/hunt metadata, and features
2. **With Lock Token**: Validates lock, returns current team + full active data if valid
3. **With Team Code**: Verifies code, creates lock, initializes settings, returns full active data
4. **With Both**: Prefers team code (new verification), validates against existing lock

### Benefits

1. **Single Network Call**: One request handles entire initialization
2. **Atomic Operations**: Team verification + settings init + data fetch in one transaction
3. **Optimistic Data**: Returns all needed data upfront
4. **Progressive Enhancement**: Can show UI immediately with config while loading team data
5. **Better Error Handling**: Single point of failure vs. cascade of failures
6. **Reduced Complexity**: Simpler client-side state management

### Client-Side Usage

```typescript
// On app initialization
const initData = await LoginService.initialize({
  orgId: 'bhhs',
  huntId: 'fall-2025',
  lockToken: TeamLockService.getLockToken(),
  sessionId: generateSessionId()
});

// Handle response
if (initData.currentTeam || initData.teamVerification?.success) {
  // User is logged in - show main app
  appStore.setFromLoginData(initData);
  showMainApp();
} else {
  // Show splash/login screen
  showSplashScreen();
}

// On team code entry
const loginData = await LoginService.initialize({
  orgId: 'bhhs',
  huntId: 'fall-2025',
  teamCode: userEnteredCode,
  sessionId: appStore.sessionId
});

if (loginData.teamVerification?.success) {
  // Save lock token and proceed
  TeamLockService.setLockToken(loginData.teamVerification.lockToken);
  appStore.setFromLoginData(loginData);
  showMainApp();
}
```

### Backend Implementation

The endpoint would:
1. Fetch public config (cached)
2. Validate org/hunt IDs
3. If lock token: validate with team-locks table
4. If team code: verify against teams table
5. If team verified:
   - Create/update device lock
   - Fetch or create settings
   - Fetch progress data
   - Fetch sponsor data
6. Return consolidated response

### Migration Path

1. **Phase 1**: Create new endpoint alongside existing ones
2. **Phase 2**: Update client to use new endpoint when available
3. **Phase 3**: Fallback to old endpoints if new one fails
4. **Phase 4**: Deprecate old initialization flow

### Performance Improvements

**Current Flow** (4-5 sequential calls):
- public-config: ~100ms
- team-verify: ~200ms
- settings-get: ~150ms
- consolidated-active: ~300ms
- **Total: ~750ms**

**New Flow** (1 parallel call):
- login-initialize: ~350ms
- **Total: ~350ms**

**Improvement: ~53% faster initial load**

## Task Breakdown

1. [ ] Design and document the login-initialize endpoint API
2. [ ] Implement backend endpoint with proper error handling
3. [ ] Add caching layer for org/hunt metadata
4. [ ] Create LoginService client wrapper
5. [ ] Update TeamLockWrapper to use new service
6. [ ] Add feature flags for progressive rollout
7. [ ] Implement fallback to legacy flow
8. [ ] Add metrics/monitoring for performance comparison
9. [ ] Write tests for all scenarios
10. [ ] Update documentation

## Acceptance Criteria

- Single API call replaces 4-5 sequential calls on login
- Initial page load time reduced by >40%
- Backward compatibility maintained
- No regression in functionality
- Proper error handling for all edge cases
- Metrics show improvement in p50/p95/p99 load times