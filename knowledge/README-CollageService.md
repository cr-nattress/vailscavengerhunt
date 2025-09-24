# VailLoveHunt CollageService

A complete solution for creating photo collages using Cloudinary for the VailLoveHunt scavenger hunt app.

## Features

- **Cloudinary Integration**: Secure server-side uploads with automatic transformations
- **Automatic Collages**: Creates beautiful grid layouts with location titles
- **Image Optimization**: Automatic resizing and compression for optimal performance
- **React Components**: Ready-to-use uploader component with file validation
- **TypeScript Support**: Full type safety across client and server

## Setup

### 1. Environment Configuration

Create a `.env` file in the root directory:

```bash
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
CLOUDINARY_UPLOAD_FOLDER=scavenger/entries
CLOUDINARY_COLLAGE_WIDTH=2048
CLOUDINARY_COLLAGE_HEIGHT=1152
CLOUDINARY_COLLAGE_BG=#111111
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start the Services

**Development Mode:**
```bash
# Terminal 1: Start React app
npm run dev

# Terminal 2: Start API server
npm run server:dev
```

**Production Mode:**
```bash
npm run build
npm run server
```

## API Reference

### POST /api/collage

Creates a collage from uploaded photos and location titles.

**Request:**
- Content-Type: `multipart/form-data`
- Body:
  - `photos[]`: Image files (max 10)
  - `titles`: JSON string array of location names

**Response:**
```json
{
  "collageUrl": "https://res.cloudinary.com/...",
  "uploaded": [
    {
      "publicId": "scavenger_1234567890_0",
      "secureUrl": "https://res.cloudinary.com/...",
      "title": "Covered Bridge"
    }
  ]
}
```

### Curl Example

```bash
curl -X POST http://localhost:3001/api/collage \
  -F "photos[]=@/path/to/photo1.jpg" \
  -F "photos[]=@/path/to/photo2.jpg" \
  -F "photos[]=@/path/to/photo3.jpg" \
  -F 'titles=["Covered Bridge","Betty Ford Gardens","Eagle Bahn Gondola"]'
```

## Usage in React

### Basic Usage

```tsx
import { CollageUploader } from './src/components/CollageUploader';

function App() {
  const handleCollageCreated = (url: string) => {
    console.log('Collage created:', url);
    // Handle the collage URL (display, save, etc.)
  };

  return (
    <CollageUploader
      onCollageCreated={handleCollageCreated}
      maxImages={10}
    />
  );
}
```

### Using the Service Directly

```tsx
import { CollageService } from './src/client/CollageService';

async function createCollage(files: File[], titles: string[]) {
  try {
    // Resize images for optimal upload
    const resizedFiles = await CollageService.resizeImages(files);
    
    // Create collage
    const collageUrl = await CollageService.createCollage(resizedFiles, titles);
    
    console.log('Collage URL:', collageUrl);
    return collageUrl;
    
  } catch (error) {
    console.error('Failed to create collage:', error);
  }
}
```

### Advanced Usage with Full Response

```tsx
import { CollageService } from './src/client/CollageService';

async function createCollageWithDetails(files: File[], titles: string[]) {
  try {
    const response = await CollageService.createCollageWithDetails(files, titles);
    
    console.log('Collage URL:', response.collageUrl);
    console.log('Uploaded images:', response.uploaded);
    
    // Access individual uploaded images
    response.uploaded.forEach((img, index) => {
      console.log(`${index + 1}. ${img.title}: ${img.secureUrl}`);
    });
    
    return response;
    
  } catch (error) {
    console.error('Failed to create collage:', error);
  }
}
```

## Integration with VailLoveHunt

To integrate with the existing VailLoveHunt app, you can replace the current storybook functionality:

```tsx
// In your App.jsx, replace the buildStorybook function
import { CollageService } from './src/client/CollageService';

// Replace the existing buildStorybook logic
const createRealCollage = async () => {
  const completedStops = STOPS.filter(stop => progress[stop.id]?.photo);
  
  if (completedStops.length === 0) return;
  
  // Extract photos and titles from completed stops
  const photos = completedStops.map(stop => {
    // Convert base64 to File object
    const base64 = progress[stop.id].photo;
    const blob = base64ToBlob(base64);
    return new File([blob], `${stop.id}.jpg`, { type: 'image/jpeg' });
  });
  
  const titles = completedStops.map(stop => stop.title);
  
  try {
    const collageUrl = await CollageService.createCollage(photos, titles);
    setStorybookUrl(collageUrl);
  } catch (error) {
    console.error('Failed to create real collage:', error);
  }
};

// Helper function to convert base64 to Blob
function base64ToBlob(base64: string): Blob {
  const [header, data] = base64.split(',');
  const bytes = atob(data);
  const array = new Uint8Array(bytes.length);
  
  for (let i = 0; i < bytes.length; i++) {
    array[i] = bytes.charCodeAt(i);
  }
  
  return new Blob([array], { type: 'image/jpeg' });
}
```

## File Structure

```
src/
├── client/
│   └── CollageService.ts          # Client-side service
├── components/
│   └── CollageUploader.tsx        # React upload component
└── server/
    ├── server.ts                  # Express server
    └── collageRoute.ts            # Collage API endpoint
```

## Configuration Options

### Cloudinary Settings

- `CLOUDINARY_COLLAGE_WIDTH`: Canvas width (default: 2048)
- `CLOUDINARY_COLLAGE_HEIGHT`: Canvas height (default: 1152)
- `CLOUDINARY_COLLAGE_BG`: Background color (default: #111111)
- `CLOUDINARY_UPLOAD_FOLDER`: Upload directory (default: scavenger/entries)

### Collage Layout

The service automatically creates a grid layout:
- **1-3 images**: Single row
- **4-6 images**: 2 rows × 3 columns
- **7-9 images**: 3 rows × 3 columns
- **10+ images**: Auto-fit with scrolling (future enhancement)

Each image is:
- Cropped to fit using `gravity: auto` for smart cropping
- Padded with background color if aspect ratios don't match
- Labeled with location title below the image

## Error Handling

The service includes comprehensive error handling:

- **Client-side**: File validation, type checking, network errors
- **Server-side**: Upload failures, Cloudinary errors, malformed requests
- **Graceful fallbacks**: Automatic retry logic and user-friendly error messages

## Security

- API keys stored securely on server-side only
- File type validation prevents malicious uploads
- Upload size limits prevent abuse
- CORS configured for secure cross-origin requests

## Testing

### Health Check

```bash
curl http://localhost:3001/health
```

### Upload Test

```bash
# Test with sample images
curl -X POST http://localhost:3001/api/collage \
  -F "photos[]=@./public/images/selfie-guide-1.png" \
  -F "photos[]=@./public/images/selfie-guide-2.png" \
  -F 'titles=["Location 1","Location 2"]'
```

## Troubleshooting

### Common Issues

1. **"Cloudinary not configured"**
   - Check your `.env` file has all required Cloudinary variables
   - Restart the server after adding environment variables

2. **"Failed to create collage"**
   - Verify Cloudinary credentials are correct
   - Check network connectivity
   - Ensure images are valid format (JPEG, PNG, WebP)

3. **Large file uploads failing**
   - Images are automatically resized to 1600px max width
   - Check multer file size limits in `collageRoute.ts`

### Debug Mode

Set `NODE_ENV=development` to see detailed error messages in API responses.

## License

This CollageService is part of the VailLoveHunt application.