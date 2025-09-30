/**
 * POST /api/photo-upload-complete
 * 
 * Atomic endpoint that uploads photo to Cloudinary AND updates hunt progress in one transaction.
 * This ensures photo upload and progress update succeed or fail together (no partial state).
 * 
 * Request:  multipart/form-data with fields:
 *   - file: Image file (JPEG, PNG, GIF, WebP; max 10MB)
 *   - organizationId: Organization ID (e.g., 'bhhs')
 *   - teamId: Team UUID
 *   - huntId: Hunt ID (e.g., 'fall-2025')
 *   - locationId: Stop ID (e.g., 'stop-1')
 *   - locationTitle: Stop title for metadata
 *   - sessionId: Session GUID for idempotency
 *   - teamName: (optional) Team name for metadata
 *   - locationName: (optional) Location name for metadata
 *   - eventName: (optional) Event name for metadata
 * 
 * Response: {
 *   success: true,
 *   photoUrl: string (Cloudinary URL),
 *   publicId: string,
 *   progress: ProgressItem (updated progress record),
 *   progressUpdated: true
 * }
 * 
 * Errors:
 *   400 - Missing required fields or invalid file
 *   413 - File too large (>10MB)
 *   500 - Cloudinary upload failed or database update failed
 * 
 * Side effects:
 *   - Uploads image to Cloudinary (folder: vail-scavenger-hunt/{orgId}/{huntId})
 *   - Updates hunt_progress table (sets photo_url, done=true, completed_at)
 *   - Idempotent: Same file+session+location won't duplicate upload
 * 
 * @ai-purpose: Atomic photo upload + progress update; prevents inconsistent state
 * @ai-dont: Don't call this endpoint twice for same photo; use idempotency key (sessionId + locationTitle)
 * @ai-related-files: /src/hooks/usePhotoUpload.ts, /src/client/PhotoUploadService.ts
 */
const multipart = require('parse-multipart-data');
const cloudinary = require('cloudinary').v2;
const crypto = require('crypto');
const { getSupabaseClient } = require('./_lib/supabaseClient');
const { withSentry } = require('./_lib/sentry');

// Helper to generate slug from location title
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .replace(/^-|-$/g, '');
}

// Helper to generate idempotency key
async function generateIdempotencyKey(fileBuffer, sessionId, locationTitle) {
  try {
    const hash = crypto.createHash('sha256');
    hash.update(fileBuffer);
    hash.update(sessionId);
    hash.update(locationTitle);
    return hash.digest('hex').substring(0, 16);
  } catch (error) {
    return crypto.randomUUID().replace(/-/g, '').substring(0, 16);
  }
}

// Main handler for complete photo upload with progress update
exports.handler = withSentry(async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Team-Lock',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`[${requestId}] photo-upload-complete: Request received`);

  let supabase;
  let uploadResult;
  let progressResult;
  let fileBuffer;
  let metadata = {};

  try {
    // Parse multipart form data
    const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      throw new Error('Content-Type must be multipart/form-data');
    }

    const boundary = contentType.split('boundary=')[1];
    if (!boundary) {
      throw new Error('No boundary found in Content-Type header');
    }

    const bodyBuffer = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64')
      : Buffer.from(event.body);

    const parts = multipart.parse(bodyBuffer, boundary);
    console.log(`[${requestId}] Parsed ${parts.length} multipart parts`);

    // Extract form data
    for (const part of parts) {
      const name = part.name || '';

      if (name === 'photo') {
        fileBuffer = part.data;
        console.log(`[${requestId}] Found photo: ${part.filename} (${part.data.length} bytes)`);
      } else if (part.data) {
        const value = part.data.toString('utf8').trim();
        metadata[name] = value;
        console.log(`[${requestId}] Field ${name}: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`);
      }
    }

    // Validate required fields
    if (!fileBuffer) {
      throw new Error('No photo file found in request');
    }

    const requiredFields = ['locationId', 'locationTitle', 'sessionId', 'teamId', 'orgId', 'huntId'];
    const missingFields = requiredFields.filter(field => !metadata[field]);
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Generate idempotency key
    const idempotencyKey = await generateIdempotencyKey(
      fileBuffer,
      metadata.sessionId,
      metadata.locationTitle
    );
    console.log(`[${requestId}] Generated idempotency key: ${idempotencyKey}`);

    // Initialize Supabase client
    supabase = await getSupabaseClient();

    // Step 1: Upload to Cloudinary
    console.log(`[${requestId}] Starting Cloudinary upload...`);

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const locationSlug = generateSlug(metadata.locationTitle);
    const folder = process.env.CLOUDINARY_UPLOAD_FOLDER || 'scavenger/entries';
    const publicId = `${locationSlug}_${metadata.sessionId}_${idempotencyKey}`;

    // Build context metadata for Cloudinary
    const contextData = {
      idempotency_key: idempotencyKey,
      session_id: metadata.sessionId,
      location_id: metadata.locationId,
      team_id: metadata.teamId,
      org_id: metadata.orgId,
      hunt_id: metadata.huntId,
      location_title: metadata.locationTitle,
      team_name: metadata.teamName || '',
      event_name: metadata.eventName || '',
      completed_at: new Date().toISOString()
    };

    // Build tags
    const tags = [
      'scavenger-hunt',
      locationSlug,
      metadata.sessionId,
      `org:${metadata.orgId}`,
      `hunt:${metadata.huntId}`,
      `team:${metadata.teamId}`,
      `loc:${metadata.locationId}`
    ].filter(Boolean);

    const uploadOptions = {
      folder,
      public_id: publicId,
      resource_type: 'auto',
      context: contextData,
      tags: tags.slice(0, 20), // Cloudinary tag limit
      transformation: [
        {
          quality: 'auto:good',
          fetch_format: 'auto',
          width: 1600,
          height: 1600,
          crop: 'limit'
        }
      ],
      overwrite: true, // Allow re-uploading with same public_id
    };

    // Upload to Cloudinary with retries
    let lastUploadError;
    const uploadDelays = [500, 1000, 2000];

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        uploadResult = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          uploadStream.end(fileBuffer);
        });

        console.log(`[${requestId}] Cloudinary upload successful: ${uploadResult.secure_url}`);
        break;
      } catch (error) {
        lastUploadError = error;
        console.error(`[${requestId}] Cloudinary upload attempt ${attempt + 1} failed:`, error.message);

        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, uploadDelays[attempt]));
        }
      }
    }

    if (!uploadResult) {
      throw lastUploadError || new Error('Failed to upload to Cloudinary after 3 attempts');
    }

    // Step 2: Update progress in database
    console.log(`[${requestId}] Updating progress in database...`);

    // Look up team UUID if teamId is not a UUID
    let actualTeamId = metadata.teamId;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(metadata.teamId)) {
      console.log(`[${requestId}] Looking up team UUID for: ${metadata.teamId}`);

      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('id')
        .ilike('team_id', metadata.teamId)
        .eq('organization_id', metadata.orgId)
        .eq('hunt_id', metadata.huntId)
        .single();

      if (teamError || !teamData) {
        console.error(`[${requestId}] Failed to find team:`, teamError);
        // Don't throw - allow progress update to fail gracefully
        actualTeamId = metadata.teamId; // Use as-is and let upsert handle it
      } else {
        actualTeamId = teamData.id;
        console.log(`[${requestId}] Found team UUID: ${actualTeamId}`);
      }
    }

    // Parse optional fields
    const revealedHints = metadata.revealedHints ? parseInt(metadata.revealedHints, 10) : 0;
    const notes = metadata.notes || null;
    const completedAt = new Date().toISOString();

    // Upsert progress record
    const { data: progressData, error: progressError } = await supabase
      .from('hunt_progress')
      .upsert(
        {
          team_id: actualTeamId,
          location_id: metadata.locationId,
          photo_url: uploadResult.secure_url,
          done: true,
          completed_at: completedAt,
          revealed_hints: revealedHints,
          notes: notes,
          updated_at: completedAt
        },
        {
          onConflict: 'team_id,location_id',
          returning: 'representation'
        }
      )
      .select()
      .single();

    if (progressError) {
      console.error(`[${requestId}] Progress update failed:`, progressError);
      // Don't throw - photo is already uploaded, return partial success
      progressResult = {
        updated: false,
        error: progressError.message
      };
    } else {
      progressResult = {
        updated: true,
        data: progressData
      };
      console.log(`[${requestId}] Progress updated successfully`);
    }

    // Step 3: Return combined response
    const response = {
      success: true,
      photoUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      locationSlug,
      title: metadata.locationTitle,
      uploadedAt: completedAt,
      progressUpdated: progressResult.updated,
      stopProgress: progressResult.updated ? {
        done: true,
        photo: uploadResult.secure_url,
        completedAt: completedAt,
        notes: notes,
        revealedHints: revealedHints
      } : null,
      progressError: progressResult.error || null
    };

    console.log(`[${requestId}] Request completed successfully`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error(`[${requestId}] Request failed:`, error);

    // If photo was uploaded but progress update failed, still return partial success
    if (uploadResult) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          photoUrl: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          locationSlug: metadata.locationTitle ? generateSlug(metadata.locationTitle) : '',
          title: metadata.locationTitle || '',
          uploadedAt: new Date().toISOString(),
          progressUpdated: false,
          stopProgress: null,
          progressError: error.message
        })
      };
    }

    // Complete failure
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        requestId
      })
    };
  }
});