-- Use Cloudinary Collection Images for Pre-Populated Stops
-- Collection: https://collection.cloudinary.com/dfhxtcp4u/643057ca4057d74ea2f6d1c9280c5bb5

-- ============================================================================
-- PROBLEM: Collection URL vs Direct Image URL
-- ============================================================================

-- Collection URL (won't work in <img> tag):
-- https://collection.cloudinary.com/dfhxtcp4u/643057ca4057d74ea2f6d1c9280c5bb5

-- We need direct image URLs like:
-- https://res.cloudinary.com/dfhxtcp4u/image/upload/v1234567890/sample.jpg

-- ============================================================================
-- SOLUTION: Use Cloudinary Direct URLs
-- ============================================================================

-- If you know the public IDs of images in your collection, use this format:
-- https://res.cloudinary.com/{cloud_name}/image/upload/{public_id}

-- Your cloud name: dfhxtcp4u

-- ============================================================================
-- OPTION 1: Use Sample Images from Your Collection
-- ============================================================================

-- If your collection has images, you need to get their public IDs
-- You can find these by:
-- 1. Going to Cloudinary Media Library
-- 2. Clicking on each image
-- 3. Copying the "Public ID"

-- Example format (replace PUBLIC_ID with actual IDs):
/*
UPDATE hunt_stops SET pre_populated_image_url = 'https://res.cloudinary.com/dfhxtcp4u/image/upload/v1/PUBLIC_ID_1' WHERE stop_id = 'mountain-peak-viewpoint';
UPDATE hunt_stops SET pre_populated_image_url = 'https://res.cloudinary.com/dfhxtcp4u/image/upload/v1/PUBLIC_ID_2' WHERE stop_id = 'historic-mining-museum';
-- ... etc
*/

-- ============================================================================
-- OPTION 2: Use Cloudinary Sample Images (If Available)
-- ============================================================================

-- Cloudinary provides sample images that might be in your account
-- Try these sample public IDs:

UPDATE hunt_stops SET pre_populated_image_url = 'https://res.cloudinary.com/dfhxtcp4u/image/upload/sample' WHERE stop_id = 'mountain-peak-viewpoint';
UPDATE hunt_stops SET pre_populated_image_url = 'https://res.cloudinary.com/dfhxtcp4u/image/upload/sample_2' WHERE stop_id = 'historic-mining-museum';
UPDATE hunt_stops SET pre_populated_image_url = 'https://res.cloudinary.com/dfhxtcp4u/image/upload/sample_3' WHERE stop_id = 'frozen-waterfall-trail';
UPDATE hunt_stops SET pre_populated_image_url = 'https://res.cloudinary.com/dfhxtcp4u/image/upload/sample_4' WHERE stop_id = 'alpine-village-square';
UPDATE hunt_stops SET pre_populated_image_url = 'https://res.cloudinary.com/dfhxtcp4u/image/upload/sample_5' WHERE stop_id = 'cross-country-ski-center';
UPDATE hunt_stops SET pre_populated_image_url = 'https://res.cloudinary.com/dfhxtcp4u/image/upload/sample' WHERE stop_id = 'snowshoe-adventure-park';
UPDATE hunt_stops SET pre_populated_image_url = 'https://res.cloudinary.com/dfhxtcp4u/image/upload/sample_2' WHERE stop_id = 'ice-skating-rink';
UPDATE hunt_stops SET pre_populated_image_url = 'https://res.cloudinary.com/dfhxtcp4u/image/upload/sample_3' WHERE stop_id = 'wildlife-observation-point';
UPDATE hunt_stops SET pre_populated_image_url = 'https://res.cloudinary.com/dfhxtcp4u/image/upload/sample_4' WHERE stop_id = 'hot-springs-retreat';
UPDATE hunt_stops SET pre_populated_image_url = 'https://res.cloudinary.com/dfhxtcp4u/image/upload/sample_5' WHERE stop_id = 'summit-express-gondola';

-- ============================================================================
-- OPTION 3: Use Placeholder Service with Your Cloudinary Account
-- ============================================================================

-- Use Lorem Picsum but proxy through Cloudinary for consistent delivery
UPDATE hunt_stops
SET pre_populated_image_url = 'https://res.cloudinary.com/dfhxtcp4u/image/fetch/https://picsum.photos/800/600?random=' || stop_id,
    updated_at = NOW()
WHERE stop_id IN (
    'mountain-peak-viewpoint',
    'historic-mining-museum',
    'frozen-waterfall-trail',
    'alpine-village-square',
    'cross-country-ski-center',
    'snowshoe-adventure-park',
    'ice-skating-rink',
    'wildlife-observation-point',
    'hot-springs-retreat',
    'summit-express-gondola'
);

-- ============================================================================
-- HOW TO GET PUBLIC IDs FROM YOUR COLLECTION
-- ============================================================================

/*
To use images from your Cloudinary collection:

1. Go to: https://console.cloudinary.com/console/media_library
2. Find the images in your collection
3. Click on each image
4. Copy the "Public ID" (shown in the details panel)
5. Use the format: https://res.cloudinary.com/dfhxtcp4u/image/upload/v1/{PUBLIC_ID}

Example:
If public ID is: mountain-adventures/peak-view
URL would be: https://res.cloudinary.com/dfhxtcp4u/image/upload/v1/mountain-adventures/peak-view

Then run:
UPDATE hunt_stops
SET pre_populated_image_url = 'https://res.cloudinary.com/dfhxtcp4u/image/upload/v1/mountain-adventures/peak-view'
WHERE stop_id = 'mountain-peak-viewpoint';
*/

-- ============================================================================
-- RECOMMENDED: Upload Images to Cloudinary Folder
-- ============================================================================

/*
For best results:

1. Prepare 10 images for your stops
2. Go to Cloudinary Console: https://console.cloudinary.com
3. Click "Media Library"
4. Create folder: mountain-adventures/winter-2025
5. Upload all 10 images
6. Name them clearly:
   - mountain-peak-viewpoint.jpg
   - historic-mining-museum.jpg
   - frozen-waterfall-trail.jpg
   - alpine-village-square.jpg
   - cross-country-ski-center.jpg
   - snowshoe-adventure-park.jpg
   - ice-skating-rink.jpg
   - wildlife-observation-point.jpg
   - hot-springs-retreat.jpg
   - summit-express-gondola.jpg

7. Then update database:
*/

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

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT
  stop_id,
  title,
  pre_populated_image_url,
  CASE
    WHEN pre_populated_image_url LIKE 'https://res.cloudinary.com/%' THEN '✅ Valid Cloudinary URL'
    ELSE '❌ Invalid URL'
  END as status
FROM hunt_stops
WHERE stop_id IN (
  SELECT stop_id FROM hunt_configurations
  WHERE organization_id = 'mountain-adventures' AND hunt_id = 'winter-2025'
)
ORDER BY stop_id;

-- ============================================================================
-- QUICK TEST (Try This First)
-- ============================================================================

-- Test with Cloudinary's demo images
UPDATE hunt_stops
SET pre_populated_image_url = 'https://res.cloudinary.com/demo/image/upload/sample',
    updated_at = NOW()
WHERE stop_id = 'mountain-peak-viewpoint';

-- Then check if this image loads in your browser:
-- https://res.cloudinary.com/demo/image/upload/sample

-- If it works, you know the functionality is correct
-- Then replace with your actual image URLs
