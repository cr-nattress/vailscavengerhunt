import { apiClient } from '../services/apiClient'
import { ServerStorageService } from '../services/ServerStorageService'
import { LoginService } from '../services/LoginService'
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
   * Generate an idempotency key for deduplication
   * @param file The image file
   * @param sessionId The session ID
   * @param locationTitle The location title
   * @returns Promise resolving to idempotency key
   */
  private static async generateIdempotencyKey(
    file: File,
    sessionId: string,
    locationTitle: string
  ): Promise<string> {
    try {
      // Read file as array buffer
      const buffer = await file.arrayBuffer()
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)

      // Convert to hex string
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

      // Combine with session and location for uniqueness
      const combined = `${hashHex}-${sessionId}-${locationTitle}`
      const combinedBuffer = new TextEncoder().encode(combined)
      const finalHash = await crypto.subtle.digest('SHA-256', combinedBuffer)

      // Return first 16 chars of hash
      const finalArray = Array.from(new Uint8Array(finalHash))
      return finalArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16)
    } catch (error) {
      // Fallback to random UUID if crypto fails
      console.warn('Failed to generate hash-based idempotency key:', error)
      return crypto.randomUUID().replace(/-/g, '').substring(0, 16)
    }
  }

  /**
   * Upload a photo using the orchestrated endpoint (with saga/compensation)
   * @param file The image file to upload
   * @param locationTitle The title of the location
   * @param sessionId The current session ID
   * @param locationId The canonical location ID
   * @param teamId The team ID
   * @param orgId The organization ID
   * @param huntId The hunt ID
   * @param teamName The team name for tagging (optional)
   * @param locationName The location name for tagging (optional)
   * @param eventName The event name for tagging (optional)
   * @returns Promise resolving to photo upload response
   */
  static async uploadPhotoOrchestrated(
    file: File,
    locationTitle: string,
    sessionId: string,
    locationId: string,
    teamId: string,
    orgId: string,
    huntId: string,
    teamName?: string,
    locationName?: string,
    eventName?: string
  ): Promise<PhotoUploadResponse> {
    console.log('📸 PhotoUploadService.uploadPhotoOrchestrated() called')

    // Validate inputs
    if (!file) {
      throw new Error('No file provided')
    }

    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image')
    }

    if (!locationTitle || !sessionId || !locationId || !teamId) {
      throw new Error('Required fields missing: locationTitle, sessionId, locationId, teamId')
    }

    // Generate idempotency key
    const idempotencyKey = await this.generateIdempotencyKey(file, sessionId, locationTitle)
    console.log('🔑 Generated idempotency key:', idempotencyKey)

    // Create FormData
    const formData = new FormData()
    formData.append('photo', file)
    formData.append('locationTitle', locationTitle)
    formData.append('locationId', locationId)
    formData.append('sessionId', sessionId)
    formData.append('teamId', teamId)
    formData.append('orgId', orgId)
    formData.append('huntId', huntId)
    formData.append('idempotencyKey', idempotencyKey)
    if (teamName) formData.append('teamName', teamName)
    if (locationName) formData.append('locationName', locationName)
    if (eventName) formData.append('eventName', eventName)

    console.log('📦 FormData created for orchestrated upload')

    try {
      console.log('🌐 Making orchestrated API request...')

      const rawResponse = await apiClient.requestFormData<unknown>('/photo-upload-orchestrated', formData, {
        timeout: 60000, // 60 second timeout
        retryAttempts: 2
      })

      console.log('🔍 Orchestrated response received:', rawResponse)

      // Validate response with schema
      const response = validateSchema(UploadResponseSchema, rawResponse, 'orchestrated photo upload')

      console.log('📊 Orchestrated upload successful:', response)

      return response

    } catch (error: unknown) {
      console.error('💥 Orchestrated upload error:', error)
      throw error
    }
  }

  /**
   * Upload a photo directly to Cloudinary using unsigned upload
   * @param file The image file to upload
   * @param locationTitle The title of the location
   * @param sessionId The current session ID
   * @param teamName The team name for tagging (optional)
   * @param locationName The location name for tagging (optional)
   * @param eventName The event name for tagging (optional)
   * @returns Promise resolving to photo upload response
   */
  static async uploadPhotoUnsigned(
    file: File,
    locationTitle: string,
    sessionId: string,
    teamName?: string,
    locationName?: string,
    eventName?: string
  ): Promise<PhotoUploadResponse> {
    console.log('📸 PhotoUploadService.uploadPhotoUnsigned() called');

    const cachedCfg = LoginService.getCachedConfig()
    const env: any = (import.meta as any)?.env || {}
    const cloudName = cachedCfg?.CLOUDINARY_CLOUD_NAME || env.VITE_CLOUDINARY_CLOUD_NAME
    const uploadPreset = cachedCfg?.CLOUDINARY_UNSIGNED_PRESET || env.VITE_CLOUDINARY_UNSIGNED_PRESET

    if (!cloudName || !uploadPreset) {
      throw new Error('Cloudinary unsigned upload not configured. Missing CLOUDINARY_CLOUD_NAME or CLOUDINARY_UNSIGNED_PRESET');
    }

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

    console.log('✅ Input validation passed for unsigned upload');

    // Generate location slug
    const locationSlug = locationTitle
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      .replace(/^-|-$/g, '');

    // Create FormData
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    // Add context metadata
    const context = {
      sessionId,
      timestamp: new Date().toISOString(),
      location: locationSlug,
      ...(teamName && { team: teamName }),
      ...(locationName && { locationName }),
      ...(eventName && { event: eventName })
    };

    // Convert context to string format Cloudinary expects
    const contextString = Object.entries(context)
      .map(([key, value]) => `${key}=${value}`)
      .join('|');

    formData.append('context', contextString);

    // Add tags
    const tags = ['scavenger-hunt', locationSlug, sessionId];
    if (teamName) tags.push(teamName);
    formData.append('tags', tags.join(','));

    // Add public_id
    const timestamp = Date.now();
    const publicId = `${locationSlug}_${sessionId}_${timestamp}`;
    formData.append('public_id', publicId);

    // Add folder
    const folder = (cachedCfg?.CLOUDINARY_UPLOAD_FOLDER || env.VITE_CLOUDINARY_UPLOAD_FOLDER) || 'scavenger/entries';
    formData.append('folder', folder);

    console.log('📦 FormData created for unsigned upload');
    console.log('🌐 Uploading directly to Cloudinary...');

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Cloudinary upload failed: ${error}`);
      }

      const data = await response.json();

      console.log('📊 Unsigned upload successful:', data);

      // Format response to match our schema
      const uploadResponse: UploadResponse = {
        photoUrl: data.secure_url,
        publicId: data.public_id,
        locationSlug,
        title: locationTitle,
        uploadedAt: new Date().toISOString()
      };

      return uploadResponse;

    } catch (error) {
      console.error('💥 Unsigned upload error:', error);
      throw error;
    }
  }

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
      console.log('📋 Request details:');
      console.log('  - Endpoint: /photo-upload');
      console.log('  - Method: POST (multipart/form-data)');
      console.log('  - Timeout: 60000ms');
      console.log('  - Retry attempts: 2');

      // Log FormData contents for debugging
      console.log('📦 FormData contents:');
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`  - ${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
        } else {
          console.log(`  - ${key}: ${value}`);
        }
      }

      const rawResponse = await apiClient.requestFormData<unknown>('/photo-upload', formData, {
        timeout: 60000, // 60 second timeout for file uploads
        retryAttempts: 2
      });

      console.log('🔍 Raw response received:', rawResponse);

      // Validate response with schema
      const response = validateSchema(UploadResponseSchema, rawResponse, 'photo upload');

      console.log('📊 Upload successful:', response);

      return response;

    } catch (error: unknown) {
      console.error('💥 Upload error - Full details:', {
        error,
        errorType: error instanceof Error ? error.constructor?.name : typeof error,
        message: error instanceof Error ? error.message : String(error),
        status: (error as any)?.status,
        statusText: (error as any)?.statusText,
        response: (error as any)?.response,
        stack: error instanceof Error ? error.stack : undefined
      });

      // Log specific error information based on error type
      if ( (error as any)?.status ) {
        console.error(`❌ HTTP Error ${(error as any).status}: ${(error as any).statusText}`);
      }
      const _msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
      if (_msg.includes('timeout')) {
        console.error('⏰ Request timed out - photo might be too large or network is slow');
      }
      if (_msg.includes('network')) {
        console.error('🌐 Network error - check internet connection');
      }

      throw error;
    }
  }
  
  /**
   * Upload a photo directly to Cloudinary with automatic resizing
   * @param file The image file to upload
   * @param locationTitle The title of the location
   * @param sessionId The current session ID
   * @param maxWidth Maximum width for resizing (default: 1600)
   * @param quality Image quality (default: 0.8)
   * @param teamName The team name for tagging (optional)
   * @param locationName The location name for tagging (optional)
   * @param eventName The event name for tagging (optional)
   * @returns Promise resolving to photo upload response
   */
  static async uploadPhotoUnsignedWithResize(
    file: File,
    locationTitle: string,
    sessionId: string,
    maxWidth = 1600,
    quality = 0.8,
    teamName?: string,
    locationName?: string,
    eventName?: string
  ): Promise<PhotoUploadResponse> {
    console.log('🔄 Resizing image before unsigned upload...');

    const resizedFile = await this.resizeImage(file, maxWidth, quality);
    console.log(`📏 Resized: ${file.size} → ${resizedFile.size} bytes`);

    return this.uploadPhotoUnsigned(resizedFile, locationTitle, sessionId, teamName, locationName, eventName);
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