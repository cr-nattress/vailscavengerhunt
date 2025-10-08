# Troubleshooting: Pre-Populated Images Not Showing

## Issue: No Photo Shows in Stop Cards

### Root Cause Analysis

**Collection URLs do not work as direct image sources:**

1. ❌ Google Photos URL (`https://photos.app.goo.gl/...`) - Album page, not image
2. ❌ Cloudinary Collection URL (`https://collection.cloudinary.com/...`) - Gallery page, not image
3. ✅ Need **direct image URLs** like: `https://res.cloudinary.com/CLOUD/image/upload/IMAGE_ID`

**Why they don't work:**
- They're **page URLs** that display multiple images
- Cannot be embedded directly in `<img>` tags
- Browser tries to load HTML page as an image → fails

### What You're Seeing

```html
<!-- This won't work -->
<img src="https://photos.app.goo.gl/nBDjjNVW9ooZL2Mo6" />
<!-- Browser tries to load album page as image → fails -->
```

## Diagnostic Steps

### Step 1: Run Database Diagnostics

```bash
# In Supabase SQL Editor, run:
scripts/sql/debug-pre-populated-images.sql
```

This will check:
- ✅ Column exists
- ✅ URLs populated
- ✅ Hunt mode set correctly
- ✅ Function returns data

### Step 2: Check Browser Console

1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Look for errors like:
   ```
   Failed to load resource: the server responded with a status of 404
   GET https://photos.app.goo.gl/... net::ERR_FAILED
   ```

### Step 3: Check Network Tab

1. DevTools → **Network** tab
2. Filter by **Img**
3. Look for failed image requests
4. Check if `pre_populated_image_url` is being requested
5. Click failed request to see error details

### Step 4: Verify API Response

```bash
# Check if API returns pre_populated_image_url
curl "https://your-app.netlify.app/api/consolidated/active/mountain-adventures/summit-seekers/winter-2025" | jq '.locations.locations[0]'

# Should include:
{
  "id": "mountain-peak-viewpoint",
  "title": "Mountain Peak Viewpoint",
  "pre_populated_image_url": "https://...",
  ...
}
```

## Solutions

### Solution 1: Use Lorem Picsum (Quick Test)

Lorem Picsum provides random placeholder images via direct URLs.

```sql
-- Run in Supabase SQL Editor
UPDATE hunt_stops
SET pre_populated_image_url = 'https://picsum.photos/800/600?random=' || stop_id
WHERE stop_id IN (
  SELECT stop_id FROM hunt_configurations
  WHERE organization_id = 'mountain-adventures' AND hunt_id = 'winter-2025'
);
```

**Pros:**
- ✅ Works immediately
- ✅ No setup required
- ✅ Direct image URLs

**Cons:**
- ❌ Random/generic images
- ❌ Not themed to locations
- ❌ May change on refresh

### Solution 2: Use Unsplash Source API (Themed Images)

Unsplash provides themed placeholder images.

```sql
-- Run in Supabase SQL Editor
UPDATE hunt_stops SET pre_populated_image_url = 'https://source.unsplash.com/800x600/?mountain,peak' WHERE stop_id = 'mountain-peak-viewpoint';
UPDATE hunt_stops SET pre_populated_image_url = 'https://source.unsplash.com/800x600/?museum,history' WHERE stop_id = 'historic-mining-museum';
UPDATE hunt_stops SET pre_populated_image_url = 'https://source.unsplash.com/800x600/?waterfall,ice' WHERE stop_id = 'frozen-waterfall-trail';
UPDATE hunt_stops SET pre_populated_image_url = 'https://source.unsplash.com/800x600/?alpine,village' WHERE stop_id = 'alpine-village-square';
UPDATE hunt_stops SET pre_populated_image_url = 'https://source.unsplash.com/800x600/?skiing,nordic' WHERE stop_id = 'cross-country-ski-center';
UPDATE hunt_stops SET pre_populated_image_url = 'https://source.unsplash.com/800x600/?snowshoe,winter' WHERE stop_id = 'snowshoe-adventure-park';
UPDATE hunt_stops SET pre_populated_image_url = 'https://source.unsplash.com/800x600/?skating,ice' WHERE stop_id = 'ice-skating-rink';
UPDATE hunt_stops SET pre_populated_image_url = 'https://source.unsplash.com/800x600/?wildlife,elk' WHERE stop_id = 'wildlife-observation-point';
UPDATE hunt_stops SET pre_populated_image_url = 'https://source.unsplash.com/800x600/?hotspring,spa' WHERE stop_id = 'hot-springs-retreat';
UPDATE hunt_stops SET pre_populated_image_url = 'https://source.unsplash.com/800x600/?gondola,mountains' WHERE stop_id = 'summit-express-gondola';
```

**Pros:**
- ✅ High-quality images
- ✅ Themed to location keywords
- ✅ Direct URLs

**Cons:**
- ⚠️ Source API may be deprecated (check Unsplash docs)
- ❌ Images may change over time
- ❌ Not your actual locations

### Solution 3: Upload to Cloudinary (Production - Your Cloud)

**Best for production use. Your cloud name: `dfhxtcp4u`**

#### Step 1: Gather Images

1. Find or create 10 images for your locations
2. Name them clearly:
   - `mountain-peak-viewpoint.jpg`
   - `historic-mining-museum.jpg`
   - etc.

#### Step 2: Upload to Cloudinary

1. Go to: https://console.cloudinary.com/console/dfhxtcp4u/media_library
2. Create folder: `mountain-adventures/winter-2025/`
3. Upload all 10 images to this folder
4. Images will be accessible at: `https://res.cloudinary.com/dfhxtcp4u/image/upload/v1/mountain-adventures/winter-2025/FILENAME`

#### Step 3: Update Database

```sql
-- Your Cloudinary cloud name: dfhxtcp4u
UPDATE hunt_stops SET pre_populated_image_url = 'https://res.cloudinary.com/dfhxtcp4u/image/upload/v1/mountain-adventures/winter-2025/mountain-peak-viewpoint.jpg' WHERE stop_id = 'mountain-peak-viewpoint';
UPDATE hunt_stops SET pre_populated_image_url = 'https://res.cloudinary.com/dfhxtcp4u/image/upload/v1/mountain-adventures/winter-2025/historic-mining-museum.jpg' WHERE stop_id = 'historic-mining-museum';
UPDATE hunt_stops SET pre_populated_image_url = 'https://res.cloudinary.com/dfhxtcp4u/image/upload/v1/mountain-adventures/winter-2025/frozen-waterfall-trail.jpg' WHERE stop_id = 'frozen-waterfall-trail';
UPDATE hunt_stops SET pre_populated_image_url = 'https://res.cloudinary.com/dfhxtcp4u/image/upload/v1/mountain-adventures/winter-2025/alpine-village-square.jpg' WHERE stop_id = 'alpine-village-square';
UPDATE hunt_stops SET pre_populated_image_url = 'https://res.cloudinary.com/dfhxtcp4u/image/upload/v1/mountain-adventures/winter-2025/cross-country-ski-center.jpg' WHERE stop_id = 'cross-country-ski-center';
UPDATE hunt_stops SET pre_populated_image_url = 'https://res.cloudinary.com/dfhxtcp4u/image/upload/v1/mountain-adventures/winter-2025/snowshoe-adventure-park.jpg' WHERE stop_id = 'snowshoe-adventure-park';
UPDATE hunt_stops SET pre_populated_image_url = 'https://res.cloudinary.com/dfhxtcp4u/image/upload/v1/mountain-adventures/winter-2025/ice-skating-rink.jpg' WHERE stop_id = 'ice-skating-rink';
UPDATE hunt_stops SET pre_populated_image_url = 'https://res.cloudinary.com/dfhxtcp4u/image/upload/v1/mountain-adventures/winter-2025/wildlife-observation-point.jpg' WHERE stop_id = 'wildlife-observation-point';
UPDATE hunt_stops SET pre_populated_image_url = 'https://res.cloudinary.com/dfhxtcp4u/image/upload/v1/mountain-adventures/winter-2025/hot-springs-retreat.jpg' WHERE stop_id = 'hot-springs-retreat';
UPDATE hunt_stops SET pre_populated_image_url = 'https://res.cloudinary.com/dfhxtcp4u/image/upload/v1/mountain-adventures/winter-2025/summit-express-gondola.jpg' WHERE stop_id = 'summit-express-gondola';
```

#### Using Images from Your Existing Collection

If you already have images in the Cloudinary collection (`https://collection.cloudinary.com/dfhxtcp4u/643057ca4057d74ea2f6d1c9280c5bb5`):

1. Go to Media Library: https://console.cloudinary.com/console/dfhxtcp4u/media_library
2. Click on each image in your collection
3. Copy the **Public ID** (e.g., `folder/image-name`)
4. Build direct URL: `https://res.cloudinary.com/dfhxtcp4u/image/upload/v1/{PUBLIC_ID}`
5. Update database with these URLs

See `scripts/sql/use-cloudinary-collection.sql` for detailed instructions.

**Pros:**
- ✅ Your actual images
- ✅ Reliable CDN
- ✅ Optimized delivery
- ✅ Existing infrastructure

**Cons:**
- ⏱️ Requires image preparation
- ⏱️ Upload time

## Quick Fix for Testing

**Use this to test immediately:**

```sql
-- Single random image for all stops (just to test functionality)
UPDATE hunt_stops
SET pre_populated_image_url = 'https://picsum.photos/800/600?random=1'
WHERE stop_id IN (
  SELECT stop_id FROM hunt_configurations
  WHERE organization_id = 'mountain-adventures' AND hunt_id = 'winter-2025'
);
```

Then:
1. Refresh your app
2. Login with `SUMMIT2025`
3. You should now see placeholder images

## Verification Checklist

After applying a solution:

- [ ] Run `debug-pre-populated-images.sql` - all checks pass
- [ ] API returns `pre_populated_image_url` in response
- [ ] Browser console shows no image loading errors
- [ ] Network tab shows successful image requests (200 OK)
- [ ] Images display in stop cards
- [ ] Upload button is hidden
- [ ] Grayed camera icon shows "Photo viewing mode"

## Common Issues

### Issue: Images Still Not Showing After URL Fix

**Check 1: Browser Cache**
```bash
# Clear browser cache
Ctrl + Shift + Delete (Chrome/Edge)
Cmd + Shift + Delete (Mac)

# Or hard refresh
Ctrl + F5 (Windows)
Cmd + Shift + R (Mac)
```

**Check 2: API Cache**
The app caches location data for 5 minutes. Wait 5 minutes or restart dev server.

```bash
# Restart dev server
# Kill existing process
# npm run dev
```

**Check 3: CORS Issues**
Some image hosts block cross-origin requests. Check console for:
```
Access to image at '...' from origin '...' has been blocked by CORS policy
```

**Solution:** Use Cloudinary (no CORS issues)

### Issue: Images Show But Upload Button Still Visible

**Cause:** Frontend not detecting `pre_populated_image_url`

**Check:**
```javascript
// Browser console
// Find a stop card and inspect
console.log(stop)
// Should show: { ..., pre_populated_image_url: "https://..." }
```

**If missing:** API not returning the field
**If present:** Check StopCard.tsx logic (should be fixed)

### Issue: Placeholder Still Shows Instead of Image

**Cause:** Image URL is NULL or invalid

**Check database:**
```sql
SELECT stop_id, pre_populated_image_url
FROM hunt_stops
WHERE stop_id = 'mountain-peak-viewpoint';
```

**If NULL:** Run URL fix script
**If invalid URL:** Update to valid URL

## Testing Different Solutions

### Test 1: Lorem Picsum
```bash
# 1. Run fix-image-urls.sql (Option 1)
# 2. Wait 5 minutes for cache to clear
# 3. Refresh app
# 4. Expected: Random placeholder images
```

### Test 2: Unsplash
```bash
# 1. Run fix-image-urls.sql (Unsplash section)
# 2. Wait 5 minutes for cache to clear
# 3. Refresh app
# 4. Expected: Themed images (mountains, museums, etc.)
```

### Test 3: Cloudinary
```bash
# 1. Upload images to Cloudinary
# 2. Copy URLs
# 3. Run UPDATE statements with your URLs
# 4. Wait 5 minutes
# 5. Refresh app
# 6. Expected: Your actual images
```

## Recommended Approach

### For Testing (Now)
```sql
-- Quick test with Lorem Picsum
UPDATE hunt_stops
SET pre_populated_image_url = 'https://picsum.photos/800/600?random=' || stop_id
WHERE stop_id IN (
  SELECT stop_id FROM hunt_configurations
  WHERE organization_id = 'mountain-adventures' AND hunt_id = 'winter-2025'
);
```

### For Production (Later)
1. Gather 10 high-quality images
2. Upload to Cloudinary: `mountain-adventures/winter-2025/` folder
3. Update database with Cloudinary URLs
4. Verify images load correctly

## Support Files

- `scripts/sql/debug-pre-populated-images.sql` - Diagnostic queries
- `scripts/sql/fix-image-urls.sql` - URL fix options
- `scripts/sql/enable-pre-populated-images.sql` - Original setup (has bad URLs)
- `CHANGES.md` - Complete change summary

## Need Help?

1. **Check browser console** - Look for image loading errors
2. **Check API response** - Verify `pre_populated_image_url` is returned
3. **Check database** - Run diagnostic script
4. **Check image URL** - Copy URL and test in browser
5. **Try Lorem Picsum** - Quick test to verify functionality
