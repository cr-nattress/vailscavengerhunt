# Epic: Cloudinary Image Optimization

- Owner: Platform
- Status: Proposed
- Goal: Optimize Cloudinary image upload configuration for consistency, performance, and bandwidth savings with minimal risk changes.

## Problem Statement
The application currently has:
1. **Inconsistent image sizes** across upload endpoints (1200px vs 1600px)
2. **Hardcoded transformation parameters** duplicated across 3 different upload functions
3. **Suboptimal quality settings** that could reduce bandwidth by 50-80% for mobile users
4. **No centralized configuration** making adjustments require editing multiple files

These issues lead to:
- Inconsistent user experience depending on upload path
- Maintenance overhead when tuning image settings
- Higher bandwidth costs and slower load times for mobile users
- Difficult A/B testing of image quality/size settings

## Scope
**In Scope:**
- Standardize image transformation parameters to environment variables
- Fix size inconsistency in legacy photo-upload endpoint
- Optimize quality settings for mobile bandwidth savings
- Update all 3 upload endpoints: `photo-upload.js`, `photo-upload-complete.js`, `photo-upload-orchestrated.js`

**Out of Scope:**
- Responsive image generation (multiple breakpoints)
- Eager transformations for thumbnails
- Upload progress indicators
- Client-side resize logic changes
- Larger architectural refactoring

## Goals
1. **Consistency**: All upload endpoints use identical image transformation settings
2. **Maintainability**: Configuration centralized in environment variables
3. **Performance**: Reduce bandwidth consumption for mobile users by 50-80%
4. **Low Risk**: Changes are configuration-focused, easily reversible

## Success Metrics
- Image size consistency: 100% of uploads use 1600x1600 (currently 67% due to legacy endpoint)
- Mobile bandwidth reduction: 50-80% smaller file sizes with quality: auto:eco
- Configuration centralization: 0 hardcoded transformation params in upload functions
- Deployment time: <30 minutes total for all changes
- Rollback time: <5 minutes (env var change only)

## Current State
### Upload Endpoints
1. **photo-upload-complete.js** (Primary) - 1600x1600, auto:good ✅
2. **photo-upload.js** (Legacy) - 1200x1200, auto:good ❌ (inconsistent)
3. **photo-upload-orchestrated.js** (Advanced) - 1600x1600, auto:good ✅

### Transformation Settings
```javascript
// Hardcoded in 3 places
transformation: [{
  width: 1600,        // or 1200 in legacy
  height: 1600,       // or 1200 in legacy
  quality: 'auto:good',
  fetch_format: 'auto',
  crop: 'limit'
}]
```

## Proposed Changes

### 1. Configuration Consolidation
**Current:** Hardcoded in 3 files
**Proposed:** Environment variables
```bash
CLOUDINARY_IMAGE_WIDTH=1600
CLOUDINARY_IMAGE_HEIGHT=1600
CLOUDINARY_IMAGE_QUALITY=auto:eco
CLOUDINARY_FETCH_FORMAT=auto
CLOUDINARY_CROP_MODE=limit
```

### 2. Size Standardization
**Current:** photo-upload.js uses 1200x1200
**Proposed:** All endpoints use 1600x1600

### 3. Quality Optimization
**Current:** quality: auto:good
**Proposed:** quality: auto:eco (50-80% smaller files)

## Deliverables
- Environment variable configuration for all transformation parameters
- Updated .env.example with new Cloudinary config
- All 3 upload endpoints reading from env vars
- Legacy endpoint (photo-upload.js) using consistent 1600x1600 size
- Updated documentation in knowledge/ENVIRONMENT_SETUP.md
- Test results comparing before/after file sizes and quality

## Acceptance Criteria
- [ ] All transformation parameters sourced from environment variables
- [ ] All 3 upload endpoints use identical transformation settings
- [ ] Mobile users see 50%+ reduction in image download size
- [ ] Visual quality remains acceptable on all device types
- [ ] Changes are reversible via environment variable adjustment
- [ ] No code changes required to adjust image settings
- [ ] Documentation updated with new configuration options

## Risks and Mitigations

### Risk: Quality degradation with auto:eco
- **Likelihood:** Low
- **Impact:** Medium
- **Mitigation:**
  - Test on multiple devices before production rollout
  - Use feature flag (env var) for easy rollback
  - A/B test if quality concerns arise

### Risk: Larger images increase Cloudinary costs
- **Likelihood:** Low (standardizing to existing primary size)
- **Impact:** Low
- **Mitigation:**
  - Legacy endpoint (photo-upload.js) may see slight increase
  - auto:eco quality reduces storage and bandwidth costs
  - Monitor Cloudinary usage dashboard after deployment

### Risk: Breaking existing upload flows
- **Likelihood:** Very Low
- **Impact:** High
- **Mitigation:**
  - Changes are configuration-only
  - No API contract changes
  - Thorough testing in staging environment
  - Staged rollout: config consolidation → size fix → quality optimization

## Implementation Strategy

### Phase 1: Configuration Consolidation (Lowest Risk)
1. Add environment variables to .env and Netlify
2. Update upload functions to read from env vars
3. Test with default values matching current settings
4. Deploy to staging

### Phase 2: Size Standardization (Very Low Risk)
1. Update photo-upload.js to use 1600x1600
2. Test legacy upload path
3. Deploy to production

### Phase 3: Quality Optimization (Low Risk, Staged)
1. Deploy to staging with auto:eco
2. Visual QA on mobile/desktop devices
3. Compare file sizes and quality
4. Deploy to production if acceptable
5. Monitor user feedback and metrics

### Rollback Plan
1. Configuration issues: Update env vars (5 minutes)
2. Quality issues: Revert CLOUDINARY_IMAGE_QUALITY to auto:good
3. All changes are non-destructive and reversible

## Timeline & Dependencies

### Timeline
- Story 1 (Config): 30 minutes development + 15 minutes testing
- Story 2 (Size Fix): 15 minutes development + 10 minutes testing
- Story 3 (Quality): 30 minutes development + 30 minutes testing
- **Total**: ~2 hours including documentation

### Dependencies
- Access to Netlify environment variables
- Access to staging environment for testing
- Multiple devices for visual QA (mobile, tablet, desktop)

## Related Work
- Epic: epic-cloudinary-nextjs-optimization (future responsive images)
- Epic: epic-photo-upload-orchestration (upload reliability)

## Stories
- STORY-CLOUD-001: Standardize Cloudinary transformation configuration with environment variables
- STORY-CLOUD-002: Fix image size inconsistency in legacy photo-upload endpoint
- STORY-CLOUD-003: Optimize image quality settings for mobile bandwidth savings

## References
- Cloudinary documentation: https://cloudinary.com/documentation/image_transformations
- Current implementation: netlify/functions/photo-upload*.js
- Client service: src/client/PhotoUploadService.ts
- Analysis document: [Comprehensive Cloudinary Analysis - see chat history]
