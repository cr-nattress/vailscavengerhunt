export interface CollageUpload {
  publicId: string;
  secureUrl: string;
  title: string;
}

export interface CollageResponse {
  collageUrl: string;
  uploaded: CollageUpload[];
}

export class CollageService {
  private static readonly API_BASE = import.meta.env?.VITE_API_URL || 'http://localhost:3002';
  
  /**
   * Creates a collage from uploaded photos and their titles
   * @param files Array of image files to upload
   * @param titles Array of location titles (must match files.length)
   * @returns Promise resolving to the collage URL
   */
  static async createCollage(files: File[], titles: string[]): Promise<string> {
    console.log('🚀 CollageService.createCollage() called');
    console.log('  API_BASE:', this.API_BASE);
    console.log('  Files count:', files.length);
    console.log('  Titles count:', titles.length);
    
    if (files.length === 0) {
      throw new Error('No files provided');
    }
    
    if (files.length !== titles.length) {
      throw new Error('Number of titles must match number of files');
    }
    
    // Validate file types
    const invalidFiles = files.filter(file => !file.type.startsWith('image/'));
    if (invalidFiles.length > 0) {
      console.error('❌ Invalid file types found:', invalidFiles.map(f => ({ name: f.name, type: f.type })));
      throw new Error('All files must be images');
    }
    
    console.log('✅ File validation passed');
    
    // Create FormData
    console.log('📦 Creating FormData...');
    const formData = new FormData();
    
    // Add files
    files.forEach((file, index) => {
      console.log(`  Adding file ${index}: ${file.name} (${file.size} bytes, ${file.type})`);
      formData.append('photos[]', file);
    });
    
    // Add titles as JSON string
    const titlesJson = JSON.stringify(titles);
    console.log('📝 Adding titles as JSON:', titlesJson);
    formData.append('titles', titlesJson);
    
    console.log('🌐 Making HTTP request...');
    const url = `${this.API_BASE}/api/collage`;
    console.log('  URL:', url);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });
      
      console.log('📥 Response received:');
      console.log('  Status:', response.status);
      console.log('  Status Text:', response.statusText);
      console.log('  OK:', response.ok);
      
      if (!response.ok) {
        console.log('❌ Response not OK, attempting to parse error...');
        let errorData;
        try {
          errorData = await response.json();
          console.log('  Error data:', errorData);
        } catch (parseError) {
          console.log('  Failed to parse error response as JSON:', parseError);
          errorData = {};
        }
        
        const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        console.error('❌ Server error:', errorMessage);
        throw new Error(errorMessage);
      }
      
      console.log('✅ Response OK, parsing JSON...');
      const data: CollageResponse = await response.json();
      console.log('📊 Response data:', data);
      console.log('🎨 Collage URL:', data.collageUrl);
      
      return data.collageUrl;
      
    } catch (error) {
      console.error('💥 Fetch error occurred:', error);
      if (error instanceof Error) {
        console.error('  Error name:', error.name);
        console.error('  Error message:', error.message);
        throw error;
      }
      throw new Error('Failed to create collage: Network error');
    }
  }
  
  /**
   * Creates a collage with full response data
   * @param files Array of image files to upload
   * @param titles Array of location titles
   * @returns Promise resolving to full collage response
   */
  static async createCollageWithDetails(files: File[], titles: string[]): Promise<CollageResponse> {
    if (files.length === 0) {
      throw new Error('No files provided');
    }
    
    if (files.length !== titles.length) {
      throw new Error('Number of titles must match number of files');
    }
    
    const formData = new FormData();
    files.forEach(file => formData.append('photos[]', file));
    formData.append('titles', JSON.stringify(titles));
    
    try {
      const response = await fetch(`${this.API_BASE}/collage`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
      
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to create collage: Network error');
    }
  }
  
  /**
   * Resizes an image file before upload to reduce file size
   * @param file The image file to resize
   * @param maxWidth Maximum width (default: 1600)
   * @param quality Image quality 0-1 (default: 0.8)
   * @returns Promise resolving to resized File
   */
  static async resizeImage(file: File, maxWidth = 1600, quality = 0.8): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        if (ratio >= 1) {
          // Image is already small enough
          resolve(file);
          return;
        }
        
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const resizedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(resizedFile);
          } else {
            resolve(file);
          }
        }, 'image/jpeg', quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  }
  
  /**
   * Batch resize multiple images
   * @param files Array of image files
   * @param maxWidth Maximum width
   * @param quality Image quality
   * @returns Promise resolving to array of resized files
   */
  static async resizeImages(files: File[], maxWidth = 1600, quality = 0.8): Promise<File[]> {
    const resizePromises = files.map(file => this.resizeImage(file, maxWidth, quality));
    return Promise.all(resizePromises);
  }
}