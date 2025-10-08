-- Fix Pre-Populated Image URLs
-- The Google Photos shared album URL won't work as a direct image source
-- We need direct image URLs

-- ============================================================================
-- PROBLEM: Google Photos URLs Don't Work as Direct Images
-- ============================================================================

-- Google Photos shared album URL:
-- https://photos.app.goo.gl/nBDjjNVW9ooZL2Mo6
-- This opens a photo album page, NOT a direct image

-- We need direct image URLs like:
-- https://example.com/image.jpg

-- ============================================================================
-- TEMPORARY SOLUTION: Use Placeholder Images from Public CDNs
-- ============================================================================

-- Option 1: Use Lorem Picsum (free placeholder images)
UPDATE hunt_stops
SET pre_populated_image_url = 'https://picsum.photos/800/600?random=' || FLOOR(RANDOM() * 1000)::TEXT
WHERE stop_id IN (
  SELECT stop_id FROM hunt_configurations
  WHERE organization_id = 'mountain-adventures' AND hunt_id = 'winter-2025'
);

-- Option 2: Use specific placeholder images for each stop
UPDATE hunt_stops SET pre_populated_image_url = 'https://picsum.photos/800/600?mountain' WHERE stop_id = 'mountain-peak-viewpoint';
UPDATE hunt_stops SET pre_populated_image_url = 'https://picsum.photos/800/600?museum' WHERE stop_id = 'historic-mining-museum';
UPDATE hunt_stops SET pre_populated_image_url = 'https://picsum.photos/800/600?waterfall' WHERE stop_id = 'frozen-waterfall-trail';
UPDATE hunt_stops SET pre_populated_image_url = 'https://picsum.photos/800/600?village' WHERE stop_id = 'alpine-village-square';
UPDATE hunt_stops SET pre_populated_image_url = 'https://picsum.photos/800/600?ski' WHERE stop_id = 'cross-country-ski-center';
UPDATE hunt_stops SET pre_populated_image_url = 'https://picsum.photos/800/600?snowshoe' WHERE stop_id = 'snowshoe-adventure-park';
UPDATE hunt_stops SET pre_populated_image_url = 'https://picsum.photos/800/600?ice' WHERE stop_id = 'ice-skating-rink';
UPDATE hunt_stops SET pre_populated_image_url = 'https://picsum.photos/800/600?wildlife' WHERE stop_id = 'wildlife-observation-point';
UPDATE hunt_stops SET pre_populated_image_url = 'https://picsum.photos/800/600?hotspring' WHERE stop_id = 'hot-springs-retreat';
UPDATE hunt_stops SET pre_populated_image_url = 'https://picsum.photos/800/600?gondola' WHERE stop_id = 'summit-express-gondola';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT
  stop_id,
  title,
  pre_populated_image_url
FROM hunt_stops
WHERE stop_id IN (
  SELECT stop_id FROM hunt_configurations
  WHERE organization_id = 'mountain-adventures' AND hunt_id = 'winter-2025'
)
ORDER BY stop_id;

-- ============================================================================
-- PRODUCTION SOLUTION: Upload to Cloudinary
-- ============================================================================

/*
For production, upload real images to Cloudinary:

1. Gather or create 10 images (mountains, landmarks, etc.)
2. Upload to Cloudinary:
   - Go to Cloudinary dashboard
   - Upload images to folder: mountain-adventures/winter-2025/
   - Copy URLs

3. Update database:

UPDATE hunt_stops SET pre_populated_image_url = 'https://res.cloudinary.com/YOUR_CLOUD/image/upload/v1/mountain-adventures/winter-2025/mountain-peak-viewpoint.jpg' WHERE stop_id = 'mountain-peak-viewpoint';
UPDATE hunt_stops SET pre_populated_image_url = 'https://res.cloudinary.com/YOUR_CLOUD/image/upload/v1/mountain-adventures/winter-2025/historic-mining-museum.jpg' WHERE stop_id = 'historic-mining-museum';
UPDATE hunt_stops SET pre_populated_image_url = 'https://res.cloudinary.com/YOUR_CLOUD/image/upload/v1/mountain-adventures/winter-2025/frozen-waterfall-trail.jpg' WHERE stop_id = 'frozen-waterfall-trail';
UPDATE hunt_stops SET pre_populated_image_url = 'https://res.cloudinary.com/YOUR_CLOUD/image/upload/v1/mountain-adventures/winter-2025/alpine-village-square.jpg' WHERE stop_id = 'alpine-village-square';
UPDATE hunt_stops SET pre_populated_image_url = 'https://res.cloudinary.com/YOUR_CLOUD/image/upload/v1/mountain-adventures/winter-2025/cross-country-ski-center.jpg' WHERE stop_id = 'cross-country-ski-center';
UPDATE hunt_stops SET pre_populated_image_url = 'https://res.cloudinary.com/YOUR_CLOUD/image/upload/v1/mountain-adventures/winter-2025/snowshoe-adventure-park.jpg' WHERE stop_id = 'snowshoe-adventure-park';
UPDATE hunt_stops SET pre_populated_image_url = 'https://res.cloudinary.com/YOUR_CLOUD/image/upload/v1/mountain-adventures/winter-2025/ice-skating-rink.jpg' WHERE stop_id = 'ice-skating-rink';
UPDATE hunt_stops SET pre_populated_image_url = 'https://res.cloudinary.com/YOUR_CLOUD/image/upload/v1/mountain-adventures/winter-2025/wildlife-observation-point.jpg' WHERE stop_id = 'wildlife-observation-point';
UPDATE hunt_stops SET pre_populated_image_url = 'https://res.cloudinary.com/YOUR_CLOUD/image/upload/v1/mountain-adventures/winter-2025/hot-springs-retreat.jpg' WHERE stop_id = 'hot-springs-retreat';
UPDATE hunt_stops SET pre_populated_image_url = 'https://res.cloudinary.com/YOUR_CLOUD/image/upload/v1/mountain-adventures/winter-2025/summit-express-gondola.jpg' WHERE stop_id = 'summit-express-gondola';
*/

-- ============================================================================
-- ALTERNATIVE: Use Unsplash API
-- ============================================================================

/*
Unsplash provides free high-quality photos via API:

UPDATE hunt_stops SET pre_populated_image_url = 'https://source.unsplash.com/800x600/?mountain,peak' WHERE stop_id = 'mountain-peak-viewpoint';
UPDATE hunt_stops SET pre_populated_image_url = 'https://source.unsplash.com/800x600/?museum,history' WHERE stop_id = 'historic-mining-museum';
UPDATE hunt_stops SET pre_populated_image_url = 'https://source.unsplash.com/800x600/?waterfall,frozen' WHERE stop_id = 'frozen-waterfall-trail';
UPDATE hunt_stops SET pre_populated_image_url = 'https://source.unsplash.com/800x600/?alpine,village' WHERE stop_id = 'alpine-village-square';
UPDATE hunt_stops SET pre_populated_image_url = 'https://source.unsplash.com/800x600/?skiing,nordic' WHERE stop_id = 'cross-country-ski-center';
UPDATE hunt_stops SET pre_populated_image_url = 'https://source.unsplash.com/800x600/?snowshoe,winter' WHERE stop_id = 'snowshoe-adventure-park';
UPDATE hunt_stops SET pre_populated_image_url = 'https://source.unsplash.com/800x600/?skating,ice' WHERE stop_id = 'ice-skating-rink';
UPDATE hunt_stops SET pre_populated_image_url = 'https://source.unsplash.com/800x600/?wildlife,nature' WHERE stop_id = 'wildlife-observation-point';
UPDATE hunt_stops SET pre_populated_image_url = 'https://source.unsplash.com/800x600/?hotspring,spa' WHERE stop_id = 'hot-springs-retreat';
UPDATE hunt_stops SET pre_populated_image_url = 'https://source.unsplash.com/800x600/?gondola,cable' WHERE stop_id = 'summit-express-gondola';

Note: Unsplash Source API may be deprecated. Check https://unsplash.com/developers
*/
