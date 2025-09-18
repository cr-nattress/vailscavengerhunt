import { apiClient } from '../services/apiClient'
import { ServerStorageService } from '../services/ServerStorageService'
import {
  UploadResponseSchema,
  PhotoRecordSchema,
  validateSchema,
  type UploadResponse,
  type PhotoRecord
} from '../types/schemas'

// Re-export types for backward compatibility
export type PhotoUploadResponse = UploadResponse
export type { PhotoRecord }

export class PhotoUploadService {
  
  /**
   * Upload a single photo for a specific location
   * @param file The image file to upload
   * @param locationTitle The title of the location
   * @param sessionId The current session ID
   * @param teamName The team name for tagging (optional)
   * @param locationName The location name for tagging (optional, e.g., 'Vail Village', 'BHHS')
   * @param eventName The event name for tagging (optional)
   * @returns Promise resolving to photo upload response
   */
  static async uploadPhoto(
    file: File, 
    locationTitle: string, 
    sessionId: string,
    teamName?: string,
    locationName?: string,
    eventName?: string
  ): Promise<PhotoUploadResponse> {
    console.log('📸 PhotoUploadService.uploadPhoto() called');
    console.log('  File:', { name: file.name, size: file.size, type: file.type });
    console.log('  Location:', locationTitle);
    console.log('  Session:', sessionId);
    console.log('  Team:', teamName);
    console.log('  Location Name:', locationName);
    console.log('  Event Name:', eventName);
    
    // Validate inputs
    if (!file) {
      throw new Error('No file provided');
    }
    
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }
    
    if (!locationTitle) {
      throw new Error('Location title is required');
    }
    
    if (!sessionId) {
      throw new Error('Session ID is required');
    }
    
    console.log('✅ Input validation passed');
    
    // Create FormData
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('locationTitle', locationTitle);
    formData.append('sessionId', sessionId);
    if (teamName) formData.append('teamName', teamName);
    if (locationName) formData.append('locationName', locationName);
    if (eventName) formData.append('eventName', eventName);
    
    console.log('📦 FormData created with metadata');
    
    try {
      console.log('🌐 Making API request via apiClient...');
      
      const rawResponse = await apiClient.requestFormData<unknown>('/photo-upload', formData, {
        timeout: 60000, // 60 second timeout for file uploads
        retryAttempts: 2
      });
      
      // Validate response with schema
      const response = validateSchema(UploadResponseSchema, rawResponse, 'photo upload');
      
      console.log('📊 Upload successful:', response);
      
      return response;
      
    } catch (error) {
      console.error('💥 Upload error:', error);
      throw error;
    }
  }
  
  /**
   * Upload a photo with automatic resizing for better performance
   * @param file The image file to upload
   * @param locationTitle The title of the location
   * @param sessionId The current session ID
   * @param maxWidth Maximum width for resizing (default: 1600)
   * @param quality Image quality (default: 0.8)
   * @param teamName The team name for tagging (optional)
   * @param locationName The location name for tagging (optional, e.g., 'Vail Village', 'BHHS')
   * @param eventName The event name for tagging (optional)
   * @returns Promise resolving to photo upload response
   */
  static async uploadPhotoWithResize(
    file: File,
    locationTitle: string,
    sessionId: string,
    maxWidth = 1600,
    quality = 0.8,
    teamName?: string,
    locationName?: string,
    eventName?: string
  ): Promise<PhotoUploadResponse> {
    console.log('🔄 Resizing image before upload...');
    
    const resizedFile = await this.resizeImage(file, maxWidth, quality);
    console.log(`📏 Resized: ${file.size} → ${resizedFile.size} bytes`);
    
    return this.uploadPhoto(resizedFile, locationTitle, sessionId, teamName, locationName, eventName);
  }
  
  /**
   * Check if a location already has a photo uploaded for the session
   * @param locationId The location ID to check
   * @param sessionId The current session ID
   * @returns Promise resolving to existing photo record or null
   */
  static async getExistingPhoto(
    locationId: string, 
    sessionId: string
  ): Promise<PhotoRecord | null> {
    try {
      // Get session photos from storage
      const sessionPhotos = await this.getSessionPhotos(sessionId);
      
      // Find photo for this location
      const existingPhoto = sessionPhotos.find(photo => photo.locationId === locationId);
      
      return existingPhoto || null;
      
    } catch (error) {
      console.warn('Failed to check existing photo:', error);
      return null;
    }
  }
  
  /**
   * Save photo record to session storage
   * @param photoResponse The photo upload response
   * @param locationId The location ID
   * @param sessionId The current session ID
   */
  static async savePhotoRecord(
    photoResponse: PhotoUploadResponse,
    locationId: string,
    sessionId: string
  ): Promise<void> {
    try {
      const photoRecord: PhotoRecord = {
        ...photoResponse,
        locationId
      };
      
      // Get existing session photos
      const sessionPhotos = await this.getSessionPhotos(sessionId);
      
      // Remove any existing photo for this location (replace)
      const updatedPhotos = sessionPhotos.filter(photo => photo.locationId !== locationId);
      updatedPhotos.push(photoRecord);
      
      // Save back to storage
      await this.saveSessionPhotos(sessionId, updatedPhotos);
      
      console.log(`✅ Photo record saved for location ${locationId}`);
      
    } catch (error) {
      console.error('Failed to save photo record:', error);
      throw error;
    }
  }
  
  /**
   * Get all photos for a session from server storage
   * @param sessionId The session ID
   * @returns Promise resolving to array of photo records
   */
  static async getSessionPhotos(sessionId: string): Promise<PhotoRecord[]> {
    try {
      const key = `photos/${sessionId}`;
      const stored = await ServerStorageService.get(key);

      if (!stored) {
        return [];
      }

      return stored;

    } catch (error) {
      console.error('Failed to get session photos from server:', error);
      return [];
    }
  }
  
  /**
   * Save photos for a session to server storage
   * @param sessionId The session ID
   * @param photos Array of photo records
   */
  private static async saveSessionPhotos(
    sessionId: string,
    photos: PhotoRecord[]
  ): Promise<void> {
    try {
      const key = `photos/${sessionId}`;
      const result = await ServerStorageService.set(key, photos, sessionId);

      if (!result.success) {
        throw new Error(result.error || 'Failed to save photos to server');
      }

      console.log(`✅ Photos saved to server for session ${sessionId}`);

    } catch (error) {
      console.error('Failed to save session photos to server:', error);
      // Don't throw - allow the app to continue even if server save fails
      // Photos are already uploaded to Cloudinary
    }
  }
  
  /**
   * Resize an image file before upload
   * @param file The image file to resize
   * @param maxWidth Maximum width (default: 1600)
   * @param quality Image quality 0-1 (default: 0.8)
   * @returns Promise resolving to resized File
   */
  private static async resizeImage(
    file: File, 
    maxWidth = 1600, 
    quality = 0.8
  ): Promise<File> {
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
   * Clear all photos for a session from server storage
   * @param sessionId The session ID
   */
  static async clearSessionPhotos(sessionId: string): Promise<void> {
    try {
      const key = `photos/${sessionId}`;
      const result = await ServerStorageService.delete(key);

      if (result.success) {
        console.log(`🗑️ Cleared photos from server for session ${sessionId}`);
      } else {
        console.warn(`Failed to clear photos from server: ${result.error}`);
      }

    } catch (error) {
      console.error('Failed to clear session photos from server:', error);
    }
  }
}