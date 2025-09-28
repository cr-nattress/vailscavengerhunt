const multipart = require('parse-multipart-data');
const cloudinary = require('cloudinary').v2;
const crypto = require('crypto');
const { getSupabaseClient } = require('./_lib/supabaseClient');
const { withSentry } = require('./_lib/sentry');
const { executeWithRetry } = require('./_lib/retryHelpers');

// Circuit breaker state
const circuitBreaker = {
  cloudinary: { failures: 0, lastFailure: null, state: 'CLOSED' },
  supabase: { failures: 0, lastFailure: null, state: 'CLOSED' }
};

const BREAKER_THRESHOLD = 5;
const BREAKER_TIMEOUT = 30000; // 30 seconds
const BREAKER_WINDOW = 60000; // 60 seconds

// Helper to check and update circuit breaker
function checkBreaker(service) {
  const breaker = circuitBreaker[service];
  const now = Date.now();

  // Reset failures if outside window
  if (breaker.lastFailure && (now - breaker.lastFailure) > BREAKER_WINDOW) {
    breaker.failures = 0;
    breaker.state = 'CLOSED';
  }

  // Check if circuit is open
  if (breaker.state === 'OPEN') {
    if ((now - breaker.lastFailure) > BREAKER_TIMEOUT) {
      breaker.state = 'HALF_OPEN';
      console.log(`[CircuitBreaker] ${service} entering HALF_OPEN state`);
    } else {
      throw new Error(`Circuit breaker OPEN for ${service}`);
    }
  }

  return breaker.state;
}

function recordBreakerFailure(service) {
  const breaker = circuitBreaker[service];
  breaker.failures++;
  breaker.lastFailure = Date.now();

  if (breaker.failures >= BREAKER_THRESHOLD) {
    breaker.state = 'OPEN';
    console.log(`[CircuitBreaker] ${service} entering OPEN state after ${breaker.failures} failures`);
  }
}

function recordBreakerSuccess(service) {
  const breaker = circuitBreaker[service];
  if (breaker.state === 'HALF_OPEN') {
    breaker.state = 'CLOSED';
    breaker.failures = 0;
    console.log(`[CircuitBreaker] ${service} entering CLOSED state`);
  }
}

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
    // Fallback to random UUID if hashing fails
    return crypto.randomUUID().replace(/-/g, '').substring(0, 16);
  }
}

// Upload to Cloudinary with retries
async function uploadToCloudinary(fileBuffer, locationSlug, sessionId, idempotencyKey, metadata) {
  checkBreaker('cloudinary');

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const folder = process.env.CLOUDINARY_UPLOAD_FOLDER || 'scavenger/entries';
  const publicId = `${locationSlug}_${sessionId}_${idempotencyKey}`;

  // Build context metadata
  const contextData = {
    idempotency_key: idempotencyKey,
    session_id: sessionId,
    location_id: metadata.locationId,
    location_title: metadata.locationTitle,
    team_name: metadata.teamName || '',
    hunt_name: metadata.huntName || '',
    organization_name: metadata.organizationName || '',
    completed_at: new Date().toISOString()
  };

  // Build tags
  const tags = [
    'scavenger-hunt',
    locationSlug,
    sessionId,
    idempotencyKey
  ];

  if (metadata.orgId) tags.push(`org:${metadata.orgId}`);
  if (metadata.huntId) tags.push(`hunt:${metadata.huntId}`);
  if (metadata.teamId) tags.push(`team:${metadata.teamId}`);
  if (metadata.locationId) tags.push(`loc:${metadata.locationId}`);

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
    overwrite: true, // Allow re-uploading with same public_id (idempotent)
  };

  // Retry logic for upload
  let lastError;
  const delays = [500, 1000, 2000];

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(fileBuffer);
      });

      recordBreakerSuccess('cloudinary');
      return {
        publicId: result.public_id,
        secureUrl: result.secure_url,
        assetId: result.asset_id,
        version: result.version
      };
    } catch (error) {
      lastError = error;
      console.log(`[Cloudinary] Upload attempt ${attempt + 1} failed:`, error.message);

      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, delays[attempt]));
      }
    }
  }

  recordBreakerFailure('cloudinary');
  throw lastError;
}

// Verify Cloudinary asset exists
async function verifyCloudinaryAsset(publicId) {
  const delays = [500, 1000, 2000];

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await cloudinary.api.resource(publicId);
      return result && result.public_id === publicId;
    } catch (error) {
      console.log(`[Cloudinary] Verify attempt ${attempt + 1} failed:`, error.message);

      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, delays[attempt]));
      }
    }
  }

  return false;
}

// Delete Cloudinary asset (compensation)
async function deleteCloudinaryAsset(publicId) {
  try {
    console.log(`[Compensation] Deleting Cloudinary asset: ${publicId}`);
    await cloudinary.uploader.destroy(publicId);
    console.log(`[Compensation] Successfully deleted asset: ${publicId}`);
  } catch (error) {
    console.error(`[Compensation] Failed to delete asset ${publicId}:`, error.message);
    // Don't throw - best effort compensation
  }
}

// Upsert to hunt_progress table
async function upsertHuntProgress(supabase, teamId, locationId, photoUrl, requestId, orgId) {
  checkBreaker('supabase');

  try {
    // First, look up the actual team UUID if teamId is not a UUID
    let actualTeamId = teamId;

    // Check if teamId is a valid UUID (basic check)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(teamId)) {
      console.log(`[${requestId}] Looking up team UUID for team name: ${teamId}`);

      // Lookup the team by name to get its UUID
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('id')
        .eq('name', teamId)
        .eq('organization_id', orgId)
        .single();

      if (teamError || !teamData) {
        console.error(`[${requestId}] Failed to find team with name ${teamId}:`, teamError);
        throw new Error(`Team not found: ${teamId}`);
      }

      actualTeamId = teamData.id;
      console.log(`[${requestId}] Found team UUID: ${actualTeamId} for team name: ${teamId}`);
    }

    // Use upsert to handle idempotency
    const { data, error } = await executeWithRetry(
      async () => {
        return await supabase
          .from('hunt_progress')
          .upsert(
            {
              team_id: actualTeamId,
              location_id: locationId,
              photo_url: photoUrl,
              done: true,
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              onConflict: 'team_id,location_id',
              returning: 'representation'
            }
          )
          .select()
          .single();
      },
      {
        maxAttempts: 3,
        delays: [1000, 2000, 4000]
      }
    );

    if (error) throw error;

    recordBreakerSuccess('supabase');

    console.log(`[${requestId}] Hunt progress upserted:`, {
      teamId: actualTeamId,
      originalTeamId: teamId,
      locationId,
      operation: data.created_at === data.updated_at ? 'inserted' : 'updated'
    });

    return data;
  } catch (error) {
    recordBreakerFailure('supabase');
    throw error;
  }
}

// Fetch metadata from Supabase
async function fetchMetadata(supabase, orgId, huntId, teamId) {
  try {
    // Fetch organization name
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .single();

    // Fetch hunt name
    const { data: hunt } = await supabase
      .from('hunts')
      .select('name')
      .eq('organization_id', orgId)
      .eq('id', huntId)
      .single();

    // Fetch team name
    const { data: team } = await supabase
      .from('teams')
      .select('name')
      .eq('id', teamId)
      .single();

    return {
      organizationName: org?.name || orgId,
      huntName: hunt?.name || huntId,
      teamName: team?.name || ''
    };
  } catch (error) {
    console.warn('Failed to fetch metadata:', error.message);
    return {
      organizationName: orgId,
      huntName: huntId,
      teamName: ''
    };
  }
}

// Main handler
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

  // Generate request ID for correlation
  const requestId = event.headers['x-request-id'] ||
    event.headers['x-nf-request-id'] ||
    `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Check Cloudinary configuration
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Server configuration error',
        details: 'Cloudinary credentials not configured',
        requestId
      })
    };
  }

  let publicId = null;
  let teamId = null;
  let locationId = null;

  try {
    // Parse multipart data
    const contentType = event.headers['content-type'] || event.headers['Content-Type'];
    if (!contentType?.includes('multipart/form-data')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Content-Type must be multipart/form-data',
          requestId
        })
      };
    }

    const boundary = contentType.split('boundary=')[1];
    if (!boundary) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Multipart boundary not found',
          requestId
        })
      };
    }

    const bodyBuffer = event.isBase64Encoded !== false
      ? Buffer.from(event.body, 'base64')
      : Buffer.from(event.body);

    // Size validation
    const MAX_BODY_SIZE = 15 * 1024 * 1024; // 15MB
    if (bodyBuffer.length > MAX_BODY_SIZE) {
      return {
        statusCode: 413,
        headers,
        body: JSON.stringify({
          error: 'Request too large',
          details: 'Please upload a smaller image (max 15MB)',
          requestId
        })
      };
    }

    const parts = multipart.parse(bodyBuffer, boundary);
    if (!parts || parts.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No multipart data found', requestId })
      };
    }

    // Extract fields
    let photoBuffer = null;
    let locationTitle = '';
    let sessionId = '';
    let teamName = '';
    let locationName = '';
    let eventName = '';
    let idempotencyKey = '';
    let orgId = '';
    let huntId = '';
    locationId = ''; // Reset

    for (const part of parts) {
      const fieldName = part.name;
      const isFile = part.filename !== undefined;

      if (isFile && fieldName === 'photo') {
        photoBuffer = part.data;
      } else {
        const value = part.data.toString();
        switch(fieldName) {
          case 'locationTitle': locationTitle = value; break;
          case 'locationId': locationId = value; break;
          case 'sessionId': sessionId = value; break;
          case 'teamName': teamName = value; break;
          case 'locationName': locationName = value; break;
          case 'eventName': eventName = value; break;
          case 'idempotencyKey': idempotencyKey = value; break;
          case 'orgId': orgId = value; break;
          case 'huntId': huntId = value; break;
          case 'teamId': teamId = value; break;
        }
      }
    }

    // Validate required fields
    if (!photoBuffer) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No photo data provided', requestId })
      };
    }

    if (!locationTitle || !sessionId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required fields',
          details: 'locationTitle and sessionId are required',
          requestId
        })
      };
    }

    // Get team context from headers or determine from session
    if (!teamId) {
      // Try to get from team lock header
      const lockToken = event.headers['x-team-lock'];
      if (lockToken) {
        const supabase = getSupabaseClient();
        const { data: lock } = await supabase
          .from('device_locks')
          .select('team_id')
          .eq('lock_token', lockToken)
          .single();

        if (lock) {
          teamId = lock.team_id;
        }
      }
    }

    if (!teamId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Team context required',
          details: 'Unable to determine team ID',
          requestId
        })
      };
    }

    // Use provided locationId or derive from title
    if (!locationId) {
      locationId = generateSlug(locationTitle);
    }

    // Generate or validate idempotency key
    if (!idempotencyKey) {
      idempotencyKey = await generateIdempotencyKey(photoBuffer, sessionId, locationTitle);
    }

    const locationSlug = generateSlug(locationTitle);

    console.log(`[${requestId}] Starting orchestrated upload:`, {
      locationTitle,
      locationId,
      locationSlug,
      sessionId,
      teamId,
      idempotencyKey: idempotencyKey.substring(0, 8) + '...',
      photoSize: `${(photoBuffer.length / 1024).toFixed(2)}KB`
    });

    // Fetch metadata if we have org/hunt info
    const supabase = getSupabaseClient();
    let metadata = {
      locationId,
      locationTitle,
      teamName,
      teamId,
      orgId,
      huntId,
      huntName: '',
      organizationName: ''
    };

    if (orgId && huntId) {
      const fetchedMetadata = await fetchMetadata(supabase, orgId, huntId, teamId);
      metadata = { ...metadata, ...fetchedMetadata };
    }

    // Step 1: Upload to Cloudinary
    console.log(`[${requestId}] Uploading to Cloudinary...`);
    const uploadResult = await uploadToCloudinary(
      photoBuffer,
      locationSlug,
      sessionId,
      idempotencyKey,
      metadata
    );

    publicId = uploadResult.publicId;
    const photoUrl = uploadResult.secureUrl;

    console.log(`[${requestId}] Cloudinary upload successful:`, {
      publicId,
      idempotencyKey
    });

    // Step 2: Verify asset exists
    console.log(`[${requestId}] Verifying Cloudinary asset...`);
    const assetExists = await verifyCloudinaryAsset(publicId);

    if (!assetExists) {
      throw new Error('Failed to verify uploaded asset');
    }

    // Step 3: Upsert to hunt_progress
    console.log(`[${requestId}] Updating hunt progress...`);
    try {
      await upsertHuntProgress(supabase, teamId, locationId, photoUrl, requestId, orgId);
    } catch (dbError) {
      // Compensation: Delete Cloudinary asset
      console.error(`[${requestId}] Database write failed, compensating...`, dbError);
      await deleteCloudinaryAsset(publicId);
      throw dbError;
    }

    // Success response
    const response = {
      photoUrl,
      publicId,
      locationSlug,
      title: locationTitle,
      uploadedAt: new Date().toISOString(),
      idempotencyKey
    };

    console.log(`[${requestId}] Orchestrated upload completed successfully`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error(`[${requestId}] Orchestrated upload error:`, error);

    // Check for circuit breaker open
    if (error.message?.includes('Circuit breaker OPEN')) {
      return {
        statusCode: 503,
        headers: {
          ...headers,
          'Retry-After': '30'
        },
        body: JSON.stringify({
          error: 'Service temporarily unavailable',
          details: 'Please try again in a moment',
          requestId
        })
      };
    }

    // Check for timeout
    if (error.message?.includes('timeout') || error.message?.includes('ETIMEDOUT')) {
      return {
        statusCode: 504,
        headers,
        body: JSON.stringify({
          error: 'Upload timeout',
          details: 'The upload took too long. Please try again.',
          requestId
        })
      };
    }

    // Default error response
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to process upload',
        details: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred',
        requestId
      })
    };
  }
});