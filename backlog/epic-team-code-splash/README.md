# Epic: Team Code Splash & 24-Hour Team Lock

## Overview
Implementation of a splash screen for team code entry and 24-hour team lock mechanism to ensure single-team participation per device while maintaining existing UI/UX patterns.

## Epic Goals
- Enable team-based participation through secure team codes
- Implement 24-hour device locks to prevent multi-team exploitation
- Maintain zero disruption to existing UI/UX and functionality
- Follow established architectural patterns from features/demo-01 branch

## Key Requirements
- Team code validation server-side only (Netlify Functions)
- Client stores 24h TTL lock in localStorage
- Team data in Blob Storage (JSON), team mappings in Table Storage
- Anti multi-team writes enforcement via lockToken
- Progressive enhancement - works offline with valid lock

## Storage Architecture

### Table Storage (Team Code Mapping)
```
PartitionKey: "team"
RowKey: teamCode (opaque unique)
Columns: teamId, teamName, isActive, createdAt, eventId
```

### Blob Storage (Team Data)
```
Path: teams/team_{teamId}.json
Shape: {
  teamId, name, score, huntProgress, updatedAt
}
```

### localStorage (Client Lock)
```
Key: hunt.team.lock.v1
Shape: {
  teamId, issuedAt, expiresAt, teamCodeHash, lockToken
}
```

## User Stories

### [001] Foundation Infrastructure
**As a developer**, I want to establish the foundational infrastructure for team lock storage and validation **so that** subsequent features can build incrementally without breaking existing functionality.

### [002] Team Verification Service
**As a system**, I want to verify team codes and issue lock tokens **so that** valid team members can be authenticated while preventing unauthorized access.

### [003] Client Lock Management
**As a client application**, I want to manage team lock state in localStorage **so that** returning users can skip re-authentication within the 24-hour window.

### [004] Splash Gate UI Component
**As a user**, I want a clean splash screen for team code entry **so that** I can join my assigned team with minimal friction.

### [005] Write Request Authentication
**As a system**, I want to validate team locks on all write operations **so that** only authorized team members can modify team data.

### [006] Lock Expiration Handling
**As a user**, I want seamless handling of expired locks **so that** I'm automatically redirected to re-authenticate without losing context.

### [007] Team Indicator UI
**As a user**, I want to see which team I'm currently logged in as **so that** I have clear confirmation of my team membership.

### [008] Integration & Testing
**As a developer**, I want comprehensive testing of the team lock system **so that** we can ensure reliability and security before deployment.

## Implementation Strategy

### Phase 1: Foundation (Stories 001-002)
- Establish storage schemas and Netlify Functions
- Implement team verification with lock token generation
- Zero impact on existing UI

### Phase 2: Client Integration (Stories 003-004)
- Add localStorage lock management
- Create splash gate component with existing UI patterns
- Maintain app functionality for existing users

### Phase 3: Security Layer (Stories 005-006)
- Add write request authentication middleware
- Implement graceful lock expiration handling
- Preserve all existing write operations

### Phase 4: Polish & Testing (Stories 007-008)
- Add team indicator UI component
- Comprehensive testing suite
- Documentation and deployment

## Success Criteria
- ✅ Valid lock skips splash; expired lock redirects to splash
- ✅ Team verification enforces single-team lock per device for 24h
- ✅ All write endpoints reject missing/expired/mismatch locks
- ✅ Blob updates use ETag for conflict resolution
- ✅ Zero regression in existing functionality
- ✅ Maintains all current UI/UX patterns

## Risk Mitigation
- **UI Disruption**: Incremental implementation with feature flags
- **Data Loss**: ETag-based optimistic concurrency control
- **Performance**: Aggressive caching and request deduplication
- **Security**: Server-side validation and signed lock tokens

## Dependencies
- Existing DualWriteService patterns
- Current Zustand store architecture
- Established Netlify Functions patterns
- PhotoUploadService for header injection patterns

---
*Follows architectural patterns established in features/demo-01 branch*
*Maintains compatibility with existing ProgressService and storage patterns*