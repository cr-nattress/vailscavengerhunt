import { apiClient } from '../services/apiClient'
import { 
  CollageResponseSchema, 
  CollageFromIdsResponseSchema,
  UploadMetaSchema,
  validateSchema,
  type CollageResponse,
  type CollageFromIdsResponse,
  type UploadMeta
} from '../types/schemas'

// Legacy interface for backward compatibility
export interface CollageUpload {
  publicId: string;
  secureUrl: string;
  title: string;
}

// Legacy interface for backward compatibility  
export interface UploadMetadata {
  dateISO: string;
  locationSlug: string;
  teamSlug: string;
  sessionId: string;
}

export class CollageService {
  /**
   * Creates a collage from uploaded photos and their titles
   * @param files Array of image files to upload
   * @param titles Array of location titles (must match files.length)
   * @param metadata Upload metadata for folder structure and tags (optional)
   * @returns Promise resolving to the collage URL
   */
  static async createCollage(files: File[], titles: string[], metadata?: UploadMetadata): Promise<string> {
    console.log('🚀 CollageService.createCollage() called');
    console.log('  Files count:', files.length);
    console.log('  Titles count:', titles.length);
    console.log('  Metadata:', metadata);
    
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
    
    // Add metadata if provided
    if (metadata) {
      console.log('📝 Adding metadata:', metadata);
      formData.append('metadata', JSON.stringify(metadata));
    }
    
    try {
      console.log('🌐 Making API request via apiClient...');
      
      const rawResponse = await apiClient.requestFormData<unknown>('/collage', formData, {
        timeout: 60000, // 60 second timeout for file uploads
        retryAttempts: 2
      });
      
      // Validate response with schema
      const response = validateSchema(CollageResponseSchema, rawResponse, 'collage creation');
      
      console.log('📊 Response validated:', response);
      console.log('🎨 Collage URL:', response.collageUrl);
      
      return response.collageUrl;
      
    } catch (error) {
      console.error('💥 Collage creation error:', error);
      throw error;
    }
  }
  
  /**
   * Creates a collage with full response data
   * @param files Array of image files to upload
   * @param titles Array of location titles
   * @returns Promise resolving to full collage response
   */
  static async createCollageWithDetails(files: File[], titles: string[]): Promise<CollageResponse> {
    console.log('🚀 CollageService.createCollageWithDetails() called');
    
    if (files.length === 0) {
      throw new Error('No files provided');
    }
    
    if (files.length !== titles.length) {
      throw new Error('Number of titles must match number of files');
    }
    
    // Validate file types
    const invalidFiles = files.filter(file => !file.type.startsWith('image/'));
    if (invalidFiles.length > 0) {
      throw new Error('All files must be images');
    }
    
    const formData = new FormData();
    files.forEach(file => formData.append('photos[]', file));
    formData.append('titles', JSON.stringify(titles));
    
    try {
      const rawResponse = await apiClient.requestFormData<unknown>('/collage', formData, {
        timeout: 60000,
        retryAttempts: 2
      });
      
      // Validate and return full response
      return validateSchema(CollageResponseSchema, rawResponse, 'collage creation with details');
      
    } catch (error) {
      console.error('💥 Collage creation with details error:', error);
      throw error;
    }
  }

  /**
   * Creates a collage from existing Cloudinary public IDs
   * @param publicIds Array of Cloudinary public IDs
   * @param metadata Optional upload metadata
   * @returns Promise resolving to collage from IDs response
   */
  static async createCollageFromIds(publicIds: string[], metadata?: UploadMeta): Promise<CollageFromIdsResponse> {
    console.log('🚀 CollageService.createCollageFromIds() called');
    console.log('  Public IDs count:', publicIds.length);
    console.log('  Metadata:', metadata);
    
    if (publicIds.length === 0) {
      throw new Error('No public IDs provided');
    }
    
    const requestData = {
      publicIds,
      metadata: metadata ? validateSchema(UploadMetaSchema, metadata, 'upload metadata') : undefined
    };
    
    try {
      const rawResponse = await apiClient.post<unknown>('/collage-from-ids', requestData, {
        timeout: 30000,
        retryAttempts: 2
      });
      
      return validateSchema(CollageFromIdsResponseSchema, rawResponse, 'collage from IDs');
      
    } catch (error) {
      console.error('💥 Collage from IDs creation error:', error);
      throw error;
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