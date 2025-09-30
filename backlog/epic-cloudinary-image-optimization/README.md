# Epic: Cloudinary Image Optimization

**Status**: Proposed
**Owner**: Platform Team
**Estimated Total**: 2.5 hours
**Priority**: High

## Overview
This epic contains three low-risk, high-value improvements to the Cloudinary image upload configuration. The changes focus on consistency, maintainability, and bandwidth optimization with minimal code changes.

## Epic Goal
Optimize Cloudinary image upload configuration for consistency, performance, and bandwidth savings with minimal risk.

## Business Value
- **Cost Savings**: 50-80% reduction in bandwidth costs
- **Better UX**: Faster page loads, especially on mobile
- **Consistency**: All users get same quality experience
- **Maintainability**: Easy to adjust settings without code changes

## Stories

### 🥇 [STORY-CLOUD-001](./STORY-CLOUD-001-config-standardization.md): Standardize Configuration
**Priority**: HIGH | **Effort**: 1 hour | **Risk**: Very Low

Move hardcoded transformation parameters to environment variables for easier configuration management.

**Benefits**:
- One place to change all upload settings
- Easy A/B testing of configurations
- Quick rollback capability
- Consistent across all endpoints

**Files Modified**:
- `.env.example` (add variables)
- `netlify/functions/photo-upload.js`
- `netlify/functions/photo-upload-complete.js`
- `netlify/functions/photo-upload-orchestrated.js`
- `knowledge/ENVIRONMENT_SETUP.md`

**Tasks**:
- [ ] Add environment variables to config
- [ ] Update 3 upload endpoints to read from env vars
- [ ] Add defaults for missing values
- [ ] Test with various configurations
- [ ] Update documentation
- [ ] Deploy to staging
- [ ] Deploy to production

---

### 🥈 [STORY-CLOUD-002](./STORY-CLOUD-002-size-consistency.md): Fix Size Inconsistency
**Priority**: MEDIUM | **Effort**: 30 minutes | **Risk**: Very Low

Standardize legacy endpoint to use 1600x1600 like other endpoints (currently uses 1200x1200).

**Benefits**:
- Consistent image quality across all upload paths
- Better quality for legacy endpoint users
- Simpler mental model (one size for all)

**Files Modified**:
- `netlify/functions/photo-upload.js` (lines 59-60)

**Tasks**:
- [ ] Change dimensions from 1200x1200 to 1600x1600
- [ ] Test legacy upload path
- [ ] Verify quality improvement
- [ ] Update documentation
- [ ] Deploy to production

---

### 🥉 [STORY-CLOUD-003](./STORY-CLOUD-003-quality-optimization.md): Optimize Quality
**Priority**: HIGH | **Effort**: 1 hour | **Risk**: Low

Change quality setting from `auto:good` to `auto:eco` for 50-80% bandwidth savings.

**Benefits**:
- 50-80% smaller file sizes
- Faster page loads on mobile
- Lower data costs for users
- Reduced bandwidth costs

**Files Modified**:
- Environment variables only (no code changes!)

**Tasks**:
- [ ] Change `CLOUDINARY_IMAGE_QUALITY` to `auto:eco`
- [ ] Test visual quality on multiple devices
- [ ] Measure file size reduction
- [ ] Get stakeholder approval
- [ ] Deploy to staging
- [ ] Monitor for 48 hours
- [ ] Deploy to production
- [ ] Monitor and document results

---

## Implementation Strategy

### Phase 1: Configuration Foundation (STORY-CLOUD-001)
Do this first to enable easy configuration of subsequent stories.

**Timeline**: Day 1
**Risk**: Very Low
**Rollback**: Change env vars back

### Phase 2: Size Consistency (STORY-CLOUD-002)
Quick win after configuration is in place.

**Timeline**: Day 1 (after Phase 1)
**Risk**: Very Low
**Rollback**: Change env vars or code

### Phase 3: Quality Optimization (STORY-CLOUD-003)
Highest impact, needs more testing and QA.

**Timeline**: Day 2-3
**Risk**: Low
**Rollback**: Change env var back to `auto:good`

## Success Metrics

### Story 1: Configuration
- ✅ 0 hardcoded transformation values in code
- ✅ Configuration change takes <5 minutes
- ✅ All endpoints use same configuration source

### Story 2: Consistency
- ✅ 100% of uploads use 1600x1600 (currently 67%)
- ✅ Consistent quality across all upload paths
- ✅ No quality complaints from users

### Story 3: Quality
- ✅ >50% file size reduction (target: 65-70%)
- ✅ >20% page load improvement (target: 30-40%)
- ✅ <1% user complaints about quality
- ✅ Quality score >4/5 in testing

## Overall Success Criteria
- [ ] All transformation parameters configurable via env vars
- [ ] All endpoints use 1600x1600 consistently
- [ ] Image file sizes reduced by 50%+
- [ ] No degradation in user experience
- [ ] Page load times improved by 20%+
- [ ] Changes deployed to production
- [ ] Documentation complete
- [ ] Team trained on new configuration

## Risk Assessment

### Overall Risk: LOW

**Configuration Risk (Story 1)**: Very Low
- No functional changes, just moves values to env vars
- Defaults match current behavior
- Easily reversible

**Size Consistency Risk (Story 2)**: Very Low
- Quality improvement only
- May slightly increase file sizes (offset by Story 3)
- Easily reversible

**Quality Optimization Risk (Story 3)**: Low
- Most impactful change
- Requires visual QA
- Easily reversible via env var
- Staged rollout minimizes risk

## Dependencies
- Access to Netlify environment variables
- Access to Cloudinary dashboard for verification
- Multiple devices for testing (mobile, tablet, desktop)
- Staging environment for testing

## Quick Start

### For Story 1 (Config):
```bash
# 1. Add to .env
CLOUDINARY_IMAGE_WIDTH=1600
CLOUDINARY_IMAGE_HEIGHT=1600
CLOUDINARY_IMAGE_QUALITY=auto:good
CLOUDINARY_FETCH_FORMAT=auto
CLOUDINARY_CROP_MODE=limit

# 2. Update 3 upload function files (see story for details)

# 3. Test
netlify dev
# Upload a photo, verify it works
```

### For Story 2 (Size):
```bash
# Just update photo-upload.js lines 59-60:
width: 1600,  # was 1200
height: 1600, # was 1200
```

### For Story 3 (Quality):
```bash
# Just change env var in Netlify:
CLOUDINARY_IMAGE_QUALITY=auto:eco  # was auto:good
```

## Testing Checklist

### All Stories
- [ ] Local development works (`netlify dev`)
- [ ] Staging deployment successful
- [ ] Production deployment successful
- [ ] Test upload completes successfully
- [ ] Cloudinary dashboard shows correct settings
- [ ] No errors in logs
- [ ] Documentation updated

### Story-Specific
- [ ] Story 1: Config changes work, defaults work
- [ ] Story 2: Images are 1600x1600
- [ ] Story 3: File sizes reduced >50%, quality acceptable

## Rollback Procedures

### Story 1 (Config)
**Time**: 5 minutes
**Method**: Change env vars back, or rollback code deploy

### Story 2 (Size)
**Time**: 5 minutes
**Method**: Change env var back to 1200, or rollback code

### Story 3 (Quality)
**Time**: 1 minute
**Method**: Change `CLOUDINARY_IMAGE_QUALITY` to `auto:good`

## Next Steps (Future Enhancements)
These are out of scope for this epic but could be future stories:

1. **Responsive Images**: Generate multiple sizes at upload
2. **Eager Transformations**: Pre-generate thumbnails
3. **Upload Progress**: Show progress bar for large uploads
4. **Device-Specific Quality**: Different quality for mobile vs desktop
5. **Lazy Loading**: Implement lazy loading for images
6. **Image Optimization Audit**: Regular review of settings

## Resources
- [Cloudinary Transformation Documentation](https://cloudinary.com/documentation/image_transformations)
- [Cloudinary Quality Optimization Guide](https://cloudinary.com/documentation/image_optimization)
- [Epic Document](./epic.md)
- Story Documents: See links above

## Questions or Issues?
- Review the epic document for detailed context
- Check individual story documents for specific tasks
- Test in local environment first: `netlify dev`
- All changes are reversible via environment variables

---

**Ready to start?** Begin with [STORY-CLOUD-001](./STORY-CLOUD-001-config-standardization.md)
