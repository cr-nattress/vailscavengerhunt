export interface PhotoUploadResponse {
  photoUrl: string;
  publicId: string;
  locationSlug: string;
  title: string;
  uploadedAt: string;
}

export interface PhotoRecord {
  photoUrl: string;
  publicId: string;
  locationSlug: string;
  title: string;
  uploadedAt: string;
  locationId: string;
}

export class PhotoUploadService {
  private static get API_BASE(): string {
    console.log('🔍 PhotoUploadService.API_BASE getter called');
    
    if (typeof window !== 'undefined') {
      console.log('🌐 Window available, checking environment...');
      console.log('  - window.location.hostname:', window.location.hostname);
      console.log('  - window.location.origin:', window.location.origin);
      console.log('  - window.location.port:', window.location.port);
      
      // Check for explicit API URL from environment first
      const apiUrl = import.meta.env?.VITE_API_URL;
      console.log('  - import.meta.env.VITE_API_URL:', apiUrl);
      
      if (apiUrl) {
        console.log('✅ Using VITE_API_URL:', apiUrl);
        return apiUrl;
      }
      
      // In production, use relative URLs
      if (window.location.hostname !== 'localhost') {
        console.log('✅ Production mode detected, using relative URLs');
        return '';
      }
      
      // In development, use the current origin as fallback
      const origin = window.location.origin;
      console.log('✅ Development mode, using origin:', origin);
      return origin;
    }
    
    console.log('⚠️ Window not available, returning empty string');
    return '';
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
    console.log('  API_BASE:', this.API_BASE);
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
    
    console.log('📦 FormData created with tags');
    
    // Make request to photo upload endpoint
    const apiBase = this.API_BASE;
    console.log('🔧 API_BASE value:', apiBase);
    console.log('🔧 API_BASE === empty string:', apiBase === '');
    
    // In development, use local Express API server on port 3001
    // In production, use Netlify Functions
    let url: string;
    if (window.location.hostname === 'localhost') {
      // Development: use Express API server
      url = 'http://localhost:3001/api/photo-upload';
      console.log('🔧 Development mode: using Express API server');
    } else {
      // Production: use Netlify Functions
      url = '/.netlify/functions/photo-upload';
      console.log('🔧 Production mode: using Netlify Functions');
    }
    
    console.log('🌐 Constructed URL:', url);
    console.log('🌐 Final request URL will be:', url);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
        },
        body: formData,
      });
      
      console.log('📥 Response received:');
      console.log('  Status:', response.status);
      console.log('  Status Text:', response.statusText);
      console.log('  OK:', response.ok);
      
      if (!response.ok) {
        console.log('❌ Response not OK, parsing error...');
        let errorData;
        try {
          errorData = await response.json();
          console.log('  Error data:', errorData);
        } catch (parseError) {
          console.log('  Failed to parse error response:', parseError);
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        
        throw new Error(errorData.error || `Upload failed: ${response.statusText}`);
      }
      
      console.log('✅ Response OK, parsing JSON...');
      const data: PhotoUploadResponse = await response.json();
      console.log('📊 Upload successful:', data);
      
      return data;
      
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
   * Get all photos for a session
   * @param sessionId The session ID
   * @returns Promise resolving to array of photo records
   */
  static async getSessionPhotos(sessionId: string): Promise<PhotoRecord[]> {
    try {
      const key = `session-photos:${sessionId}`;
      const stored = localStorage.getItem(key);
      
      if (!stored) {
        return [];
      }
      
      return JSON.parse(stored);
      
    } catch (error) {
      console.error('Failed to get session photos:', error);
      return [];
    }
  }
  
  /**
   * Save photos for a session
   * @param sessionId The session ID
   * @param photos Array of photo records
   */
  private static async saveSessionPhotos(
    sessionId: string, 
    photos: PhotoRecord[]
  ): Promise<void> {
    try {
      const key = `session-photos:${sessionId}`;
      localStorage.setItem(key, JSON.stringify(photos));
      
    } catch (error) {
      console.error('Failed to save session photos:', error);
      throw error;
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
   * Clear all photos for a session
   * @param sessionId The session ID
   */
  static async clearSessionPhotos(sessionId: string): Promise<void> {
    try {
      const key = `session-photos:${sessionId}`;
      localStorage.removeItem(key);
      console.log(`🗑️ Cleared photos for session ${sessionId}`);
      
    } catch (error) {
      console.error('Failed to clear session photos:', error);
    }
  }
}