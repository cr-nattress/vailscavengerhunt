# Data Hierarchy Structure for Multi-Tenant Storage

## Overview
This document describes the hierarchical data structure for storing scavenger hunt data uniquely by organization, team, and hunt.

## Data Hierarchy

```
{orgId}/
  └── {teamId}/
      └── {huntId}/
          ├── settings     (team's hunt configuration)
          ├── progress     (team's hunt progress - shared by all team members)
          └── metadata     (tracks all sessions that contributed)
```

## Key Structure Examples

### Team Hunt Data (Shared by all team members)
```
Key: bhhs/team-alpha/fall-2025/settings
Key: bhhs/team-alpha/fall-2025/progress
Key: bhhs/team-alpha/fall-2025/metadata
```

### Metadata Structure
```json
{
  "lastModifiedBy": "session-456",
  "lastModifiedAt": "2024-01-15T10:30:00Z",
  "contributors": [
    { "sessionId": "session-123", "lastActive": "2024-01-15T09:00:00Z" },
    { "sessionId": "session-456", "lastActive": "2024-01-15T10:30:00Z" }
  ],
  "totalUpdates": 145
}
```

### Team-Level Aggregation
```
Key: bhhs/team-alpha/fall-2025/_team_summary
{
  totalSessions: 25,
  avgCompletionRate: 78,
  topPerformers: [...],
  lastActivity: "2024-01-15T10:30:00Z"
}
```

### Organization-Level Aggregation
```
Key: bhhs/_org_summary
{
  totalTeams: 10,
  totalHunts: 3,
  activeSessions: 150,
  organizationStats: {...}
}
```

## API Endpoint Patterns

### Team Hunt Endpoints (sessionId sent in body/headers for tracking)
```
GET    /api/settings/{orgId}/{teamId}/{huntId}
POST   /api/settings/{orgId}/{teamId}/{huntId}
GET    /api/progress/{orgId}/{teamId}/{huntId}
POST   /api/progress/{orgId}/{teamId}/{huntId}
PATCH  /api/progress/{orgId}/{teamId}/{huntId}/stop/{stopId}

Note: POST/PATCH requests include sessionId in request body for audit trail
```

### Team Management Endpoints
```
GET    /api/org/{orgId}/teams
GET    /api/org/{orgId}/team/{teamId}/hunts
GET    /api/org/{orgId}/team/{teamId}/hunt/{huntId}/contributors
GET    /api/org/{orgId}/team/{teamId}/hunt/{huntId}/leaderboard
```

### Analytics Endpoints
```
GET    /api/org/{orgId}/analytics
GET    /api/org/{orgId}/team/{teamId}/analytics
GET    /api/org/{orgId}/team/{teamId}/hunt/{huntId}/analytics
```

## Benefits of This Structure

### 1. **Data Isolation**
- Complete separation between organizations
- Teams can't access other teams' data
- Hunts are isolated within teams

### 2. **Scalability**
- Easy to partition data by organization
- Can implement organization-specific quotas
- Simple to migrate individual organizations

### 3. **Analytics & Reporting**
- Easy aggregation at any level (org/team/hunt)
- Built-in hierarchy for reporting
- Simple leaderboard generation

### 4. **Access Control**
- Natural boundaries for permissions
- Organization admins can see all org data
- Team leads can see team data
- Players only see their session

### 5. **Multi-Tenancy**
- Same codebase serves multiple organizations
- Each org feels like they have their own app
- Easy white-labeling per organization

## Implementation Considerations

### Storage Keys
All storage keys follow the pattern:
```
{orgId}/{teamId}/{huntId}/{sessionId}/{dataType}
```

### URL Structure
User-facing URLs should include context:
```
https://app.com/{orgId}/{huntId}?team={teamId}
```

### Session ID Generation
```javascript
function generateSessionId() {
  return `${teamId}-${Date.now()}-${randomString(6)}`;
}
```

### Data Migration
When migrating from flat structure to hierarchical:
1. Extract org/team/hunt from existing data
2. Reconstruct keys with new hierarchy
3. Maintain backward compatibility during transition

## Security Considerations

### API Authentication
- Validate orgId matches authenticated user's organization
- Verify team membership before allowing access
- Check hunt participation before showing progress

### Rate Limiting
Apply rate limits per organization:
```javascript
const rateKey = `rate-limit:${orgId}`;
```

### Data Privacy
- Never expose other teams' data in same organization
- Anonymize leaderboard data if required
- Allow organizations to export/delete their data

## Query Patterns

### Get All Teams in Organization
```javascript
const teams = await store.list({ prefix: `${orgId}/` });
const uniqueTeams = [...new Set(
  teams.map(key => key.split('/')[1])
)];
```

### Get Team's Active Hunts
```javascript
const hunts = await store.list({
  prefix: `${orgId}/${teamId}/`
});
const activeHunts = hunts.filter(h => h.includes('active'));
```

### Calculate Organization Statistics
```javascript
async function getOrgStats(orgId) {
  const allKeys = await store.list({ prefix: `${orgId}/` });

  return {
    totalTeams: countUniqueTeams(allKeys),
    totalHunts: countUniqueHunts(allKeys),
    totalSessions: countSessions(allKeys),
    lastActivity: getMostRecentActivity(allKeys)
  };
}
```

## Team Collaboration Features

### Shared Progress Model
- All team members see and update the same progress data
- No individual progress tracking - it's all team-based
- SessionId is used only for audit trail and contributor tracking
- Real-time updates visible to all team members

### Conflict Resolution
- Last-write-wins for individual stops
- Metadata tracks all contributors and their activity
- Optional: Implement optimistic locking with ETags

### Benefits of Team-Shared Data
1. **True Collaboration** - Team members work together, not separately
2. **Simplified State** - One progress state per team, not per user
3. **Better Performance** - Less data to sync and store
4. **Clear Ownership** - Data belongs to the team, not individuals

## Example Data Flow

1. **User Joins Hunt**
   ```
   POST /api/join
   Body: { orgId: "bhhs", teamId: "eagles", huntId: "fall-2025" }
   Returns: { sessionId: "eagles-1704456789-abc123" }
   ```

2. **Save Team Progress** (any team member)
   ```
   POST /api/progress/bhhs/eagles/fall-2025
   Body: {
     progress: { stop1: { done: true, photo: "url" } },
     sessionId: "eagles-1704456789-abc123"  // For audit only
   }
   ```

3. **View Team Progress** (all members see same data)
   ```
   GET /api/progress/bhhs/eagles/fall-2025
   Returns: { stop1: { done: true, photo: "url", lastModifiedBy: "session-123" } }
   ```

4. **View Hunt Leaderboard**
   ```
   GET /api/org/bhhs/hunt/fall-2025/leaderboard
   Returns: [{ teamName: "eagles", completion: 85% }, ...]
   ```

## Future Enhancements

- **Hunt Templates**: Store reusable hunt configurations at org level
- **Cross-Hunt Analytics**: Compare performance across different hunts
- **Team Competitions**: Support team vs team challenges
- **Historical Data**: Archive completed hunts for year-over-year analysis
- **Custom Permissions**: Granular access control per organization