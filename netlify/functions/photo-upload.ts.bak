import { Handler } from '@netlify/functions';
const multipart = require('parse-multipart-data');
import { v2 as cloudinary } from 'cloudinary';

interface PhotoUploadResponse {
  photoUrl: string;
  publicId: string;
  locationSlug: string;
  title: string;
  uploadedAt: string;
}

interface PhotoUploadRequest {
  photo: Buffer;
  locationTitle: string;
  sessionId: string;
  teamName?: string;
  locationName?: string;
  eventName?: string;
}

// Helper function to generate slug from location title
function generateSlug(title: string): string {
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
  fileBuffer: Buffer, 
  locationSlug: string, 
  sessionId: string,
  teamName?: string,
  locationName?: string,
  eventName?: string
): Promise<{ publicId: string; secureUrl: string }> {
  
  // Configure Cloudinary
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const timestamp = Date.now();
  const publicId = `${sessionId}/${locationSlug}_${timestamp}`;
  
  // Build dynamic tags
  const tags = ['vail-scavenger', 'individual-photo'];
  if (teamName) {
    tags.push(`team:${teamName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`);
  }
  if (locationName) {
    tags.push(`location:${locationName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`);
  }
  
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: process.env.CLOUDINARY_UPLOAD_FOLDER || 'scavenger/entries',
        tags: tags,
        public_id: publicId,
        context: { 
          team_name: teamName || '',
          company_name: locationName || '',
          session_id: sessionId,
          upload_time: new Date().toISOString(),
          scavenger_hunt_name: locationName || 'Vail Hunt',
          location_slug: locationSlug,
          upload_type: 'individual_photo',
          event_name: eventName || ''
        },
        resource_type: 'image',
        format: 'jpg',
        quality: 'auto:good',
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            publicId: result!.public_id,
            secureUrl: result!.secure_url
          });
        }
      }
    ).end(fileBuffer);
  });
}

export const handler: Handler = async (event, context) => {
  console.log('📸 Photo upload function called');
  console.log('Method:', event.httpMethod);
  console.log('URL:', event.path);
  console.log('Query params:', event.queryStringParameters);
  console.log('Headers:', JSON.stringify(event.headers, null, 2));
  console.log('Body length:', event.body ? event.body.length : 0);
  console.log('Is Base64 Encoded:', event.isBase64Encoded);
  console.log('Context:', {
    functionName: context.functionName,
    functionVersion: context.functionVersion,
    awsRequestId: context.awsRequestId,
  });

  // Check environment variables
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error('❌ Missing Cloudinary environment variables');
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Server configuration error: Missing Cloudinary credentials' 
      })
    };
  }

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const contentType = event.headers['content-type'] || '';
    
    if (!contentType.includes('multipart/form-data')) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          error: 'Content-Type must be multipart/form-data' 
        })
      };
    }

    // Parse multipart data
    const boundary = contentType.split('boundary=')[1];
    if (!boundary) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Missing boundary in Content-Type' })
      };
    }

    let parts;
    try {
      parts = multipart.parse(
        Buffer.from(event.body!, event.isBase64Encoded ? 'base64' : 'utf8'), 
        boundary
      );
    } catch (parseError) {
      console.error('Failed to parse multipart data:', parseError);
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          error: 'Invalid multipart data',
          details: parseError instanceof Error ? parseError.message : 'Parse error'
        })
      };
    }

    console.log(`📦 Parsed ${parts.length} parts from multipart data`);

    // Extract form data
    let photoBuffer: Buffer | null = null;
    let locationTitle: string | null = null;
    let sessionId: string | null = null;
    let teamName: string | null = null;
    let locationName: string | null = null;
    let eventName: string | null = null;

    for (const part of parts) {
      const name = part.name;
      console.log(`Processing part: ${name}`);

      if (name === 'photo' && part.data) {
        photoBuffer = part.data;
        console.log(`📷 Photo received: ${photoBuffer.length} bytes`);
      } else if (name === 'locationTitle' && part.data) {
        locationTitle = part.data.toString('utf8');
        console.log(`📍 Location title: ${locationTitle}`);
      } else if (name === 'sessionId' && part.data) {
        sessionId = part.data.toString('utf8');
        console.log(`🆔 Session ID: ${sessionId}`);
      } else if (name === 'teamName' && part.data) {
        teamName = part.data.toString('utf8');
        console.log(`👥 Team name: ${teamName}`);
      } else if (name === 'locationName' && part.data) {
        locationName = part.data.toString('utf8');
        console.log(`🏔️ Location name: ${locationName}`);
      } else if (name === 'eventName' && part.data) {
        eventName = part.data.toString('utf8');
        console.log(`🎯 Event name: ${eventName}`);
      }
    }

    // Validate required fields
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    };

    if (!photoBuffer) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'No photo provided' })
      };
    }

    if (!locationTitle) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'No location title provided' })
      };
    }

    if (!sessionId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'No session ID provided' })
      };
    }

    // Generate location slug
    const locationSlug = generateSlug(locationTitle);
    console.log(`🏷️ Generated slug: ${locationSlug}`);

    // Upload to Cloudinary
    console.log('☁️ Uploading to Cloudinary...');
    const uploadResult = await uploadPhotoToCloudinary(
      photoBuffer, 
      locationSlug, 
      sessionId,
      teamName || undefined,
      locationName || undefined,
      eventName || undefined
    );

    console.log('✅ Upload successful:', uploadResult);

    // Prepare response
    const response: PhotoUploadResponse = {
      photoUrl: uploadResult.secureUrl,
      publicId: uploadResult.publicId,
      locationSlug,
      title: locationTitle,
      uploadedAt: new Date().toISOString()
    };

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('💥 Photo upload error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Failed to upload photo',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};