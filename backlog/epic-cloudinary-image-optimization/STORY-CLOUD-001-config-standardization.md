# STORY-CLOUD-001: Standardize Cloudinary Transformation Configuration

## Story Details
**Epic:** epic-cloudinary-image-optimization
**Priority:** HIGH
**Status:** NOT STARTED
**Estimated:** 1 hour (30 min dev + 15 min testing + 15 min docs)
**Dependencies:** None

## Context
Cloudinary transformation parameters (width, height, quality, format, crop mode) are currently hardcoded in 3 different upload endpoint files:
- `netlify/functions/photo-upload.js` (lines 55-62)
- `netlify/functions/photo-upload-complete.js` (lines 201-208)
- `netlify/functions/photo-upload-orchestrated.js` (lines 131-138)

This makes it difficult to:
- Adjust settings without editing multiple files
- A/B test different configurations
- Maintain consistency across endpoints
- Roll back changes quickly

## User Story
**As a** platform engineer
**I want to** configure Cloudinary transformation parameters via environment variables
**So that** I can easily adjust image settings across all upload endpoints without code changes

## Acceptance Criteria
- [ ] New environment variables added to `.env.example`:
  - `CLOUDINARY_IMAGE_WIDTH` (default: 1600)
  - `CLOUDINARY_IMAGE_HEIGHT` (default: 1600)
  - `CLOUDINARY_IMAGE_QUALITY` (default: auto:good)
  - `CLOUDINARY_FETCH_FORMAT` (default: auto)
  - `CLOUDINARY_CROP_MODE` (default: limit)
- [ ] All 3 upload endpoints read transformation params from env vars
- [ ] Defaults match current production settings (no behavior change)
- [ ] Missing env vars fall back to safe defaults
- [ ] Environment variables work in both local dev and production
- [ ] Documentation updated in `knowledge/ENVIRONMENT_SETUP.md`
- [ ] No hardcoded transformation values remain in upload functions

## Tasks

### 1. Add Environment Variables to Configuration
- [ ] Add new env vars to `.env.example` with defaults and descriptions
- [ ] Add new env vars to `.env` for local development
- [ ] Document each variable's purpose and valid values
- [ ] Add env vars to Netlify site settings for production

**Files to modify:**
- `.env.example` (add new variables)
- `knowledge/ENVIRONMENT_SETUP.md` (document new variables)

**Example addition to .env.example:**
```bash
# Cloudinary Image Transformation Settings
# Adjust these to control image size and quality for all uploads
CLOUDINARY_IMAGE_WIDTH=1600
CLOUDINARY_IMAGE_HEIGHT=1600
CLOUDINARY_IMAGE_QUALITY=auto:good  # Options: auto:good, auto:best, auto:eco, or specific value like 80
CLOUDINARY_FETCH_FORMAT=auto  # Auto-detect best format (WebP, AVIF, etc.)
CLOUDINARY_CROP_MODE=limit  # Limit: fit within bounds without cropping
```

### 2. Update photo-upload-complete.js (Primary Endpoint)
- [ ] Replace hardcoded transformation values with env var reads
- [ ] Add fallback defaults for missing env vars
- [ ] Ensure parseInt() for numeric values
- [ ] Test upload still works with env vars
- [ ] Test upload works with missing env vars (uses defaults)

**File:** `netlify/functions/photo-upload-complete.js`

**Lines to modify:** ~201-208

**Before:**
```javascript
transformation: [
  {
    quality: 'auto:good',
    fetch_format: 'auto',
    width: 1600,
    height: 1600,
    crop: 'limit'
  }
]
```

**After:**
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

### 3. Update photo-upload.js (Legacy Endpoint)
- [ ] Replace hardcoded transformation values with env var reads
- [ ] Match the pattern from photo-upload-complete.js
- [ ] Add fallback defaults for missing env vars
- [ ] Ensure parseInt() for numeric values

**File:** `netlify/functions/photo-upload.js`

**Lines to modify:** ~55-62

**Changes:** Same pattern as Task 2

### 4. Update photo-upload-orchestrated.js (Advanced Endpoint)
- [ ] Replace hardcoded transformation values with env var reads
- [ ] Match the pattern from photo-upload-complete.js
- [ ] Add fallback defaults for missing env vars
- [ ] Ensure parseInt() for numeric values

**File:** `netlify/functions/photo-upload-orchestrated.js`

**Lines to modify:** ~131-138

**Changes:** Same pattern as Task 2

### 5. Update consolidated-active.js Configuration Response
- [ ] Add new Cloudinary config variables to public config response
- [ ] Include in config object returned to client (if needed for client-side logic)
- [ ] Ensure no secrets are exposed

**File:** `netlify/functions/consolidated-active.js`

**Lines to modify:** ~158-173 (config object)

**Optional addition:**
```javascript
CLOUDINARY_IMAGE_WIDTH: parseInt(process.env.CLOUDINARY_IMAGE_WIDTH || '1600', 10),
CLOUDINARY_IMAGE_HEIGHT: parseInt(process.env.CLOUDINARY_IMAGE_HEIGHT || '1600', 10),
CLOUDINARY_IMAGE_QUALITY: process.env.CLOUDINARY_IMAGE_QUALITY || 'auto:good',
```

### 6. Update Documentation
- [ ] Add new environment variables to `knowledge/ENVIRONMENT_SETUP.md`
- [ ] Document valid values for each variable
- [ ] Explain impact of changing each variable
- [ ] Include examples of common configurations
- [ ] Add troubleshooting section for image quality/size issues

**File:** `knowledge/ENVIRONMENT_SETUP.md`

**Section to add:** "Cloudinary Image Configuration"

**Content:**
```markdown
## Cloudinary Image Configuration

### Image Transformation Settings

Control the size and quality of uploaded images:

| Variable | Default | Description | Valid Values |
|----------|---------|-------------|--------------|
| `CLOUDINARY_IMAGE_WIDTH` | 1600 | Max width in pixels | Any positive integer |
| `CLOUDINARY_IMAGE_HEIGHT` | 1600 | Max height in pixels | Any positive integer |
| `CLOUDINARY_IMAGE_QUALITY` | auto:good | Image quality setting | auto:good, auto:best, auto:eco, 1-100 |
| `CLOUDINARY_FETCH_FORMAT` | auto | Output format | auto, jpg, png, webp, avif |
| `CLOUDINARY_CROP_MODE` | limit | How to fit images | limit, fill, fit, scale |

#### Quality Settings Explained

- **auto:good**: Balanced quality and size (default)
- **auto:best**: Highest quality, larger files
- **auto:eco**: Aggressive compression, 50-80% smaller files
- **Numeric (1-100)**: Manual quality control

#### Common Configurations

**High Quality (Photography Portfolio):**
```bash
CLOUDINARY_IMAGE_QUALITY=auto:best
CLOUDINARY_IMAGE_WIDTH=2400
CLOUDINARY_IMAGE_HEIGHT=2400
```

**Balanced (Default, Recommended):**
```bash
CLOUDINARY_IMAGE_QUALITY=auto:good
CLOUDINARY_IMAGE_WIDTH=1600
CLOUDINARY_IMAGE_HEIGHT=1600
```

**Mobile Optimized (Lower Bandwidth):**
```bash
CLOUDINARY_IMAGE_QUALITY=auto:eco
CLOUDINARY_IMAGE_WIDTH=1200
CLOUDINARY_IMAGE_HEIGHT=1200
```
```

### 7. Testing
- [ ] Test photo upload with default env var values
- [ ] Test photo upload with custom env var values
- [ ] Test photo upload with missing env vars (verify defaults work)
- [ ] Verify image dimensions match configured size
- [ ] Verify image quality matches configured setting
- [ ] Test in local development (netlify dev)
- [ ] Test in staging environment
- [ ] Verify no breaking changes to existing functionality

**Test Script:**
```bash
# 1. Test with defaults
npm run build
netlify dev
# Upload a photo through the UI, verify it works

# 2. Test with custom values
# Add to .env:
# CLOUDINARY_IMAGE_WIDTH=800
# CLOUDINARY_IMAGE_HEIGHT=800
# CLOUDINARY_IMAGE_QUALITY=auto:best

# Restart server
netlify dev
# Upload a photo, check Cloudinary dashboard for 800x800 size

# 3. Test with missing values
# Remove env vars from .env
# Restart server
netlify dev
# Upload a photo, verify it defaults to 1600x1600
```

### 8. Deployment
- [ ] Add environment variables to Netlify production site settings
- [ ] Deploy changes to staging first
- [ ] Verify uploads work in staging
- [ ] Deploy to production
- [ ] Monitor error logs for any issues
- [ ] Verify a test upload in production

**Netlify Environment Variables:**
```bash
CLOUDINARY_IMAGE_WIDTH=1600
CLOUDINARY_IMAGE_HEIGHT=1600
CLOUDINARY_IMAGE_QUALITY=auto:good
CLOUDINARY_FETCH_FORMAT=auto
CLOUDINARY_CROP_MODE=limit
```

## Verification Steps
1. [ ] Run `netlify dev` locally
2. [ ] Upload a test photo through the UI
3. [ ] Check Cloudinary dashboard to verify:
   - Image dimensions match `CLOUDINARY_IMAGE_WIDTH` x `CLOUDINARY_IMAGE_HEIGHT`
   - Quality setting is applied
   - Format is optimized (WebP/AVIF if supported)
4. [ ] Change env vars to different values
5. [ ] Restart server and upload another photo
6. [ ] Verify new settings are applied
7. [ ] Search codebase for hardcoded transformation values:
   ```bash
   grep -r "quality: 'auto:good'" netlify/functions/photo-*.js
   grep -r "width: 1600" netlify/functions/photo-*.js
   ```
   Should return 0 results
8. [ ] Deploy to staging and test
9. [ ] Deploy to production and verify

## Definition of Done
- [ ] All transformation parameters read from environment variables
- [ ] All 3 upload endpoints use the same configuration source
- [ ] Defaults match current production behavior (no regression)
- [ ] Documentation is complete and accurate
- [ ] All tests pass
- [ ] No hardcoded transformation values remain
- [ ] Changes deployed to production
- [ ] Production upload verified

## Notes
- This is a configuration-only change with no functional behavior change when using default values
- Risk is very low as changes are easily reversible via environment variables
- Future stories will leverage this configuration flexibility to optimize settings
