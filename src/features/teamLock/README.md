# Team Lock Feature

## Purpose

Team verification and authentication system that gates access to the application. Implements device locking to prevent users from joining multiple teams and manages JWT-based session tokens.

## Key Entry Points

### TeamLockWrapper.tsx
- **Purpose**: Authentication wrapper that blocks app access until team is verified
- **Used By**: `App.jsx` (wraps entire application)
- **Key Features**:
  - Renders `SplashGate` if not authenticated
  - Renders children (app content) if authenticated
  - Manages token storage and validation
  - Handles session initialization

### SplashGate.tsx
- **Purpose**: Login screen where users enter team verification codes
- **Used By**: `TeamLockWrapper.tsx`
- **Key Features**:
  - Team code input form
  - Code validation and submission
  - Error messaging
  - Loading states
  - Device fingerprinting

### useTeamLock.ts
- **Purpose**: Custom hook for team authentication logic
- **Used By**: `TeamLockWrapper.tsx`, `SplashGate.tsx`
- **Key Features**:
  - Token management (localStorage)
  - Team verification API calls
  - Session initialization
  - Lock status checking

## Data Flow

### Team Verification Flow

```
User enters team code
    ↓
SplashGate.handleSubmit()
    ↓
useTeamLock.verifyTeamCode(code)
    ↓
TeamLockService.verifyCode()
    ↓
apiClient.post('/api/team-verify', { code, deviceInfo })
    ↓
Netlify Function: team-verify.js
    ↓
Supabase: Query team_codes table
    ↓
Validate code is active and not expired
    ↓
Check device_locks table (prevent multi-team joining)
    ↓
Generate JWT token with team info
    ↓
Create session record
    ↓
Response: { success: true, teamId, teamName, token, organization, hunt }
    ↓
useTeamLock stores token in localStorage
    ↓
TeamLockWrapper detects token, renders app
    ↓
App initializes with team context
```

### Session Initialization Flow

```
TeamLockWrapper mounts with valid token
    ↓
useTeamLock.initializeSession()
    ↓
LoginService.initialize()
    ↓
apiClient.post('/api/login-initialize')
    ↓
Netlify Function: login-initialize.js
    ↓
Supabase: Fetch team, hunt, organization data
    ↓
Initialize settings and progress if not exists
    ↓
Response: { team, hunt, organization, settings, progress }
    ↓
appStore.setTeamId(), setHuntId(), setOrganizationId()
    ↓
App ready for use
```

## State Management

### localStorage
- **Key**: `teamToken`
- **Value**: JWT token string
- **Rationale**: Persist authentication across page refreshes
- **Security**: Token is short-lived, contains no sensitive data

### appStore (Zustand)
- **teamId**: UUID from verified team
- **teamName**: Display name for UI
- **organizationId**: Parent organization ID
- **huntId**: Active hunt ID
- **sessionId**: Unique session identifier (GUID)

### Component State
- **SplashGate**: `code` (input value), `isLoading`, `error`
- **TeamLockWrapper**: `isLocked` (derived from token presence)

## Security Considerations

### Device Locking
- **Purpose**: Prevent users from joining multiple teams
- **Implementation**: Device fingerprint stored in `device_locks` table
- **Fingerprint**: User agent + screen size + timestamp
- **Limitation**: Can be bypassed by changing browser/device (acceptable for use case)

### JWT Tokens
- **Contents**: `{ teamId, huntId, organizationId, exp }`
- **Expiration**: 24 hours (configurable)
- **Signature**: HMAC-SHA256 with server secret
- **Validation**: Server-side on every API request

### Team Codes
- **Format**: Alphanumeric string (e.g., `team-alpha-2025`)
- **Storage**: `team_codes` table with `is_active` flag
- **Expiration**: Optional `expires_at` timestamp
- **One-time use**: No (codes are reusable by team members)

## Related Files

- **Services**: `/src/services/TeamLockService.ts`, `/src/services/LoginService.ts`
- **API**: `/netlify/functions/team-verify.js`, `/netlify/functions/login-initialize.js`, `/netlify/functions/team-current.js`
- **Types**: `/src/types/hunt-system.ts`
- **Stores**: `/src/store/appStore.ts`
- **Utils**: `/src/utils/id.ts` (session ID generation)

## Testing

### Manual Testing Checklist
- [ ] Valid code grants access
- [ ] Invalid code shows error
- [ ] Expired code shows error
- [ ] Token persists across refresh
- [ ] Logout clears token
- [ ] Device lock prevents multi-team join

### Test Scenarios
1. **Happy Path**: Enter valid code → see app content
2. **Invalid Code**: Enter wrong code → see error message
3. **Network Error**: Simulate offline → see network error
4. **Token Expiry**: Wait 24h → forced re-login
5. **Device Lock**: Join team A, try to join team B → blocked

## Extension Points

### Adding OAuth Login

1. Add OAuth provider button to `SplashGate.tsx`
2. Create `/netlify/functions/auth-oauth.js` handler
3. Update `useTeamLock.ts` to handle OAuth flow
4. Store OAuth tokens alongside team token
5. Update `team-verify.js` to validate OAuth tokens

### Adding Multi-Factor Authentication

1. Add phone number input to `SplashGate.tsx`
2. Create `/netlify/functions/send-sms-code.js`
3. Add SMS code verification step
4. Update `team_codes` table with `requires_mfa` flag
5. Update `team-verify.js` to check MFA status

## Troubleshooting

### "Invalid team code" Error
- **Cause**: Code not in `team_codes` table or `is_active = false`
- **Fix**: Check Supabase `team_codes` table, ensure code exists and is active

### "Device already locked" Error
- **Cause**: User previously joined a different team on this device
- **Fix**: Clear `device_locks` table for this device fingerprint (admin only)

### Token Not Persisting
- **Cause**: localStorage disabled or browser in incognito mode
- **Fix**: Enable localStorage or use regular browser window

### Infinite Loading on Login
- **Cause**: `/api/login-initialize` failing or timing out
- **Fix**: Check Netlify function logs, verify Supabase connection

## Notes

- **Team codes are case-insensitive** (normalized to lowercase)
- **Device locking is best-effort** (not cryptographically secure)
- **Tokens are stored in localStorage** (not cookies, so no CSRF risk)
- **Session IDs are GUIDs** (generated client-side, not server-side)
- **No password required** (team code is the only credential)
