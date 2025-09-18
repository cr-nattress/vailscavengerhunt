/**
 * DualWriteService - Always writes to localStorage, always POSTs to /api/kv/upsert
 * Implements the dual-write pattern with Netlify Blobs backend
 */
import { LocalStorageService } from './LocalStorageService.js';
import { apiClient } from '../services/apiClient';
import { 
  KVUpsertSchema,
  KVGetResponseSchema,
  KVListResponseSchema,
  validateSchema,
  type KVUpsert,
  type KVGetResponse,
  type KVListResponse
} from '../types/schemas';

interface DualWriteResult {
  localStorage: boolean;
  server: boolean;
  errors: string[];
}

export class DualWriteService {
  /**
   * Set a key-value pair (dual write: localStorage + server)
   * @param key - The key to set
   * @param value - The value to store
   * @param indexes - Optional index entries for search
   * @returns Promise resolving to results from both storage methods
   */
  static async set(key: string, value: any, indexes: Array<{ key: string; member: string }> = []): Promise<DualWriteResult> {
    const results: DualWriteResult = {
      localStorage: false,
      server: false,
      errors: []
    };

    // Always write to localStorage first (fast, synchronous UX)
    try {
      if (LocalStorageService.set(key, value)) {
        results.localStorage = true;
        console.log(`✅ DualWrite localStorage: ${key}`);
      } else {
        results.errors.push('localStorage failed (quota exceeded?)');
      }
    } catch (error) {
      results.errors.push(`localStorage error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Always POST to server via apiClient
    try {
      const payload: KVUpsert = {
        key,
        value,
        indexes: indexes.length > 0 ? indexes : undefined
      };

      // Validate payload before sending
      const validatedPayload = validateSchema(KVUpsertSchema, payload, 'KV upsert payload');

      const result = await apiClient.post<unknown>('/kv/upsert', validatedPayload);
      
      results.server = true;
      console.log(`✅ DualWrite server: ${key}`, result);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown server error';
      results.errors.push(`Server error: ${errorMessage}`);
      console.error(`❌ DualWrite server failed for ${key}:`, errorMessage);
    }

    return results;
  }

  /**
   * Get a value by key (tries localStorage first, then server as fallback)
   * @param key - The key to retrieve
   * @returns Promise resolving to the stored value, or null if not found
   */
  static async get(key: string): Promise<any> {
    console.log(`🔍 DualWrite get: ${key}`);

    // Try localStorage first (fast)
    try {
      const localValue = LocalStorageService.get(key);
      if (localValue !== null) {
        console.log(`✅ DualWrite found in localStorage: ${key}`);
        return localValue;
      }
    } catch (error) {
      console.warn(`⚠️ localStorage get failed for ${key}:`, error);
    }

    // Fallback to server
    try {
      console.log(`🌐 DualWrite fallback to server: ${key}`);
      
      const rawResponse = await apiClient.get<unknown>(`/kv-get/${encodeURIComponent(key)}`);
      const response = validateSchema(KVGetResponseSchema, rawResponse, 'KV get response');

      if (response.exists && response.value !== null) {
        console.log(`✅ DualWrite found on server: ${key}`);
        
        // Try to cache in localStorage for next time
        try {
          LocalStorageService.set(key, response.value);
        } catch (error) {
          console.warn(`⚠️ Failed to cache server value in localStorage:`, error);
        }
        
        return response.value;
      }

    } catch (error) {
      console.error(`❌ DualWrite server get failed for ${key}:`, error);
    }

    console.log(`❌ DualWrite not found: ${key}`);
    return null;
  }

  /**
   * List all keys (server-side operation)
   * @param includeValues - Whether to include values in the response
   * @returns Promise resolving to array of keys or key-value pairs
   */
  static async list(includeValues = false): Promise<string[] | Array<{ key: string; value: any }>> {
    try {
      console.log(`📋 DualWrite list (includeValues: ${includeValues})`);

      const endpoint = `/kv-list${includeValues ? '?includeValues=true' : ''}`;
      const rawResponse = await apiClient.get<unknown>(endpoint);
      const response = validateSchema(KVListResponseSchema, rawResponse, 'KV list response');

      if (includeValues) {
        // Response should include values, but our schema doesn't support this yet
        // For now, return the raw response if it has the expected structure
        if (Array.isArray((rawResponse as any).items)) {
          return (rawResponse as any).items;
        }
      }

      return response.keys;

    } catch (error) {
      console.error('❌ DualWrite list failed:', error);
      throw error;
    }
  }

  /**
   * Delete a key from both localStorage and server
   * @param key - The key to delete
   * @returns Promise resolving to deletion results
   */
  static async delete(key: string): Promise<DualWriteResult> {
    const results: DualWriteResult = {
      localStorage: false,
      server: false,
      errors: []
    };

    // Delete from localStorage
    try {
      LocalStorageService.delete(key);
      results.localStorage = true;
      console.log(`✅ DualWrite localStorage delete: ${key}`);
    } catch (error) {
      results.errors.push(`localStorage delete error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Delete from server
    try {
      await apiClient.delete(`/kv-delete/${encodeURIComponent(key)}`);
      results.server = true;
      console.log(`✅ DualWrite server delete: ${key}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown server error';
      results.errors.push(`Server delete error: ${errorMessage}`);
      console.error(`❌ DualWrite server delete failed for ${key}:`, errorMessage);
    }

    return results;
  }

  /**
   * Create a new session record
   * @param sessionId - Unique session identifier
   * @param sessionData - Session data to store
   * @returns Promise resolving to storage results
   */
  static async createSession(sessionId: string, sessionData: any): Promise<DualWriteResult> {
    const sessionKey = `session:${sessionId}`;
    const indexes = [
      { key: 'index:sessions', member: sessionId },
      { key: 'index:sessions-by-location', member: `${sessionData.location}:${sessionId}` }
    ];

    return this.set(sessionKey, sessionData, indexes);
  }

  /**
   * Save app settings
   * @param settings - Settings object to save
   * @returns Promise resolving to storage results
   */
  static async saveSettings(settings: any): Promise<DualWriteResult> {
    const key = 'app-settings';
    const indexes = [
      { key: 'index:settings', member: 'app-settings' }
    ];

    return this.set(key, settings, indexes);
  }
}