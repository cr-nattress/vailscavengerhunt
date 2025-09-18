const multipart = require('parse-multipart-data');
const cloudinary = require('cloudinary').v2;

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
exports.handler = async (event, context) => {
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

  try {
    const contentType = event.headers['content-type'] || event.headers['Content-Type'];

    if (!contentType || !contentType.includes('multipart/form-data')) {
      return {
        statusCode: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Content-Type must be multipart/form-data' })
      };
    }

    // Parse multipart form data
    const boundary = contentType.split('boundary=')[1];
    if (!boundary) {
      return {
        statusCode: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Multipart boundary not found' })
      };
    }

    const parts = multipart.parse(Buffer.from(event.body, 'base64'), boundary);

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
      return {
        statusCode: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'No photo data provided' })
      };
    }

    if (!locationTitle) {
      return {
        statusCode: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Location title is required' })
      };
    }

    if (!sessionId) {
      return {
        statusCode: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Session ID is required' })
      };
    }

    // Generate location slug
    const locationSlug = generateSlug(locationTitle);

    // Upload to Cloudinary
    console.log(`📤 Uploading photo for ${locationTitle} (${locationSlug}), session: ${sessionId}`);

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
    console.error('❌ Photo upload handler error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cloudinaryConfig: {
        hasCloudName: !!process.env.CLOUDINARY_CLOUD_NAME,
        hasApiKey: !!process.env.CLOUDINARY_API_KEY,
        hasApiSecret: !!process.env.CLOUDINARY_API_SECRET,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'NOT_SET'
      }
    });

    // Check if it's a Cloudinary API key error
    if (error.message && error.message.includes('api_key')) {
      return {
        statusCode: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Cloudinary configuration error',
          details: 'Cloudinary API credentials are missing or invalid. Please configure environment variables in Netlify.'
        })
      };
    }

    return {
      statusCode: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Failed to upload photo',
        details: error.message
      })
    };
  }
};