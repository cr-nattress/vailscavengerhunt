# Phase 34 (Optional): Add Team Leaderboard

## Overview
Add a simple leaderboard to show team progress comparisons.

## Implementation

### 1. Create Leaderboard Endpoint
```javascript
// netlify/functions/leaderboard-get.js
exports.handler = async (event) => {
  const { orgId, huntId } = event.queryStringParameters

  // Get all teams' progress for this hunt
  const store = getStore({ name: 'hunt-data' })
  const keys = await store.list({ prefix: `${orgId}/` })

  const teams = []
  for (const key of keys) {
    if (key.includes(`/${huntId}/progress`)) {
      const [, teamId] = key.split('/')
      const progress = await store.get(key)
      teams.push({
        teamId,
        completedStops: Object.values(progress).filter(p => p.done).length,
        totalStops: Object.keys(progress).length
      })
    }
  }

  // Sort by completion
  teams.sort((a, b) => b.completedStops - a.completedStops)

  return { statusCode: 200, body: JSON.stringify(teams) }
}
```

### 2. Add Leaderboard View
```tsx
// src/features/views/LeaderboardView.tsx
export default function LeaderboardView() {
  const [teams, setTeams] = useState([])

  useEffect(() => {
    loadLeaderboard()
  }, [])

  return (
    <div className="leaderboard">
      <h2>Team Rankings</h2>
      {teams.map((team, index) => (
        <div key={team.teamId} className="team-rank">
          <span className="rank">#{index + 1}</span>
          <span className="name">{team.teamId}</span>
          <span className="progress">{team.completedStops}/{team.totalStops}</span>
        </div>
      ))}
    </div>
  )
}
```

### 3. Add to Navigation
Add "Rankings" tab that shows the leaderboard.

## Benefits
- Competitive element
- Team motivation
- Simple implementation

## Considerations
- Privacy: Show team names only, not individual data
- Performance: Cache leaderboard data
- Optional: Make it opt-in per organization

## Success Criteria
- [ ] Leaderboard endpoint works
- [ ] Rankings view displays correctly
- [ ] Updates reflect in real-time
- [ ] No performance impact