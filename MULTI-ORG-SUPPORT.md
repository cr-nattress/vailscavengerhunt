# Multi-Organization Support Update

## Overview

Updated the application to support multiple organizations and hunts. When a user enters a team code from a different organization, the app automatically detects and uses the correct organization and hunt configuration.

## Changes Made

### 1. Backend Updates

#### `netlify/functions/team-verify.js`
- **Modified:** Team verification endpoint now returns organization and hunt data
- **Added:** Queries to fetch organization and hunt information from Supabase
- **Response includes:**
  - `organizationId`: The organization ID from the team code
  - `huntId`: The hunt ID from the team code
  - `organization`: Full organization object (id, name)
  - `hunt`: Full hunt object (id, name, dates, active status)

### 2. Frontend Updates

#### `src/types/schemas.ts`
- **Modified:** `TeamLockSchema` to include organization and hunt context
- **Added fields:**
  - `organizationId`: Optional organization ID
  - `huntId`: Optional hunt ID

#### `src/features/teamLock/SplashGate.tsx`
- **Modified:** Login flow to dynamically determine organization and hunt
- **Changed:** Removed hardcoded `'bhhs'` and `'fall-2025'` values
- **Updated:** Now calls `team-verify` endpoint first to get org/hunt info
- **Updated:** Stores org/hunt IDs in the team lock for persistence
- **Updated:** Generic branding (removed BHHS-specific logo)

#### `src/features/teamLock/TeamLockWrapper.tsx`
- **Modified:** Initialization to use dynamic organization and hunt data
- **Changed:** Removed hardcoded org/hunt references
- **Updated:** Retrieves org/hunt from stored team lock on page refresh
- **Updated:** Uses org/hunt from login response for new logins

### 3. Database Setup

#### `scripts/sql/second-org-scavenger-hunt.sql`
- **Created:** Complete SQL script for second organization
- **Organization:** Mountain Adventures Co. (`mountain-adventures`)
- **Hunt:** Winter Adventure Hunt 2025 (`winter-2025`)
- **Teams:**
  - Summit Seekers (code: `SUMMIT2025`)
  - Powder Pioneers (code: `POWDER2025`)
- **Stops:** 10 unique winter-themed locations

## How It Works

### Login Flow

1. **User enters team code** in SplashGate
2. **First API call:** `team-verify` endpoint
   - Validates the team code
   - Returns `organizationId` and `huntId` from the team's data
   - Returns full organization and hunt objects
3. **Second API call:** `login-initialize` endpoint
   - Uses the org/hunt IDs from step 2
   - Fetches complete initialization data (settings, progress, sponsors)
4. **Store in localStorage:** Team lock with org/hunt context
5. **Update app store:** Organization and hunt IDs set globally

### Page Refresh Flow

1. **Check localStorage** for existing team lock
2. **Extract org/hunt IDs** from stored lock
3. **Call `login-initialize`** with stored org/hunt IDs
4. **Restore app state** with correct organization context

## Testing

### Test with BHHS (existing org)
```
Team Code: BERRY01, POPPY01, TEACUP01, etc.
Organization: bhhs
Hunt: fall-2025
```

### Test with Mountain Adventures (new org)
```
Team Code: SUMMIT2025, POWDER2025
Organization: mountain-adventures
Hunt: winter-2025
```

## Migration Notes

- **Backward compatible:** Existing locks without org/hunt will fall back to `'bhhs'` and `'fall-2025'`
- **Schema optional:** org/hunt fields in TeamLock are optional for gradual migration
- **No data loss:** Existing teams continue working without changes

## Benefits

1. **Multi-tenancy:** Support multiple organizations in single deployment
2. **Flexible:** Easy to add new organizations and hunts
3. **Isolated:** Each organization has its own teams, stops, and data
4. **Scalable:** No code changes needed to add organizations
5. **User-friendly:** Users just enter their team code - everything else is automatic

## Future Enhancements

- [ ] Organization-specific branding and theming
- [ ] Organization logo support in SplashGate
- [ ] Custom colors per organization
- [ ] Organization-specific sponsor layouts
- [ ] Multi-hunt support per organization (already supported, just needs UI)
