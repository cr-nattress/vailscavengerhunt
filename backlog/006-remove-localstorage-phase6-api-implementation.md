# Phase 6: Implement Server-Side API Endpoints

## Objective
Create all necessary server-side API endpoints to replace localStorage functionality.

## Prerequisites
- Architecture decisions made (Phases 1-5)
- API contracts defined

## Tasks

### 1. Create Settings Endpoints

**GET /api/settings/{orgId}/{teamId}/{huntId}**
```javascript
// netlify/functions/settings-get.js
export default async (req, context) => {
  const { orgId, teamId, huntId } = extractParams(req.url);
  const key = `${orgId}/${teamId}/${huntId}/settings`;
  const store = getStore({ name: 'hunt-data' });
  const settings = await store.get(key);
  return Response.json(settings || defaultSettings());
};
```

**POST /api/settings/{orgId}/{teamId}/{huntId}**
```javascript
// netlify/functions/settings-set.js
export default async (req, context) => {
  const { orgId, teamId, huntId } = extractParams(req.url);
  const { settings, sessionId } = await req.json(); // sessionId for audit
  const key = `${orgId}/${teamId}/${huntId}/settings`;
  const metadataKey = `${orgId}/${teamId}/${huntId}/metadata`;
  const store = getStore({ name: 'hunt-data' });

  // Store settings (shared by all team members)
  await store.setJSON(key, {
    ...settings,
    lastModifiedBy: sessionId,
    lastModifiedAt: new Date().toISOString()
  });

  // Update metadata
  const metadata = await store.get(metadataKey) || { contributors: [] };
  const contributorIndex = metadata.contributors.findIndex(c => c.sessionId === sessionId);

  if (contributorIndex >= 0) {
    metadata.contributors[contributorIndex].lastActive = new Date().toISOString();
  } else {
    metadata.contributors.push({
      sessionId,
      firstActive: new Date().toISOString(),
      lastActive: new Date().toISOString()
    });
  }

  metadata.lastModifiedBy = sessionId;
  metadata.lastModifiedAt = new Date().toISOString();
  metadata.totalUpdates = (metadata.totalUpdates || 0) + 1;

  await store.setJSON(metadataKey, metadata);

  return Response.json({ success: true });
};
```

### 2. Create Progress Endpoints

**GET /api/progress/{orgId}/{teamId}/{huntId}**
```javascript
// netlify/functions/progress-get.js
export default async (req, context) => {
  const { orgId, teamId, huntId } = extractParams(req.url);
  const key = `${orgId}/${teamId}/${huntId}/progress`;
  const store = getStore({ name: 'hunt-data' });
  const progress = await store.get(key);
  return Response.json(progress || {});
};
```

**POST /api/progress/{orgId}/{teamId}/{huntId}**
```javascript
// netlify/functions/progress-set.js
export default async (req, context) => {
  const { orgId, teamId, huntId } = extractParams(req.url);
  const { progress, sessionId } = await req.json(); // sessionId for audit
  const key = `${orgId}/${teamId}/${huntId}/progress`;
  const metadataKey = `${orgId}/${teamId}/${huntId}/metadata`;
  const store = getStore({ name: 'hunt-data' });

  // Merge with existing progress (in case multiple team members are updating)
  const existingProgress = await store.get(key) || {};
  const mergedProgress = {
    ...existingProgress,
    ...progress,
    lastModifiedBy: sessionId,
    lastModifiedAt: new Date().toISOString()
  };

  await store.setJSON(key, mergedProgress);

  // Update metadata
  await updateMetadata(metadataKey, sessionId, store);

  return Response.json({ success: true, progress: mergedProgress });
};
```

**PATCH /api/progress/{orgId}/{teamId}/{huntId}/stop/{stopId}**
```javascript
// netlify/functions/progress-stop-update.js
export default async (req, context) => {
  const { orgId, teamId, huntId, stopId } = extractParams(req.url);
  const { update, sessionId } = await req.json(); // sessionId for audit

  const key = `${orgId}/${teamId}/${huntId}/progress`;
  const metadataKey = `${orgId}/${teamId}/${huntId}/metadata`;
  const store = getStore({ name: 'hunt-data' });

  // Get existing progress (shared by team)
  const progress = await store.get(key) || {};

  // Update specific stop
  progress[stopId] = {
    ...progress[stopId],
    ...update,
    lastModifiedBy: sessionId,
    lastModifiedAt: new Date().toISOString()
  };

  // Save updated progress
  await store.setJSON(key, progress);

  // Update metadata
  await updateMetadata(metadataKey, sessionId, store);

  // Broadcast update to team members (optional: use WebSocket or SSE)
  await broadcastTeamUpdate(orgId, teamId, huntId, stopId);

  return Response.json({ success: true });
};
```

### 3. Create Organization and Team Management Endpoints

**GET /api/org/{orgId}/teams**
```javascript
// Get all teams in an organization
export default async (req, context) => {
  const { orgId } = extractParams(req.url);
  const store = getStore({ name: 'hunt-data' });

  // Get all keys that match org pattern
  const pattern = `${orgId}/*/`;
  const teams = await store.list({ prefix: pattern });

  // Extract unique team IDs
  const uniqueTeams = [...new Set(teams.map(key => key.split('/')[1]))];

  return Response.json({ orgId, teams: uniqueTeams });
};
```

**GET /api/org/{orgId}/team/{teamId}/hunts**
```javascript
// Get all hunts for a team
export default async (req, context) => {
  const { orgId, teamId } = extractParams(req.url);
  const store = getStore({ name: 'hunt-data' });

  const pattern = `${orgId}/${teamId}/`;
  const hunts = await store.list({ prefix: pattern });

  // Extract unique hunt IDs
  const uniqueHunts = [...new Set(hunts.map(key => key.split('/')[2]))];

  return Response.json({ orgId, teamId, hunts: uniqueHunts });
};
```

**GET /api/org/{orgId}/hunt/{huntId}/leaderboard**
```javascript
// Get leaderboard data across all teams for a hunt
export default async (req, context) => {
  const { orgId, huntId } = extractParams(req.url);
  const store = getStore({ name: 'hunt-data' });

  // Get all teams participating in this hunt
  const pattern = `${orgId}/*/`;
  const allKeys = await store.list({ prefix: pattern });

  const leaderboard = [];
  const processedTeams = new Set();

  for (const key of allKeys) {
    if (key.includes(`/${huntId}/progress`)) {
      const parts = key.split('/');
      const teamId = parts[1];

      if (!processedTeams.has(teamId)) {
        processedTeams.add(teamId);

        const progress = await store.get(key);
        const metadata = await store.get(`${orgId}/${teamId}/${huntId}/metadata`);

        if (progress) {
          const stops = Object.entries(progress).filter(([k]) => !['lastModifiedBy', 'lastModifiedAt'].includes(k));
          const completedStops = stops.filter(([_, p]) => p.done).length;
          const totalStops = stops.length;

          leaderboard.push({
            teamId,
            teamName: progress.teamName || teamId,
            completedStops,
            totalStops,
            completionRate: totalStops > 0 ? (completedStops / totalStops) * 100 : 0,
            lastActivity: progress.lastModifiedAt,
            contributors: metadata?.contributors?.length || 1,
            totalUpdates: metadata?.totalUpdates || 0
          });
        }
      }
    }
  }

  // Sort by completion rate, then by last activity
  leaderboard.sort((a, b) => {
    if (b.completionRate !== a.completionRate) {
      return b.completionRate - a.completionRate;
    }
    return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
  });

  return Response.json({ orgId, huntId, leaderboard });
};
```

**GET /api/team/{orgId}/{teamId}/{huntId}/export**
```javascript
// Export all team data for a hunt
export default async (req, context) => {
  const { orgId, teamId, huntId } = extractParams(req.url);
  const baseKey = `${orgId}/${teamId}/${huntId}`;

  const store = getStore({ name: 'hunt-data' });
  const settings = await store.get(`${baseKey}/settings`);
  const progress = await store.get(`${baseKey}/progress`);
  const metadata = await store.get(`${baseKey}/metadata`);

  return Response.json({
    orgId,
    teamId,
    huntId,
    settings,
    progress,
    metadata,
    exportedAt: new Date().toISOString()
  });
};
```

**GET /api/contributors/{orgId}/{teamId}/{huntId}**
```javascript
// Get list of all contributors to a team's hunt
export default async (req, context) => {
  const { orgId, teamId, huntId } = extractParams(req.url);
  const metadataKey = `${orgId}/${teamId}/${huntId}/metadata`;

  const store = getStore({ name: 'hunt-data' });
  const metadata = await store.get(metadataKey);

  return Response.json({
    orgId,
    teamId,
    huntId,
    contributors: metadata?.contributors || [],
    lastModifiedBy: metadata?.lastModifiedBy,
    lastModifiedAt: metadata?.lastModifiedAt,
    totalUpdates: metadata?.totalUpdates || 0
  });
};
```

### 4. Add Server Routes (Local Development)

```typescript
// src/server/settingsRoute.ts
router.get('/settings/:sessionId', async (req, res) => {
  // Implement for local development
});

router.post('/settings/:sessionId', async (req, res) => {
  // Implement for local development
});

// src/server/progressRoute.ts
router.get('/progress/:sessionId', async (req, res) => {
  // Implement for local development
});

router.post('/progress/:sessionId', async (req, res) => {
  // Implement for local development
});
```

### 5. Add Data Validation

```javascript
// src/utils/validation.js
const validateSettings = (settings) => {
  const required = ['locationName', 'sessionId'];
  for (const field of required) {
    if (!settings[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  return true;
};

const validateProgress = (progress) => {
  // Validate progress data structure
  return true;
};
```

### 6. Add Rate Limiting

```javascript
// netlify/functions/_middleware.js
const rateLimit = new Map();

export const onRequest = async (context) => {
  const ip = context.ip;
  const now = Date.now();

  if (rateLimit.has(ip)) {
    const { count, firstRequest } = rateLimit.get(ip);
    if (now - firstRequest < 60000 && count > 100) {
      return new Response('Rate limit exceeded', { status: 429 });
    }
  }

  rateLimit.set(ip, { count: 1, firstRequest: now });
  return context.next();
};
```

## Testing Checklist
- [ ] All endpoints return correct data
- [ ] Error handling works properly
- [ ] Rate limiting prevents abuse
- [ ] Data validation catches bad input
- [ ] Works in both Netlify and local environments

## Status
⏳ Not Started