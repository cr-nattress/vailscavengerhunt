/**
 * NetlifyStateService - Client for interacting with Netlify Functions + Blobs state storage
 */
import { apiClient } from '../services/apiClient';

interface StateGetResponse {
  key: string;
  value: any;
  exists: boolean;
}

interface StateSetResponse {
  key: string;
  action: 'created' | 'updated';
  success: boolean;
}

interface StateDeleteResponse {
  key: string;
  success: boolean;
}

interface StateListResponse {
  keys: string[];
  total: number;
}

export class NetlifyStateService {
  /**
   * Get a value by key
   * @param key - The key to retrieve
   * @returns Promise resolving to the stored value, or null if not found
   */
  static async get(key: string): Promise<any> {
    try {
      const response = await apiClient.get<StateGetResponse>(`/state-get/${encodeURIComponent(key)}`);
      
      return response.exists ? response.value : null;
      
    } catch (error) {
      // Handle 404 as null (key doesn't exist)
      if (error instanceof Error && (error as any).status === 404) {
        return null;
      }
      
      console.error('NetlifyStateService.get error:', error);
      throw error;
    }
  }

  /**
   * Set a key-value pair (create or update)
   * @param key - The key to set
   * @param value - The value to store
   * @returns Promise resolving to response with action taken
   */
  static async set(key: string, value: any): Promise<StateSetResponse> {
    try {
      const payload = { key, value };
      
      const response = await apiClient.post<StateSetResponse>('/state-set', payload, {
        timeout: 30000,
        retryAttempts: 2
      });
      
      return response;
      
    } catch (error) {
      console.error('NetlifyStateService.set error:', error);
      throw error;
    }
  }

  /**
   * Delete a key
   * @param key - The key to delete
   * @returns Promise resolving to deletion result
   */
  static async delete(key: string): Promise<StateDeleteResponse> {
    try {
      const response = await apiClient.delete<StateDeleteResponse>(`/state-delete/${encodeURIComponent(key)}`);
      
      return response;
      
    } catch (error) {
      console.error('NetlifyStateService.delete error:', error);
      throw error;
    }
  }

  /**
   * List all keys or keys with values
   * @param includeValues - Whether to include values in the response
   * @returns Promise resolving to list of keys or key-value pairs
   */
  static async list(includeValues = false): Promise<string[] | Array<{ key: string; value: any }>> {
    try {
      const endpoint = `/state-list${includeValues ? '?includeValues=true' : ''}`;
      
      if (includeValues) {
        // When including values, the response structure may be different
        const response = await apiClient.get<{ items: Array<{ key: string; value: any }> }>(endpoint);
        return response.items;
      } else {
        const response = await apiClient.get<StateListResponse>(endpoint);
        return response.keys;
      }
      
    } catch (error) {
      console.error('NetlifyStateService.list error:', error);
      throw error;
    }
  }

  /**
   * Check if a key exists
   * @param key - The key to check
   * @returns Promise resolving to boolean indicating if key exists
   */
  static async exists(key: string): Promise<boolean> {
    try {
      const value = await this.get(key);
      return value !== null;
    } catch (error) {
      console.error('NetlifyStateService.exists error:', error);
      return false;
    }
  }

  /**
   * Get multiple keys at once
   * @param keys - Array of keys to retrieve
   * @returns Promise resolving to object mapping keys to values
   */
  static async getMultiple(keys: string[]): Promise<Record<string, any>> {
    const results: Record<string, any> = {};
    
    // Use Promise.allSettled to handle partial failures gracefully
    const promises = keys.map(async (key) => {
      try {
        const value = await this.get(key);
        return { key, value, success: true };
      } catch (error) {
        console.warn(`Failed to get key ${key}:`, error);
        return { key, value: null, success: false };
      }
    });
    
    const settled = await Promise.allSettled(promises);
    
    settled.forEach((result) => {
      if (result.status === 'fulfilled') {
        const { key, value } = result.value;
        results[key] = value;
      }
    });
    
    return results;
  }
}