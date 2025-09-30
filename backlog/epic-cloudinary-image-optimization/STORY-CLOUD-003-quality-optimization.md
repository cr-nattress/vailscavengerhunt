# STORY-CLOUD-003: Optimize Image Quality Settings for Mobile Bandwidth Savings

## Story Details
**Epic:** epic-cloudinary-image-optimization
**Priority:** HIGH
**Status:** NOT STARTED
**Estimated:** 1 hour (30 min dev + 30 min testing + QA)
**Dependencies:** STORY-CLOUD-001 (configuration must be in place)

## Context
Currently, all uploaded images use Cloudinary's `quality: auto:good` setting, which provides balanced quality but doesn't maximize bandwidth savings. Cloudinary's `quality: auto:eco` setting can reduce file sizes by 50-80% with minimal perceptible quality loss, especially on mobile devices.

### Current State
- Quality setting: `auto:good` across all endpoints
- Average file size: ~500KB - 2MB per image
- Mobile users download full-size images over cellular data

### Proposed State
- Quality setting: `auto:eco` (via CLOUDINARY_IMAGE_QUALITY env var)
- Expected file size: ~150KB - 600KB per image (50-70% reduction)
- Significantly faster page loads on mobile
- Lower data costs for users

## User Story
**As a** mobile user on cellular data
**I want** photos to load quickly without consuming excessive data
**So that** I can enjoy the scavenger hunt experience without worrying about data limits or slow connections

## Acceptance Criteria
- [ ] Quality setting changed to `auto:eco` via environment variable
- [ ] File sizes reduced by 50%+ compared to current uploads
- [ ] Visual quality remains acceptable on mobile and desktop devices
- [ ] No breaking changes to upload functionality
- [ ] A/B testing capability via environment variable
- [ ] Documentation includes before/after comparisons
- [ ] Easy rollback mechanism (env var change only)

## Tasks

### 1. Update Environment Variable Configuration
- [ ] Change `CLOUDINARY_IMAGE_QUALITY` to `auto:eco` in staging environment
- [ ] Document the change and rationale
- [ ] Prepare rollback plan (set back to `auto:good`)

**Files to update:**
- `.env` (local development)
- Netlify environment variables (staging)
- Netlify environment variables (production - after testing)

**Change:**
```bash
# Before
CLOUDINARY_IMAGE_QUALITY=auto:good

# After
CLOUDINARY_IMAGE_QUALITY=auto:eco
```

### 2. Test Image Quality on Multiple Devices
- [ ] Upload test photos in staging with `auto:eco` setting
- [ ] Compare with existing `auto:good` photos
- [ ] Test on multiple device types:
  - [ ] iPhone (Safari)
  - [ ] Android phone (Chrome)
  - [ ] iPad/tablet
  - [ ] Desktop (Chrome, Firefox, Safari)
- [ ] Test on different connection speeds (4G, WiFi, slow 3G simulation)
- [ ] Document visual quality differences
- [ ] Get stakeholder approval on quality

**Test Images:**
Upload diverse test images:
- Outdoor photos with complex details
- Indoor photos with low light
- Photos with text/signage
- Group photos with faces
- Landscape photos

**Quality Assessment Checklist:**
- [ ] Text remains readable
- [ ] No obvious compression artifacts
- [ ] Colors appear natural
- [ ] Details preserved in shadows and highlights
- [ ] No banding in gradients
- [ ] Acceptable for user-generated content

### 3. Measure File Size Reduction
- [ ] Upload same test images with both quality settings
- [ ] Record file sizes for each
- [ ] Calculate percentage reduction
- [ ] Document bandwidth savings
- [ ] Estimate cost savings (Cloudinary + CDN bandwidth)

**Measurement Template:**
```markdown
| Test Image | auto:good (KB) | auto:eco (KB) | Reduction (%) |
|------------|----------------|---------------|---------------|
| outdoor-1  | 1,200          | 350           | 71%           |
| indoor-1   | 800            | 280           | 65%           |
| group-1    | 1,500          | 450           | 70%           |
| landscape-1| 2,000          | 600           | 70%           |
| **Average**| **1,375**      | **420**       | **69%**       |
```

### 4. Performance Testing
- [ ] Test page load times with `auto:eco` images
- [ ] Compare with `auto:good` baseline
- [ ] Test gallery/album view with multiple images
- [ ] Test on slow 3G connection (Chrome DevTools simulation)
- [ ] Measure Largest Contentful Paint (LCP) improvement
- [ ] Document performance improvements

**Metrics to Track:**
- Page load time (full page with images)
- Time to first image render
- LCP (Largest Contentful Paint)
- Total bytes transferred
- Number of users on mobile vs desktop

**Performance Test Script:**
```javascript
// Use Chrome DevTools > Network > Throttling
// Settings: Slow 3G (400ms RTT, 400kbps down, 400kbps up)

// Test scenarios:
// 1. Single image load (stop detail view)
// 2. Gallery with 10 images (history view)
// 3. Leaderboard with team photos
```

### 5. A/B Testing Preparation (Optional)
- [ ] Create feature flag mechanism for quality setting
- [ ] Allow per-request quality override (optional)
- [ ] Set up logging for quality setting usage
- [ ] Prepare metrics dashboard

**Implementation (if doing A/B test):**
```javascript
// In upload function
const isMobile = event.headers['sec-ch-ua-mobile'] === '?1';
const quality = isMobile
  ? (process.env.CLOUDINARY_IMAGE_QUALITY_MOBILE || 'auto:eco')
  : (process.env.CLOUDINARY_IMAGE_QUALITY || 'auto:good');
```

**Environment Variables for A/B:**
```bash
CLOUDINARY_IMAGE_QUALITY=auto:good  # Desktop default
CLOUDINARY_IMAGE_QUALITY_MOBILE=auto:eco  # Mobile default
```

### 6. Update Documentation
- [ ] Add quality optimization details to `knowledge/ENVIRONMENT_SETUP.md`
- [ ] Document before/after file size comparisons
- [ ] Include visual quality comparison screenshots
- [ ] Document rollback procedure
- [ ] Add troubleshooting guide for quality issues

**Documentation Update:**
```markdown
## Image Quality Optimization

### Current Configuration
- **Quality Setting**: `auto:eco`
- **Average File Size**: ~420KB (69% reduction from previous)
- **Bandwidth Savings**: ~70% for image downloads
- **Visual Quality**: Optimized for web/mobile viewing

### Quality Settings Comparison

| Setting | File Size | Quality | Use Case |
|---------|-----------|---------|----------|
| auto:best | 100% | Highest | Photography portfolios |
| auto:good | ~60% | High | General purpose |
| **auto:eco** | **~30%** | **Good** | **Web/mobile (current)** |
| 80 (numeric) | ~40% | Medium | Manual control |

### Before/After Comparison
- **Before (auto:good)**: 1.2MB average
- **After (auto:eco)**: 350KB average
- **Reduction**: 71%
- **Quality Impact**: Minimal, not visible on typical displays

### Visual Quality Examples
[Include screenshots comparing auto:good vs auto:eco]

### Rollback Procedure
If quality issues are reported:
1. Update Netlify environment variable:
   ```
   CLOUDINARY_IMAGE_QUALITY=auto:good
   ```
2. Redeploy or wait for next deploy (env vars are live immediately)
3. Clear Cloudinary cache if needed (rarely necessary)
```

### 7. Gradual Rollout Strategy
- [ ] Deploy to staging environment first
- [ ] Run for 48 hours with internal team testing
- [ ] Gather feedback on quality
- [ ] Deploy to production during low-traffic period
- [ ] Monitor error logs and user feedback
- [ ] Have rollback ready (env var change)

**Rollout Timeline:**
1. **Day 0**: Deploy to staging, internal testing
2. **Day 2**: Review feedback, deploy to production
3. **Day 3**: Monitor metrics, gather user feedback
4. **Day 7**: Review success metrics, document findings

### 8. Monitoring and Metrics
- [ ] Monitor Cloudinary usage dashboard (bandwidth, storage)
- [ ] Track user complaints/feedback about image quality
- [ ] Measure page load performance improvements
- [ ] Track mobile vs desktop usage patterns
- [ ] Calculate cost savings (bandwidth reduction)

**Metrics to Track:**
```markdown
### Week 1 Results (auto:eco)
- Average file size: 420KB (was 1,375KB)
- Bandwidth reduction: 69%
- Cloudinary bandwidth cost: $XX (was $YY, saved $ZZ)
- User complaints: 0
- Page load time: -35% (improvement)
- Mobile user satisfaction: +X% (survey)
```

**Cloudinary Dashboard Checks:**
- Navigate to: Cloudinary Dashboard > Analytics
- Check: Bandwidth usage over time
- Check: Storage costs
- Check: Transformation counts
- Expected: 50-70% reduction in bandwidth

### 9. Client-Side Verification
- [ ] Verify no client-side code assumes specific file sizes
- [ ] Check that responsive image sizing still works
- [ ] Test image caching behavior
- [ ] Verify no hardcoded quality assumptions

**Code Search:**
```bash
# Search for quality-related assumptions
grep -r "auto:good" src/
grep -r "auto:eco" src/
grep -r "quality" src/ --include="*.ts" --include="*.tsx"
```

### 10. Production Deployment
- [ ] Get stakeholder approval after staging tests
- [ ] Schedule deployment during low-traffic window
- [ ] Update Netlify production environment variable
- [ ] Monitor deployment for 1 hour post-change
- [ ] Verify test upload uses new quality setting
- [ ] Document deployment time and results

**Deployment Checklist:**
```markdown
- [ ] Staging tested for 48 hours
- [ ] Quality approved by stakeholders
- [ ] File size reduction confirmed (>50%)
- [ ] No user complaints in staging
- [ ] Rollback plan ready
- [ ] Deployment scheduled
- [ ] Team notified
- [ ] Monitoring dashboard ready
```

## Verification Steps

### Pre-Deployment
1. [ ] Verify STORY-CLOUD-001 is complete (env var config in place)
2. [ ] Test in local development with `auto:eco`
3. [ ] Upload test images and verify quality
4. [ ] Measure file size reduction (>50%)
5. [ ] Visual QA on multiple devices
6. [ ] Get approval from product owner

### Staging Verification
1. [ ] Deploy to staging environment
2. [ ] Set `CLOUDINARY_IMAGE_QUALITY=auto:eco` in Netlify staging
3. [ ] Upload test photos through staging UI
4. [ ] Verify in Cloudinary dashboard:
   - Quality is `auto:eco`
   - File sizes are 50-70% smaller
   - Images look good
5. [ ] Test on mobile devices (real devices, not just emulation)
6. [ ] Gather feedback from 3-5 team members
7. [ ] Document any quality concerns
8. [ ] Address concerns or proceed to production

### Production Verification
1. [ ] Update `CLOUDINARY_IMAGE_QUALITY=auto:eco` in Netlify production
2. [ ] Wait 5 minutes for env var propagation
3. [ ] Upload test photo in production
4. [ ] Check Cloudinary dashboard for new upload
5. [ ] Verify quality setting and file size
6. [ ] View photo in production UI
7. [ ] Test on mobile device over cellular data
8. [ ] Monitor error logs for 1 hour
9. [ ] Check user feedback channels for 24 hours

### Success Criteria Validation
- [ ] File sizes reduced by 50%+ ✅
- [ ] No increase in error rates ✅
- [ ] Visual quality acceptable ✅
- [ ] No user complaints ✅
- [ ] Page load times improved ✅
- [ ] Cloudinary costs reduced ✅

## Impact Analysis

### Positive Impacts
- **Bandwidth Savings**: 50-80% reduction in image download size
- **Faster Load Times**: Especially on mobile/slow connections
- **Cost Savings**: Reduced Cloudinary bandwidth costs
- **Better UX**: Faster app performance on mobile
- **Data Savings**: Lower data usage for users on cellular

### Potential Concerns
- **Quality Perception**: Some users may notice quality reduction
  - Mitigation: Testing shows minimal perceptual difference
  - Mitigation: Easy rollback via env var
- **Edge Cases**: Some photo types may compress poorly
  - Mitigation: Monitor feedback and rollback if needed
- **Desktop Users**: May prefer higher quality
  - Mitigation: Can implement device-specific quality (A/B testing)

### Metrics Targets
- File size reduction: **>50%** (target: 65-70%)
- Page load improvement: **>20%** (target: 30-40%)
- User complaints: **<1%** of users
- Quality score: **>4/5** in user testing

## Definition of Done
- [ ] Quality setting changed to `auto:eco`
- [ ] File sizes reduced by 50%+ verified
- [ ] Visual quality tested on 5+ devices
- [ ] Stakeholder approval obtained
- [ ] Documentation updated with comparisons
- [ ] Deployed to production
- [ ] Production upload verified
- [ ] Monitoring dashboard shows improvements
- [ ] No regression in user experience
- [ ] Team trained on rollback procedure

## Rollback Plan

### When to Rollback
- User complaints about image quality exceed 2% of uploads
- Stakeholder determines quality is unacceptable
- Technical issues with auto:eco setting
- Unexpected cost increase (unlikely)

### How to Rollback (5 minutes)
1. Go to Netlify site settings > Environment variables
2. Change `CLOUDINARY_IMAGE_QUALITY` from `auto:eco` to `auto:good`
3. No redeploy needed (env vars are live)
4. Upload test photo to verify rollback
5. Notify team of rollback
6. Document reason for rollback

### Post-Rollback Actions
- [ ] Investigate root cause of quality issues
- [ ] Consider alternative quality settings (auto:good, numeric values)
- [ ] Re-test with different images
- [ ] Consider device-specific quality settings
- [ ] Document lessons learned

## Notes
- This change has the highest impact of all three stories (50-80% bandwidth savings)
- Risk is low due to easy rollback mechanism
- Quality difference is minimal on typical viewing devices
- Can be enhanced with device-specific quality in future iteration
- Consider A/B testing if quality concerns arise during initial testing
