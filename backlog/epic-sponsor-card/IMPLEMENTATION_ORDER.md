# Sponsor Card Epic - Implementation Order

## Overview
This guide provides the recommended implementation order for the Sponsor Card epic to ensure incremental delivery without breaking existing functionality.

## Implementation Strategy
**Zero Breaking Changes Rule**: Each phase must maintain 100% backward compatibility. Users without sponsor configurations continue using the app normally, and all new functionality is additive only.

## Phase 1: Foundation Infrastructure (Day 1)
**Goal**: Establish database and API infrastructure with zero UI impact

### US-001: Database Schema and Storage Setup
**Duration**: 4 hours
**Priority**: CRITICAL - All other work depends on this

**Tasks**:
1. **Database Schema** (1 hour)
   - Create `scripts/sponsor-assets-schema.sql`
   - Define `sponsor_assets` table with proper indexes
   - Add RLS policies for security

2. **Storage Setup** (1 hour)
   - Create `sponsors` Supabase storage bucket
   - Configure public read access
   - Set up service role permissions

3. **Setup Automation** (1 hour)
   - Create `scripts/setup-sponsor-assets.js`
   - Add NPM script for easy deployment
   - Test schema deployment

4. **Test Data** (1 hour)
   - Create `scripts/seed-sponsor-data.sql`
   - Add sample sponsors for development
   - Document setup process

**Deliverable**: Database schema deployed, storage configured, test data available
**Validation**: Run setup script, verify table exists, test data insertion

---

## Phase 2: API Layer (Day 1-2)
**Goal**: Build API endpoints that return sponsor data

### US-002: Sponsor Data API
**Duration**: 6 hours
**Priority**: HIGH - Frontend needs this to display anything

**Tasks**:
1. **Core API Function** (3 hours)
   - Create `netlify/functions/sponsors-get.js`
   - Implement Supabase queries
   - Add signed URL generation for images
   - Handle SVG inline content

2. **Settings Integration** (1 hour)
   - Integrate with existing settings system for layout
   - Implement fallback to default layout
   - Add proper error handling

3. **Type Definitions** (1 hour)
   - Create `src/types/sponsors.ts`
   - Document API contract
   - Add database types

4. **Testing** (1 hour)
   - Create API integration tests
   - Test with real Supabase data
   - Verify signed URLs work

**Deliverable**: API function returns sponsor data in expected format
**Validation**: Test API with curl, verify JSON response structure

---

## Phase 3: Core UI Components (Day 2)
**Goal**: Build sponsor display components without integration

### US-003: Core Sponsor Card Component
**Duration**: 8 hours
**Priority**: HIGH - Core user-facing feature

**Tasks**:
1. **SponsorCard Component** (4 hours)
   - Create `src/features/sponsors/SponsorCard.tsx`
   - Implement grid layouts (1x1, 1x2, 1x3)
   - Handle image and SVG rendering
   - Add proper styling and responsiveness

2. **Data Hook** (2 hours)
   - Create `src/features/sponsors/useSponsors.ts`
   - Integrate with SponsorsService
   - Handle loading and error states

3. **Service Layer** (1 hour)
   - Create `src/services/SponsorsService.ts`
   - Add caching and error handling
   - Follow existing service patterns

4. **Component Tests** (1 hour)
   - Create comprehensive unit tests
   - Test all layouts and content types
   - Add accessibility tests

**Deliverable**: Sponsor card component works in isolation
**Validation**: Render component in Storybook/isolated test, verify layouts

---

## Phase 4: Configuration Management (Day 2-3)
**Goal**: Allow layout configuration without UI changes yet

### US-004: Layout Configuration
**Duration**: 4 hours
**Priority**: MEDIUM - Enables customization

**Tasks**:
1. **Settings Extension** (2 hours)
   - Extend existing settings system for sponsor layouts
   - Add validation for layout values
   - Update API to read layout configuration

2. **Feature Flag** (1 hour)
   - Add `VITE_ENABLE_SPONSOR_CARD` environment variable
   - Update API and frontend to respect flag
   - Document feature flag usage

3. **Management Utilities** (1 hour)
   - Create `src/utils/sponsorSettingsManager.ts`
   - Add helper functions for configuration
   - Document configuration process

**Deliverable**: Layout configuration system functional
**Validation**: Test setting different layouts via database, verify API returns correct layout

---

## Phase 5: ActiveView Integration (Day 3)
**Goal**: Integrate sponsor card into ActiveView with conditional rendering

### US-005: ActiveView Integration
**Duration**: 3 hours
**Priority**: HIGH - Makes feature visible to users

**Tasks**:
1. **Component Integration** (1.5 hours)
   - Add SponsorCard to ActiveView.tsx
   - Implement conditional rendering (only when sponsors exist)
   - Add proper spacing logic

2. **State Management** (1 hour)
   - Integrate useSponsors hook
   - Handle loading and error states
   - Ensure no impact on existing functionality

3. **Integration Tests** (0.5 hours)
   - Test ActiveView with and without sponsors
   - Verify spacing and layout
   - Confirm no existing functionality broken

**Deliverable**: Sponsor card appears on ActiveView when configured
**Validation**: Test with real sponsor data, verify card shows above progress card

---

## Phase 6: Quality Assurance & Polish (Day 3-4)
**Goal**: Comprehensive testing and quality validation

### US-006: Testing and Quality Assurance
**Duration**: 6 hours
**Priority**: MEDIUM - Ensures reliability

**Tasks**:
1. **Comprehensive Testing** (3 hours)
   - Add unit tests for all components
   - Create API integration tests
   - Add end-to-end tests for workflows

2. **Cross-Browser Testing** (2 hours)
   - Test on Chrome, Firefox, Safari, Edge
   - Verify mobile responsiveness
   - Test accessibility with screen readers

3. **Performance Validation** (1 hour)
   - Test with many sponsors
   - Verify image loading performance
   - Check bundle size impact

**Deliverable**: All tests passing, quality gates met
**Validation**: Run full test suite, manual testing across browsers

---

## Implementation Timeline

### Day 1: Foundation (8 hours)
- ✅ **Morning**: US-001 Database Schema and Storage (4h)
- ✅ **Afternoon**: US-002 API Layer - Part 1 (4h)

### Day 2: Core Features (8 hours)
- ✅ **Morning**: US-002 API Layer - Part 2 (2h) + US-003 Component - Part 1 (4h)
- ✅ **Afternoon**: US-003 Component - Part 2 (4h)

### Day 3: Integration (7 hours)
- ✅ **Morning**: US-004 Configuration (4h)
- ✅ **Afternoon**: US-005 ActiveView Integration (3h)

### Day 4: Quality (6 hours)
- ✅ **Full Day**: US-006 Testing and QA (6h)

**Total Estimated Effort**: 3-4 days (25-29 hours)

---

## Risk Mitigation

### High Priority Risks
1. **API Performance** - Signed URL generation could be slow
   - *Mitigation*: Implement caching, use CDN where possible

2. **Image Loading** - Large sponsor images could slow page load
   - *Mitigation*: Implement lazy loading, optimize images

3. **Layout Breaking** - Sponsor card could break existing design
   - *Mitigation*: Extensive testing, proper spacing implementation

4. **Supabase Limits** - Storage or API limits could be hit
   - *Mitigation*: Monitor usage, implement graceful degradation

### Technical Risks
1. **SVG Security** - Inline SVG could introduce XSS risks
   - *Mitigation*: Implement SVG sanitization

2. **Settings Conflicts** - Layout settings could conflict with existing ones
   - *Mitigation*: Use unique setting keys, validate values

3. **Performance Impact** - Feature could slow down ActiveView
   - *Mitigation*: Performance testing, optimization

### Rollback Strategy
Each phase includes:
- **Feature flag** to disable sponsor card entirely
- **Conditional rendering** to hide when no data
- **Graceful degradation** for API failures
- **Zero breaking changes** for existing functionality

---

## Success Criteria Per Phase

### Phase 1 Success Criteria
- [ ] Database schema deployed successfully
- [ ] Storage bucket configured and accessible
- [ ] Setup scripts work without errors
- [ ] Test data can be inserted and retrieved

### Phase 2 Success Criteria
- [ ] API returns sponsor data in correct JSON format
- [ ] Signed URLs work for stored images
- [ ] SVG content returned properly
- [ ] Layout configuration retrieved from settings
- [ ] Error handling works for all edge cases

### Phase 3 Success Criteria
- [ ] SponsorCard renders all layouts correctly (1x1, 1x2, 1x3)
- [ ] Both image and SVG sponsors display properly
- [ ] Component returns null when no sponsors provided
- [ ] Responsive design works on mobile and desktop
- [ ] All accessibility requirements met

### Phase 4 Success Criteria
- [ ] Layout can be configured per organization/hunt
- [ ] Feature flag enables/disables functionality
- [ ] Invalid layout values handled gracefully
- [ ] Settings management utilities work correctly

### Phase 5 Success Criteria
- [ ] Sponsor card appears above progress card when sponsors exist
- [ ] Card is completely hidden when no sponsors configured
- [ ] Proper spacing maintained with existing elements
- [ ] No existing ActiveView functionality broken
- [ ] Loading and error states handled appropriately

### Phase 6 Success Criteria
- [ ] All unit, integration, and e2e tests passing
- [ ] Cross-browser compatibility confirmed
- [ ] Performance benchmarks met
- [ ] Accessibility audit passes
- [ ] Documentation complete and accurate

---

## Deployment Strategy

### Environment Progression
1. **Development**: Feature flag OFF by default
2. **Staging**: Feature flag ON, test with sample data
3. **Production**:
   - Deploy with feature flag OFF
   - Enable for specific org/hunt combinations
   - Monitor performance and error rates
   - Gradual rollout to all events

### Feature Flag Control
```bash
# Disable globally
VITE_ENABLE_SPONSOR_CARD=false

# Enable for testing
VITE_ENABLE_SPONSOR_CARD=true

# Per-environment control
STAGING_ENABLE_SPONSOR_CARD=true
PRODUCTION_ENABLE_SPONSOR_CARD=false
```

### Monitoring & Metrics
- API response times for sponsor endpoints
- Image load success rates
- Feature usage analytics
- Error rates and user reports
- Performance impact on ActiveView load times

---

## Post-Launch Considerations

### Immediate Follow-ups
- Monitor sponsor card visibility and interaction rates
- Gather user feedback on layout preferences
- Optimize image loading and caching
- Consider admin interface for easier sponsor management

### Future Enhancements
- **Admin Interface**: Visual sponsor management dashboard
- **Analytics**: Track sponsor impression rates
- **A/B Testing**: Test different layouts for effectiveness
- **Additional Layouts**: 2x2 grid, carousel view
- **Animation**: Subtle transitions and loading states
- **Personalization**: Team-specific sponsor targeting

### Maintenance
- Regular testing with new browser versions
- Performance monitoring and optimization
- Security updates for SVG handling
- Documentation updates as system evolves

---

This implementation order ensures a smooth rollout of the sponsor card feature with minimal risk and maximum flexibility. Each phase delivers value incrementally while maintaining the stability of the existing application.