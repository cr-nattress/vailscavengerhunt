const multipart = require('parse-multipart-data');
const cloudinary = require('cloudinary').v2;
const { withSentry } = require('./_lib/sentry')

// Helper function to generate slug from location title
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim()
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

// Helper function to upload single photo to Cloudinary
async function uploadPhotoToCloudinary(
  fileBuffer,
  locationSlug,
  sessionId,
  teamName,
  locationName,
  eventName
) {

  // Configure Cloudinary
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const timestamp = Date.now();
  const folder = process.env.CLOUDINARY_UPLOAD_FOLDER || 'scavenger/entries';
  const publicId = `${locationSlug}_${sessionId}_${timestamp}`;

  // Prepare context metadata
  const contextData = {
    sessionId,
    timestamp: new Date().toISOString(),
    location: locationSlug
  };
  if (teamName) contextData.team = teamName;
  if (locationName) contextData.locationName = locationName;
  if (eventName) contextData.event = eventName;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: 'auto',
        context: contextData,
        tags: ['scavenger-hunt', locationSlug, sessionId],
        transformation: [
          {
            quality: 'auto:good',
            fetch_format: 'auto',
            width: 1200,
            height: 1200,
            crop: 'limit'
          }
        ]
      },
      (error, result) => {
        if (error) {
          console.error('❌ Cloudinary upload error:', error);
          reject(error);
        } else {
          console.log('✅ Cloudinary upload successful:', result.public_id);
          resolve({
            publicId: result.public_id,
            secureUrl: result.secure_url
          });
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
}

// Main handler
exports.handler = withSentry(async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Check for required Cloudinary environment variables
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error('❌ Missing Cloudinary configuration:', {
      hasCloudName: !!process.env.CLOUDINARY_CLOUD_NAME,
      hasApiKey: !!process.env.CLOUDINARY_API_KEY,
      hasApiSecret: !!process.env.CLOUDINARY_API_SECRET
    });

    return {
      statusCode: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Server configuration error',
        details: 'Cloudinary credentials not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables in Netlify.'
      })
    };
  }

  // Extract request ID for logging correlation
  const requestId = event.headers['x-request-id'] ||
                    event.headers['x-nf-request-id'] ||
                    `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const contentType = event.headers['content-type'] || event.headers['Content-Type'];

    if (!contentType || !contentType.includes('multipart/form-data')) {
      console.error(`[${requestId}] Invalid Content-Type:`, contentType);
      return {
        statusCode: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Content-Type must be multipart/form-data',
          requestId
        })
      };
    }

    // Parse multipart form data
    const boundary = contentType.split('boundary=')[1];
    if (!boundary) {
      console.error(`[${requestId}] Multipart boundary not found in:`, contentType);
      return {
        statusCode: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Multipart boundary not found',
          requestId
        })
      };
    }

    // Handle base64 encoding properly
    let bodyBuffer;
    if (event.isBase64Encoded !== false) {
      // Default to base64 decoding unless explicitly false
      bodyBuffer = Buffer.from(event.body, 'base64');
    } else {
      bodyBuffer = Buffer.from(event.body);
    }

    // Check body size before parsing (15MB limit)
    const MAX_BODY_SIZE = 15 * 1024 * 1024; // 15MB
    if (bodyBuffer.length > MAX_BODY_SIZE) {
      console.error(`[${requestId}] Request body too large: ${bodyBuffer.length} bytes`);
      return {
        statusCode: 413,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Request too large',
          details: 'Please upload a smaller image (max 15MB). Try using the camera app settings to reduce photo quality.',
          requestId
        })
      };
    }

    const parts = multipart.parse(bodyBuffer, boundary);

    if (!parts || parts.length === 0) {
      return {
        statusCode: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'No multipart data found' })
      };
    }

    // Extract fields from multipart data
    let photoBuffer = null;
    let locationTitle = '';
    let sessionId = '';
    let teamName = '';
    let locationName = '';
    let eventName = '';

    for (const part of parts) {
      const fieldName = part.name;
      const isFile = part.filename !== undefined;

      if (isFile && fieldName === 'photo') {
        photoBuffer = part.data;
      } else {
        const value = part.data.toString();
        switch(fieldName) {
          case 'locationTitle':
            locationTitle = value;
            break;
          case 'sessionId':
            sessionId = value;
            break;
          case 'teamName':
            teamName = value;
            break;
          case 'locationName':
            locationName = value;
            break;
          case 'eventName':
            eventName = value;
            break;
        }
      }
    }

    // Validate required fields
    if (!photoBuffer) {
      console.error(`[${requestId}] No photo data found in multipart`);
      return {
        statusCode: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'No photo data provided',
          requestId
        })
      };
    }

    // Validate file size (10MB limit for individual file)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (photoBuffer.length > MAX_FILE_SIZE) {
      console.error(`[${requestId}] Photo too large: ${photoBuffer.length} bytes`);
      return {
        statusCode: 413,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Photo too large',
          details: `Photo must be under 10MB. Current size: ${(photoBuffer.length / 1024 / 1024).toFixed(2)}MB`,
          requestId
        })
      };
    }

    // Basic validation that it's an image (check first bytes)
    const isJpeg = photoBuffer[0] === 0xFF && photoBuffer[1] === 0xD8;
    const isPng = photoBuffer[0] === 0x89 && photoBuffer[1] === 0x50;
    const isGif = photoBuffer[0] === 0x47 && photoBuffer[1] === 0x49;
    const isWebp = photoBuffer[8] === 0x57 && photoBuffer[9] === 0x45;

    if (!isJpeg && !isPng && !isGif && !isWebp) {
      console.error(`[${requestId}] Invalid image format detected`);
      return {
        statusCode: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Invalid file type',
          details: 'Please upload a valid image file (JPEG, PNG, GIF, or WebP)',
          requestId
        })
      };
    }

    if (!locationTitle) {
      console.error(`[${requestId}] Missing location title`);
      return {
        statusCode: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Location title is required',
          requestId
        })
      };
    }

    if (!sessionId) {
      console.error(`[${requestId}] Missing session ID`);
      return {
        statusCode: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Session ID is required',
          requestId
        })
      };
    }

    // Generate location slug
    const locationSlug = generateSlug(locationTitle);

    // Upload to Cloudinary with enhanced logging
    console.log(`[${requestId}] 📤 Starting upload:`, {
      locationTitle,
      locationSlug,
      sessionId,
      teamName: teamName || 'none',
      locationName: locationName || 'none',
      eventName: eventName || 'none',
      photoSize: `${(photoBuffer.length / 1024).toFixed(2)}KB`
    });

    const uploadResult = await uploadPhotoToCloudinary(
      photoBuffer,
      locationSlug,
      sessionId,
      teamName,
      locationName,
      eventName
    );

    // Return success response
    const response = {
      photoUrl: uploadResult.secureUrl,
      publicId: uploadResult.publicId,
      locationSlug,
      title: locationTitle,
      uploadedAt: new Date().toISOString()
    };

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error(`[${requestId}] ❌ Photo upload handler error:`, error);
    console.error(`[${requestId}] Error details:`, {
      name: error.name,
      message: error.message,
      stack: error.stack,
      sessionId,
      teamName: teamName || 'none',
      locationSlug: locationSlug || 'none',
      cloudinaryConfig: {
        hasCloudName: !!process.env.CLOUDINARY_CLOUD_NAME,
        hasApiKey: !!process.env.CLOUDINARY_API_KEY,
        hasApiSecret: !!process.env.CLOUDINARY_API_SECRET,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'NOT_SET'
      }
    });

    // Check for timeout errors
    if (error.message && (error.message.includes('timeout') || error.message.includes('ETIMEDOUT'))) {
      return {
        statusCode: 504,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Upload timeout',
          details: 'The upload took too long. Please try again with a smaller image or better network connection.',
          requestId
        })
      };
    }

    // Check if it's a Cloudinary API key error
    if (error.message && error.message.includes('api_key')) {
      return {
        statusCode: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Cloudinary configuration error',
          details: 'Cloudinary API credentials are missing or invalid. Please configure environment variables in Netlify.',
          requestId
        })
      };
    }

    // Check for network errors
    if (error.message && (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND'))) {
      return {
        statusCode: 503,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Service unavailable',
          details: 'Unable to reach upload service. Please try again in a moment.',
          requestId
        })
      };
    }

    return {
      statusCode: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Failed to upload photo',
        details: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred. Please try again.',
        requestId
      })
    };
  }
});