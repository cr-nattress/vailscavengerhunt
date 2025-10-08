# Epic: Demo Scavenger Hunt with Multi-Org Auto-Context

## Overview
Create a demonstration scavenger hunt under a new organization with 2 teams and 5 sample locations. Implement intelligent context detection that automatically loads the correct organization and hunt configuration based on team code verification, eliminating the need for manual redirects.

## Business Value
- **Sales & Demos**: Provide a ready-to-use demo environment for showcasing the platform
- **Multi-tenancy Validation**: Prove the multi-org architecture works seamlessly
- **Onboarding**: Serve as a template for new organizations
- **Testing**: Use as a stable test environment for QA and E2E tests

## Goals
- Create a complete demo organization in Supabase with all required data
- Implement 5 diverse, universally-relatable locations (not Vail-specific)
- Configure 2 demo teams with easy-to-remember access codes
- Ensure automatic org/hunt context switching works without redirects
- Verify the existing multi-org infrastructure handles the demo seamlessly
- Provide clear documentation for creating additional organizations

## Success Criteria
- [ ] Demo organization (`demo-org`) exists in Supabase with complete data
- [ ] 5 sample locations created with clues, hints, and coordinates
- [ ] 2 teams configured with codes `DEMO01` and `DEMO02`
- [ ] Team codes automatically load correct org/hunt context on verification
- [ ] No hardcoded references to demo org in application code
- [ ] Users can switch between BHHS, Mountain Adventures, and Demo orgs seamlessly
- [ ] All demo data is visually distinct (team names, location themes, branding)
- [ ] Documentation updated with multi-org setup instructions
- [ ] E2E tests cover cross-org team code verification

## Current State Analysis

### Existing Multi-Org Infrastructure ✅
- **Database Schema**: Supports multiple organizations and hunts
- **Team Verification**: Returns `organizationId` and `huntId` from team codes
- **Frontend Context**: `TeamLockWrapper.tsx` dynamically loads org/hunt from verification
- **App Store**: `setOrganizationId()` and `setHuntId()` manage global context
- **Persistence**: Stores org/hunt in localStorage with team lock
- **API Layer**: All endpoints accept `orgId` and `huntId` parameters

### Existing Organizations
1. **BHHS** (`bhhs` / `fall-2025`)
   - Multiple teams (BERRY01, POPPY01, TEACUP01, etc.)
   - Vail-specific locations

2. **Mountain Adventures** (`mountain-adventures` / `winter-2025`)
   - 2 teams: SUMMIT2025, POWDER2025
   - 10 winter-themed locations
   - Created via `scripts/sql/second-org-scavenger-hunt.sql`

## Implementation Plan

### Story 1: Database Setup for Demo Organization
**Supabase Tables to Populate:**

#### 1.1 Organization Record
```sql
INSERT INTO organizations (id, name) VALUES
  ('demo-org', 'Demo Adventures Inc.')
```

#### 1.2 Hunt Record
```sql
INSERT INTO hunts (id, organization_id, name, start_date, end_date, is_active) VALUES
  ('demo-2025', 'demo-org', 'Demo Scavenger Hunt 2025', '2025-01-01', '2025-12-31', true)
```

#### 1.3 Hunt Stops (5 Locations)
Create 5 diverse, theme-agnostic locations:
1. **City Park Fountain** - Urban landmark
2. **Historic Library** - Educational/cultural
3. **Farmer's Market** - Community gathering
4. **Riverside Walking Trail** - Nature/outdoor
5. **Downtown Art Installation** - Modern/artistic

Each stop includes:
- `stop_id`, `title`, `description`
- `clue` (mystery text leading to location)
- `hints` (JSON array of progressive hints)
- `position_lat`, `position_lng` (generic coordinates)

#### 1.4 Hunt Configuration
```sql
INSERT INTO hunt_configurations (organization_id, hunt_id, stop_id, is_active, default_order)
-- Link all 5 stops with ordering
```

#### 1.5 Hunt Ordering Strategy
```sql
INSERT INTO hunt_ordering_config (organization_id, hunt_id, ordering_strategy, seed_strategy) VALUES
  ('demo-org', 'demo-2025', 'fixed', 'team_based')
```

#### 1.6 Teams
```sql
INSERT INTO teams (team_id, organization_id, hunt_id, name, display_name, score) VALUES
  ('demo-team-alpha', 'demo-org', 'demo-2025', 'demo-team-alpha', 'Demo Team Alpha', 0),
  ('demo-team-beta', 'demo-org', 'demo-2025', 'demo-team-beta', 'Demo Team Beta', 0)
```

#### 1.7 Team Codes
```sql
INSERT INTO team_codes (code, team_id, organization_id, hunt_id, is_active, max_uses) VALUES
  ('DEMO01', <demo-team-alpha-uuid>, 'demo-org', 'demo-2025', true, NULL),
  ('DEMO02', <demo-team-beta-uuid>, 'demo-org', 'demo-2025', true, NULL)
```

#### 1.8 Team Settings (Optional)
```sql
INSERT INTO settings (team_id, organization_id, hunt_id, location_name, event_name, config)
-- Initialize default settings for each team
```

**Deliverables:**
- [ ] SQL script: `scripts/sql/demo-org-scavenger-hunt.sql`
- [ ] Execute script in Supabase SQL Editor
- [ ] Verify all records created (8 tables populated)
- [ ] Test team code lookup returns demo org data

---

### Story 2: Sample Location Content Creation
Create engaging, demo-ready content for 5 locations.

**Location 1: City Park Fountain**
- Title: "Fountain of Wonder"
- Clue: "Where coins are tossed for wishes and water dances in the sunlight, find your destiny at the heart of the park."
- Hints:
  1. "Look for the central gathering place in the park"
  2. "Listen for the sound of flowing water"
  3. "The marker is near the circular basin"
- Coordinates: Generic park location (40.7589° N, 73.9851° W - Central Park example)

**Location 2: Historic Library**
- Title: "Temple of Knowledge"
- Clue: "Between ancient tomes and whispered wisdom, seek the guardian of stories on marble steps."
- Hints:
  1. "This building has stood for over a century"
  2. "Look for stone lions or columns at the entrance"
  3. "The marker is near the main entrance"
- Coordinates: Generic library location

**Location 3: Farmer's Market**
- Title: "Market of Bounty"
- Clue: "Where fresh goods meet eager hands, and vendors call their wares, find the community's heart beneath the canopy."
- Hints:
  1. "Open on weekends with local vendors"
  2. "Look for colorful tents and fresh produce"
  3. "The marker is at the main entrance sign"
- Coordinates: Generic market location

**Location 4: Riverside Walking Trail**
- Title: "Path Along the Water"
- Clue: "Follow the river's gentle song to where walkers rest and nature meets the city's edge."
- Hints:
  1. "This trail runs parallel to the river"
  2. "Look for a bench or rest area with a view"
  3. "The marker is at the scenic overlook"
- Coordinates: Generic riverfront trail

**Location 5: Downtown Art Installation**
- Title: "Modern Masterpiece"
- Clue: "Steel and glass form a puzzle for the eyes, find the reflection of progress in the city square."
- Hints:
  1. "This artwork is visible from multiple blocks away"
  2. "Look for abstract shapes in the downtown plaza"
  3. "The marker is at the installation's base"
- Coordinates: Generic downtown plaza

**Deliverables:**
- [ ] 5 complete location records with all fields
- [ ] Clues that are challenging but solvable
- [ ] 3-tier hint system for each location
- [ ] Generic coordinates that work for demo purposes
- [ ] Photo challenge descriptions (optional)

---

### Story 3: Verify Multi-Org Context Switching
Test and validate the existing context-switching mechanism.

**Testing Scenarios:**

1. **Cold Start - Demo Team Code**
   - Clear localStorage
   - Enter `DEMO01` on splash screen
   - Verify: App loads demo org/hunt context
   - Verify: `localStorage` shows `organizationId: 'demo-org'`, `huntId: 'demo-2025'`
   - Verify: Settings show demo location name and event name

2. **Switching from BHHS to Demo**
   - Start with BHHS team code (e.g., `BERRY01`)
   - Clear lock (logout)
   - Enter `DEMO01`
   - Verify: Context switches to demo org
   - Verify: No data leakage from BHHS context

3. **Switching from Demo to Mountain Adventures**
   - Start with `DEMO01`
   - Clear lock
   - Enter `SUMMIT2025`
   - Verify: Context switches to Mountain Adventures
   - Verify: Correct org/hunt loaded

4. **Page Refresh Persistence**
   - Login with `DEMO01`
   - Refresh page
   - Verify: Demo context persists
   - Verify: No API errors in console

5. **Concurrent Multi-Org Sessions**
   - Tab 1: Login with `DEMO01` (demo org)
   - Tab 2: Login with `BERRY01` (BHHS org)
   - Verify: Each tab maintains separate context
   - Verify: No cross-contamination

**Code Review Points:**
- [ ] `SplashGate.tsx:78-79` - Stores org/hunt in team lock ✅
- [ ] `TeamLockWrapper.tsx:83-84` - Retrieves org/hunt from lock ✅
- [ ] `team-verify.js:180-216` - Returns org/hunt data ✅
- [ ] `LoginService.verifyTeam()` - Uses org/hunt from verification ✅

**Deliverables:**
- [ ] E2E test suite: `tests/e2e/multi-org-switching.test.js`
- [ ] Test all 5 scenarios above
- [ ] Document any bugs found
- [ ] Verify no code changes needed (should work as-is)

---

### Story 4: Documentation and Deployment Guide
Create comprehensive documentation for multi-org setup.

**Documentation Files:**

#### 4.1 Update `MULTI-ORG-SUPPORT.md`
Add demo org as third example:
```markdown
### Test with Demo Adventures (demo org)
```
Team Code: DEMO01, DEMO02
Organization: demo-org
Hunt: demo-2025
```
```

#### 4.2 Create `docs/MULTI_ORG_SETUP_GUIDE.md`
Complete guide for adding new organizations:
- Prerequisites (Supabase access, SQL knowledge)
- Step-by-step SQL setup
- Table relationships diagram
- Team code generation best practices
- Testing checklist
- Troubleshooting common issues

#### 4.3 Create `scripts/sql/README.md`
Document all SQL scripts:
- `second-org-scavenger-hunt.sql` - Mountain Adventures example
- `demo-org-scavenger-hunt.sql` - Demo organization
- Template for creating new orgs

#### 4.4 Update Main `README.md`
Add multi-org section:
```markdown
## Multi-Organization Support

This application supports multiple organizations and hunts in a single deployment. Users automatically access the correct organization based on their team code.

**Existing Organizations:**
- BHHS (`bhhs` / `fall-2025`) - Vail scavenger hunt
- Mountain Adventures (`mountain-adventures` / `winter-2025`) - Winter adventure hunt
- Demo Adventures (`demo-org` / `demo-2025`) - Demonstration hunt

See [Multi-Org Setup Guide](docs/MULTI_ORG_SETUP_GUIDE.md) for details.
```

**Deliverables:**
- [ ] Updated `MULTI-ORG-SUPPORT.md` with demo org
- [ ] New `docs/MULTI_ORG_SETUP_GUIDE.md` (comprehensive guide)
- [ ] New `scripts/sql/README.md` (SQL scripts index)
- [ ] Updated main `README.md` (multi-org overview)
- [ ] Architecture diagram showing org/hunt relationships

---

### Story 5: Optional Auto-Redirect Enhancement
**(Optional - Only if business requires URL-based org separation)**

If the business wants org-specific URLs (e.g., `demo.app.com` or `app.com/demo`), implement redirect logic.

**Redirect Strategies:**

#### Option A: Query Parameter Detection
- URL format: `https://app.com/?code=DEMO01`
- On page load, detect `code` parameter
- Auto-populate and submit team code
- No infrastructure changes needed

#### Option B: Subdomain Routing
- URL format: `https://demo.app.com/`
- Detect subdomain on page load
- Pre-filter team code verification to expected org
- Show error if wrong org code entered
- Requires: DNS configuration, Netlify domain setup

#### Option C: Path-Based Routing
- URL format: `https://app.com/demo-org/`
- React Router handles org-based paths
- Pre-select org context from URL
- Requires: Router configuration, `_redirects` updates

**Implementation (if needed):**
- [ ] Choose redirect strategy based on business requirements
- [ ] Implement detection logic in `App.jsx` or `SplashGate.tsx`
- [ ] Add URL parameter handling
- [ ] Update `_redirects` file if using path-based routing
- [ ] Configure DNS if using subdomain-based routing
- [ ] Add redirect tests to E2E suite

**Decision:** ⚠️ **Recommend NOT implementing redirects**
- Current context-switching architecture is sufficient
- Redirects add complexity without clear benefit
- Existing localStorage persistence works well
- Multi-org already proven with BHHS + Mountain Adventures

---

## Technical Architecture

### Database Schema (Supabase)
```
organizations
  ├── id (PK)
  └── name

hunts
  ├── id (PK)
  ├── organization_id (FK)
  ├── name
  ├── start_date
  ├── end_date
  └── is_active

hunt_stops
  ├── stop_id (PK)
  ├── title
  ├── description
  ├── clue
  ├── hints (JSON)
  ├── position_lat
  └── position_lng

hunt_configurations
  ├── organization_id (FK)
  ├── hunt_id (FK)
  ├── stop_id (FK)
  ├── is_active
  └── default_order

hunt_ordering_config
  ├── organization_id (FK)
  ├── hunt_id (FK)
  ├── ordering_strategy
  └── seed_strategy

teams
  ├── id (UUID, PK)
  ├── team_id
  ├── organization_id (FK)
  ├── hunt_id (FK)
  ├── name
  ├── display_name
  └── score

team_codes
  ├── code (PK)
  ├── team_id (FK)
  ├── organization_id (FK)
  ├── hunt_id (FK)
  ├── is_active
  └── max_uses

settings (optional)
  ├── team_id (FK)
  ├── organization_id (FK)
  ├── hunt_id (FK)
  ├── location_name
  ├── event_name
  └── config (JSON)
```

### Data Flow
```
1. User enters team code (e.g., "DEMO01")
   ↓
2. POST /.netlify/functions/team-verify
   → Queries: team_codes JOIN teams
   → Returns: teamId, organizationId, huntId, organization{}, hunt{}
   ↓
3. SplashGate.tsx receives response
   → Stores lock with org/hunt IDs in localStorage
   → Calls onTeamVerified() → updates app store
   ↓
4. TeamLockWrapper sets global context
   → setOrganizationId('demo-org')
   → setHuntId('demo-2025')
   ↓
5. All API calls use org/hunt from app store
   → GET /api/progress/demo-org/demo-team-alpha/demo-2025
   → GET /api/sponsors?orgId=demo-org&huntId=demo-2025
   ↓
6. Page refresh: TeamLockWrapper.tsx:79-84
   → Retrieves lock from localStorage
   → Extracts org/hunt IDs
   → Calls LoginService.quickInit(orgId, huntId)
   → Restores full context
```

## Files to Create/Modify

### New Files
- [ ] `backlog/epic-demo-scavenger-hunt/epic.md` (this file)
- [ ] `scripts/sql/demo-org-scavenger-hunt.sql`
- [ ] `scripts/sql/README.md`
- [ ] `docs/MULTI_ORG_SETUP_GUIDE.md`
- [ ] `tests/e2e/multi-org-switching.test.js`

### Modified Files
- [ ] `MULTI-ORG-SUPPORT.md` - Add demo org example
- [ ] `README.md` - Add multi-org overview section
- [ ] `package.json` - Add test script for multi-org E2E tests (optional)

### No Code Changes Needed ✅
The existing codebase already supports this functionality:
- ✅ `netlify/functions/team-verify.js` - Returns org/hunt
- ✅ `src/features/teamLock/SplashGate.tsx` - Stores org/hunt in lock
- ✅ `src/features/teamLock/TeamLockWrapper.tsx` - Loads org/hunt from lock
- ✅ `src/store/appStore.ts` - Manages org/hunt state globally
- ✅ All API endpoints - Accept orgId/huntId parameters

## Testing Strategy

### Unit Tests
- [ ] Team code verification returns correct org/hunt
- [ ] Lock service stores/retrieves org/hunt correctly
- [ ] App store updates org/hunt state

### Integration Tests
- [ ] Team verification API with demo codes
- [ ] Settings retrieval for demo org
- [ ] Progress tracking for demo teams
- [ ] Leaderboard for demo hunt

### E2E Tests
- [ ] Multi-org switching scenarios (Story 3)
- [ ] Context persistence after refresh
- [ ] Concurrent sessions in different orgs
- [ ] Demo-specific team codes work end-to-end

### Manual Testing Checklist
- [ ] Login with DEMO01 → verify demo org loads
- [ ] Login with DEMO02 → verify demo org loads
- [ ] Switch from BHHS to demo → verify context change
- [ ] Switch from demo to Mountain Adventures → verify context change
- [ ] Refresh page with demo lock → verify persistence
- [ ] Complete a stop in demo hunt → verify progress saves
- [ ] View leaderboard for demo hunt → verify rankings
- [ ] Upload photo for demo stop → verify Cloudinary upload

## Rollout Plan

### Phase 1: Database Setup (Day 1)
1. Review and finalize SQL script
2. Execute script in Supabase production
3. Verify all records created
4. Test team code lookup manually

### Phase 2: Content Population (Day 1-2)
1. Finalize location content (clues, hints, descriptions)
2. Update SQL script with final content
3. Re-run script or update records

### Phase 3: Testing (Day 2-3)
1. Execute manual testing checklist
2. Run E2E tests
3. Fix any bugs discovered
4. Verify cross-org switching

### Phase 4: Documentation (Day 3-4)
1. Complete all documentation files
2. Create setup guide
3. Add architecture diagrams
4. Review and publish

### Phase 5: Handoff (Day 4-5)
1. Demo to stakeholders using DEMO01/DEMO02
2. Provide admin guide for creating new orgs
3. Train team on multi-org management
4. Monitor Sentry for any issues

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Org/hunt context leakage between orgs | High | Thorough E2E testing of context switching |
| localStorage conflicts across orgs | Medium | Ensure lock structure includes org/hunt IDs |
| Demo data pollution in production | Low | Use distinct team codes and org IDs |
| SQL script execution errors | Medium | Test script in dev environment first |
| Hardcoded org assumptions in code | High | Code review for hardcoded 'bhhs' references |

## Success Metrics

### Functional Metrics
- ✅ Demo org accessible via DEMO01 and DEMO02 codes
- ✅ All 5 locations load with complete data
- ✅ Context switching works 100% of the time
- ✅ Zero errors in Sentry related to demo org

### Performance Metrics
- Page load time for demo org < 2s
- Team verification response time < 500ms
- Context switch time < 100ms
- No memory leaks from context switching

### Business Metrics
- Demo org used for at least 3 sales presentations
- Template used to create 2+ new organizations
- Documentation referenced by support team
- Zero support tickets related to demo org

## Dependencies

### External Dependencies
- Supabase production access (SQL Editor + table access)
- Cloudinary account for photo uploads (existing)
- Netlify environment variables configured (existing)

### Internal Dependencies
- Existing multi-org codebase (v1.0+)
- Team verification API functional
- Settings and progress APIs functional
- Leaderboard API functional

## Future Enhancements

### Phase 2 (Post-Launch)
- [ ] Organization-specific branding/theming
- [ ] Custom logo support per organization
- [ ] Organization-specific color schemes
- [ ] White-label deployment per org
- [ ] Organization admin dashboard

### Phase 3 (Advanced)
- [ ] Multi-hunt support per organization
- [ ] Hunt templates for quick setup
- [ ] Automated org provisioning API
- [ ] Organization analytics dashboard
- [ ] Billing integration per organization

## References

- [MULTI-ORG-SUPPORT.md](../../MULTI-ORG-SUPPORT.md) - Current multi-org documentation
- [second-org-scavenger-hunt.sql](../../scripts/sql/second-org-scavenger-hunt.sql) - Mountain Adventures example
- [TeamLockWrapper.tsx](../../src/features/teamLock/TeamLockWrapper.tsx) - Context management
- [team-verify.js](../../netlify/functions/team-verify.js) - Team verification endpoint

## Acceptance Criteria

### Sprint Completion Checklist
- [ ] All 5 stories completed and tested
- [ ] Demo organization fully functional in production
- [ ] All documentation updated and published
- [ ] E2E tests passing for multi-org scenarios
- [ ] Demo delivered to stakeholders
- [ ] No P0/P1 bugs in demo org functionality
- [ ] Code reviewed and approved
- [ ] Architecture diagram created and shared

---

**Epic Owner:** Engineering Team
**Stakeholders:** Sales, Product, Customer Success
**Estimated Effort:** 3-5 days
**Priority:** Medium
**Tags:** #multi-org #demo #supabase #architecture
