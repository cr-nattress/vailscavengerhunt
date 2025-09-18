import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

router.post('/photo-upload', upload.single('file'), async (req, res) => {
  console.log('📸 Photo upload request received');

  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded'
      });
    }

    const {
      locationTitle,
      sessionId,
      teamName,
      locationName,
      eventName
    } = req.body;

    console.log('📸 Upload params:', {
      locationTitle,
      sessionId,
      teamName,
      locationName,
      eventName,
      fileSize: req.file.size,
      fileType: req.file.mimetype
    });

    // Build Cloudinary tags
    const tags = [
      'scavenger-hunt',
      sessionId,
      locationTitle?.replace(/\s+/g, '-'),
      teamName?.replace(/\s+/g, '-'),
      locationName?.replace(/\s+/g, '-'),
      eventName?.replace(/\s+/g, '-')
    ].filter(Boolean);

    // Build folder path
    const uploadFolder = process.env.CLOUDINARY_UPLOAD_FOLDER || 'scavenger/entries';
    const folder = `${uploadFolder}/${sessionId}`;

    // Upload to Cloudinary using stream
    const uploadPromise = new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          tags,
          resource_type: 'auto',
          transformation: [
            { width: 1920, height: 1920, crop: 'limit' },
            { quality: 'auto:good' }
          ]
        },
        (error, result) => {
          if (error) {
            console.error('❌ Cloudinary upload error:', error);
            reject(error);
          } else {
            console.log('✅ Cloudinary upload success:', result?.public_id);
            resolve(result);
          }
        }
      );

      streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
    });

    const result = await uploadPromise as any;

    // Return response matching expected schema
    const response = {
      success: true,
      data: {
        id: result.public_id,
        url: result.secure_url,
        thumbnailUrl: result.secure_url.replace('/upload/', '/upload/w_300,h_300,c_fill/'),
        locationTitle,
        teamName,
        sessionId,
        uploadedAt: new Date().toISOString(),
        metadata: {
          width: result.width,
          height: result.height,
          format: result.format,
          size: result.bytes
        }
      }
    };

    console.log('✅ Photo upload complete');
    res.json(response);

  } catch (error) {
    console.error('❌ Photo upload error:', error);
    res.status(500).json({
      error: 'Failed to upload photo',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
