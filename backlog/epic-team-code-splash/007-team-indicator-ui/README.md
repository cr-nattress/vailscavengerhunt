# User Story 007: Team Indicator UI

**As a user**, I want to see which team I'm currently logged in as **so that** I have clear confirmation of my team membership.

## Acceptance Criteria
- [ ] Small team indicator component in header/navigation
- [ ] Shows current team name when team lock is active
- [ ] Hidden when no team lock exists (preserves existing UI)
- [ ] Clicking indicator shows team details or allows logout
- [ ] Consistent with existing UI design patterns

## Tasks
1. `task-01-team-chip-component.md` - Create TeamChip display component
2. `task-02-header-integration.md` - Integrate with existing header component
3. `task-03-team-context-hook.md` - Create useTeamContext hook
4. `task-04-logout-functionality.md` - Add team logout/switch functionality

## Definition of Done
- Team indicator appears only when user has valid team lock
- Component matches existing design patterns
- Team context easily accessible throughout app
- Logout functionality works smoothly
- No impact on existing users without team locks