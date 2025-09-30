# STORY-CLOUD-002: Fix Image Size Inconsistency in Legacy Endpoint

## Story Details
**Epic:** epic-cloudinary-image-optimization
**Priority:** MEDIUM
**Status:** NOT STARTED
**Estimated:** 30 minutes (15 min dev + 10 min testing + 5 min docs)
**Dependencies:** STORY-CLOUD-001 (should be completed first for consistent configuration)

## Context
The legacy photo upload endpoint (`netlify/functions/photo-upload.js`) currently uses 1200x1200 pixel dimensions, while the primary (`photo-upload-complete.js`) and advanced (`photo-upload-orchestrated.js`) endpoints use 1600x1600 pixels.

This inconsistency means:
- Users uploading through different paths get different quality images
- Leaderboards and galleries may show mixed quality levels
- Harder to maintain consistent UX expectations

### Current State
- **photo-upload.js**: 1200x1200 ❌
- **photo-upload-complete.js**: 1600x1600 ✅
- **photo-upload-orchestrated.js**: 1600x1600 ✅

## User Story
**As a** user
**I want** all my uploaded photos to be the same high quality
**So that** my scavenger hunt experience is consistent regardless of which upload method is used

## Acceptance Criteria
- [ ] `photo-upload.js` uses 1600x1600 dimensions (matching other endpoints)
- [ ] Legacy upload path produces same quality images as primary path
- [ ] No breaking changes to legacy upload API contract
- [ ] Images uploaded through legacy endpoint are visually consistent with other uploads
- [ ] Documentation updated to reflect consistent sizing

## Tasks

### 1. Update Legacy Endpoint Image Dimensions
- [ ] Modify `netlify/functions/photo-upload.js` to use 1600x1600
- [ ] If STORY-CLOUD-001 is complete, verify it uses env vars
- [ ] If STORY-CLOUD-001 is not complete, update hardcoded values
- [ ] Ensure quality settings also match other endpoints

**File:** `netlify/functions/photo-upload.js`

**Lines to modify:** ~59-60 (or ~55-62 for full transformation block)

**Current:**
```javascript
transformation: [
  {
    quality: 'auto:good',
    fetch_format: 'auto',
    width: 1200,          // ❌ Inconsistent
    height: 1200,         // ❌ Inconsistent
    crop: 'limit'
  }
]
```

**After (if STORY-CLOUD-001 complete):**
```javascript
transformation: [
  {
    quality: process.env.CLOUDINARY_IMAGE_QUALITY || 'auto:good',
    fetch_format: process.env.CLOUDINARY_FETCH_FORMAT || 'auto',
    width: parseInt(process.env.CLOUDINARY_IMAGE_WIDTH || '1600', 10),
    height: parseInt(process.env.CLOUDINARY_IMAGE_HEIGHT || '1600', 10),
    crop: process.env.CLOUDINARY_CROP_MODE || 'limit'
  }
]
```

**After (if STORY-CLOUD-001 not complete):**
```javascript
transformation: [
  {
    quality: 'auto:good',
    fetch_format: 'auto',
    width: 1600,          // ✅ Consistent
    height: 1600,         // ✅ Consistent
    crop: 'limit'
  }
]
```

### 2. Test Legacy Upload Path
- [ ] Start local development server: `netlify dev`
- [ ] Identify which UI flows use the legacy endpoint (if any)
- [ ] Upload a test photo through legacy path
- [ ] Verify image is 1600x1600 in Cloudinary dashboard
- [ ] Compare visual quality with photos from primary endpoint
- [ ] Ensure no errors in console or server logs

**Test Commands:**
```bash
# Start dev server
netlify dev

# Upload via legacy endpoint (if exposed to UI)
# Or use curl to test directly:
curl -X POST http://localhost:8888/.netlify/functions/photo-upload \
  -F "file=@test-image.jpg" \
  -F "stopTitle=Test Stop" \
  -F "sessionId=test-session-123"
```

### 3. Compare File Sizes
- [ ] Upload same source image through legacy endpoint before change
- [ ] Note file size and dimensions in Cloudinary
- [ ] Apply the change
- [ ] Upload same source image again
- [ ] Compare new file size and dimensions
- [ ] Document the increase (expected: ~77% larger due to 1600²/1200² ratio)

**Expected Results:**
- Old: 1200x1200 = 1,440,000 pixels
- New: 1600x1600 = 2,560,000 pixels
- Increase: ~78% more pixels, ~50-100% larger file size (depending on compression)

### 4. Update Documentation
- [ ] Update any references to image sizes in documentation
- [ ] Note that all endpoints now use consistent 1600x1600 size
- [ ] Document the quality improvement for legacy users

**Files to update:**
- `knowledge/ENVIRONMENT_SETUP.md` (if mentions specific sizes)
- `README.md` (if mentions image specifications)
- Any API documentation or endpoint descriptions

**Example update:**
```markdown
## Image Upload Endpoints

All upload endpoints now produce consistent 1600x1600 pixel images:
- `/api/photo-upload` (legacy): 1600x1600 ✅
- `/api/photo-upload-complete` (primary): 1600x1600 ✅
- `/api/photo-upload-orchestrated` (advanced): 1600x1600 ✅
```

### 5. Check for Client-Side Impacts
- [ ] Search for any client code that assumes 1200px dimensions
- [ ] Check CSS/styling for hardcoded 1200px values
- [ ] Verify responsive image sizing still works
- [ ] Ensure album/gallery views handle the larger images correctly

**Search Commands:**
```bash
grep -r "1200" src/ --include="*.ts" --include="*.tsx"
grep -r "1200px" src/ --include="*.css" --include="*.scss"
```

### 6. Monitor Cloudinary Usage
- [ ] Note current Cloudinary storage/bandwidth usage
- [ ] Deploy changes
- [ ] Monitor Cloudinary usage for 24-48 hours
- [ ] Verify no unexpected cost increases
- [ ] Document any significant changes in usage patterns

**Cloudinary Dashboard Checks:**
- Storage: Should see slight increase from new 1600px uploads
- Transformations: Should remain similar
- Bandwidth: May increase slightly if serving more 1600px originals

### 7. Staging and Production Deployment
- [ ] Deploy to staging environment
- [ ] Test legacy upload path in staging
- [ ] Verify image dimensions in Cloudinary staging account
- [ ] Get approval for production deployment
- [ ] Deploy to production
- [ ] Test production upload
- [ ] Monitor error logs for 1 hour post-deployment

## Verification Steps

### Pre-Deployment Verification
1. [ ] Code review confirms only size values changed
2. [ ] Local test shows 1600x1600 images being created
3. [ ] No breaking changes to API contract
4. [ ] File size increase is acceptable (50-100% larger)

### Post-Deployment Verification
1. [ ] Upload test photo through legacy endpoint in production
2. [ ] Check Cloudinary dashboard: verify 1600x1600 dimensions
3. [ ] View uploaded photo in UI: verify quality is good
4. [ ] Compare with photo from primary endpoint: should be identical quality
5. [ ] Check error logs: no new errors related to photo upload
6. [ ] Search codebase for 1200 references:
   ```bash
   grep -r "1200" netlify/functions/photo-*.js
   ```
   Should only return comments or non-dimension references

### Rollback Verification (if needed)
1. [ ] Change dimension back to 1200x1200
2. [ ] Redeploy
3. [ ] Verify rollback successful
4. [ ] Document reason for rollback

## Impact Analysis

### Positive Impacts
- **Consistency**: All upload paths produce same quality images
- **Quality**: Legacy users get 78% more pixels (better quality)
- **Maintenance**: Easier to reason about image sizing across codebase
- **UX**: No mixed quality levels in galleries/leaderboards

### Potential Concerns
- **File Size**: Images will be 50-100% larger
  - Mitigation: Modern compression and CDN delivery minimize impact
  - Mitigation: STORY-CLOUD-003 will optimize with auto:eco
- **Upload Time**: Slightly longer uploads for larger files
  - Mitigation: Difference is negligible on modern connections
- **Cloudinary Costs**: Minor increase in storage/bandwidth
  - Mitigation: Quality optimization in next story offsets this

## Definition of Done
- [ ] Legacy endpoint uses 1600x1600 dimensions
- [ ] All upload endpoints produce consistent image sizes
- [ ] Tests pass in local, staging, and production
- [ ] Documentation updated
- [ ] No breaking changes or regressions
- [ ] Cloudinary usage monitored and documented
- [ ] Changes deployed to production
- [ ] Production verified with test upload

## Notes
- This is a quality improvement with minimal risk
- Changes are easily reversible if issues arise
- File size increase is acceptable for quality consistency
- Next story (STORY-CLOUD-003) will optimize file sizes with better compression
