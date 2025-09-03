import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { Request, Response } from 'express';

// Cloudinary configuration will be done inside the request handler

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

interface UploadedImage {
  publicId: string;
  secureUrl: string;
  title: string;
}

interface CollageResponse {
  collageUrl: string;
  uploaded: UploadedImage[];
}

// Helper function to upload image to Cloudinary
async function uploadToCloudinary(fileBuffer: Buffer, title: string, index: number): Promise<UploadedImage> {
  const timestamp = Date.now();
  const publicId = `scavenger_${timestamp}_${index}`;
  
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: process.env.CLOUDINARY_UPLOAD_FOLDER || 'scavenger/entries',
        tags: ['vail-scavenger'],
        public_id: publicId,
        context: { caption: title },
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            publicId: result!.public_id,
            secureUrl: result!.secure_url,
            title: title
          });
        }
      }
    ).end(fileBuffer);
  });
}

// Helper function to create proper multi-image collage using Cloudinary transformations
function createCollageUrlNew(uploadedImages: UploadedImage[]): string {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  
  if (uploadedImages.length === 0) {
    return '';
  }
  
  console.log('🔧 Creating collage with images:', uploadedImages.map(img => img.publicId));
  
  if (uploadedImages.length === 1) {
    // Single image - return with proper sizing
    const url = `https://res.cloudinary.com/${cloudName}/image/upload/w_800,h_600,c_fit/${uploadedImages[0].publicId}`;
    console.log('🔧 Generated single image URL:', url);
    return url;
  }
  
  // For multiple images, create a proper side-by-side collage
  const baseImage = uploadedImages[0];
  const basePublicId = encodeURIComponent(baseImage.publicId);
  
  let transformations = [];
  
  if (uploadedImages.length === 2) {
    // Two images side by side
    const secondPublicId = uploadedImages[1].publicId.replace(/\//g, ':');  // Convert to colon format
    
    transformations = [
      'w_400,h_600,c_fill',  // Resize base image
      `l_${secondPublicId},w_400,h_600,c_fill,x_400,fl_layer_apply`  // Add second image to the right
    ];
  } else {
    // Three images in a row (most common case for 2-stop hunt)
    const imageWidth = 267;  // 800px / 3 images
    const imageHeight = 400;
    
    transformations = [
      `w_${imageWidth},h_${imageHeight},c_fill`  // Resize base image
    ];
    
    // Add remaining images
    for (let i = 1; i < Math.min(uploadedImages.length, 3); i++) {
      const publicId = uploadedImages[i].publicId.replace(/\//g, ':');  // Convert to colon format
      const xPosition = i * imageWidth;
      transformations.push(`l_${publicId},w_${imageWidth},h_${imageHeight},c_fill,x_${xPosition},fl_layer_apply`);
    }
  }
  
  const url = `https://res.cloudinary.com/${cloudName}/image/upload/${transformations.join('/')}/${basePublicId}`;
  console.log('🔧 Generated collage URL:', url);
  
  return url;
}

// Main collage endpoint
export const createCollageHandler = async (req: Request, res: Response): Promise<void> => {
  console.log('🔧 CollageHandler called - Environment check:');
  console.log('  CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME || 'MISSING');
  console.log('  CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? 'PRESENT' : 'MISSING');
  console.log('  CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? 'PRESENT' : 'MISSING');
  
  // Configure Cloudinary with current environment variables
  console.log('⚙️  Configuring Cloudinary...');
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log('✅ Cloudinary configured');
  
  try {
    const files = req.files as Express.Multer.File[];
    const titlesParam = req.body.titles;
    
    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No photos provided' });
      return;
    }
    
    if (!titlesParam) {
      res.status(400).json({ error: 'No titles provided' });
      return;
    }
    
    let titles: string[];
    try {
      titles = JSON.parse(titlesParam);
    } catch {
      res.status(400).json({ error: 'Invalid titles format - must be JSON array' });
      return;
    }
    
    if (titles.length !== files.length) {
      res.status(400).json({ error: 'Number of titles must match number of photos' });
      return;
    }
    
    // Upload all files to Cloudinary
    console.log(`Uploading ${files.length} files to Cloudinary...`);
    const uploadPromises = files.map((file, index) => 
      uploadToCloudinary(file.buffer, titles[index], index)
    );
    
    const uploaded = await Promise.all(uploadPromises);
    console.log('All files uploaded successfully');
    
    // Create collage URL
    const collageUrl = createCollageUrlNew(uploaded);
    console.log('Collage URL created:', collageUrl);
    
    const response: CollageResponse = {
      collageUrl,
      uploaded
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('Collage creation error:', error);
    res.status(500).json({ 
      error: 'Failed to create collage',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Express router setup
const router = express.Router();
router.post('/collage', upload.array('photos[]'), createCollageHandler);

export default router;