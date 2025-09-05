/**
 * HybridStorageService - Combines server state storage with localStorage fallback
 * Provides reliable storage with automatic failover and sync capabilities
 */
import { LocalStorageService } from './LocalStorageService.js';

export class HybridStorageService {
  static STATE_SERVER_URL = (import.meta.env?.VITE_API_URL || 'http://localhost:3002') + '/api/state';
  
  /**
   * Get a value by key (tries server first, falls back to localStorage)
   * @param {string} key - The key to retrieve
   * @returns {Promise<any>} The stored value or null if not found
   */
  static async get(key) {
    // Try server first
    try {
      const response = await fetch(`${this.STATE_SERVER_URL}/${key}`);
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Retrieved from server: ${key}`);
        return result.value;
      } else if (response.status === 404) {
        // Key not found on server, try localStorage
        console.log(`🔄 Key not found on server, checking localStorage: ${key}`);
      }
    } catch (error) {
      console.warn(`🔄 Server unavailable, falling back to localStorage for ${key}:`, error.message);
    }

    // Fall back to localStorage
    const localValue = LocalStorageService.get(key);
    if (localValue !== null) {
      console.log(`✅ Retrieved from localStorage: ${key}`);
    }
    return localValue;
  }

  /**
   * Set a key-value pair (saves to both server and localStorage)
   * @param {string} key - The key to set
   * @param {any} value - The value to store
   * @returns {Promise<Object>} Results from both storage methods
   */
  static async set(key, value) {
    const results = {
      server: false,
      localStorage: false,
      errors: []
    };

    // Try server first
    try {
      const response = await fetch(this.STATE_SERVER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key, value })
      });

      if (response.ok) {
        results.server = true;
        console.log(`✅ Saved to server: ${key}`);
      } else {
        const error = await response.json();
        results.errors.push(`Server error: ${error.message || response.statusText}`);
      }
    } catch (error) {
      results.errors.push(`Server unavailable: ${error.message}`);
      console.warn(`🔄 Server unavailable for ${key}:`, error.message);
    }

    // Always save to localStorage as backup
    if (LocalStorageService.set(key, value)) {
      results.localStorage = true;
      console.log(`✅ Saved to localStorage: ${key}`);
    } else {
      results.errors.push('localStorage failed (quota exceeded?)');
    }

    return results;
  }

  /**
   * Delete a key from both storages
   * @param {string} key - The key to delete
   * @returns {Promise<Object>} Results from both storage methods
   */
  static async delete(key) {
    const results = {
      server: false,
      localStorage: false,
      errors: []
    };

    // Try server first
    try {
      const response = await fetch(`${this.STATE_SERVER_URL}/${key}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        results.server = true;
        console.log(`✅ Deleted from server: ${key}`);
      } else if (response.status === 404) {
        results.server = true; // Consider 404 as success for delete
        console.log(`✅ Key not found on server (already deleted): ${key}`);
      } else {
        const error = await response.json();
        results.errors.push(`Server error: ${error.message || response.statusText}`);
      }
    } catch (error) {
      results.errors.push(`Server unavailable: ${error.message}`);
      console.warn(`🔄 Server unavailable for delete ${key}:`, error.message);
    }

    // Also delete from localStorage
    if (LocalStorageService.delete(key)) {
      results.localStorage = true;
    }

    return results;
  }

  /**
   * List all keys from both storages (merged and deduplicated)
   * @param {string} prefix - Optional prefix to filter keys
   * @returns {Promise<string[]>} Array of unique keys
   */
  static async listKeys(prefix = '') {
    const allKeys = new Set();

    // Get keys from server
    try {
      const response = await fetch(this.STATE_SERVER_URL);
      if (response.ok) {
        const result = await response.json();
        result.keys.forEach(key => {
          if (!prefix || key.startsWith(prefix)) {
            allKeys.add(key);
          }
        });
      }
    } catch (error) {
      console.warn('🔄 Server unavailable for listKeys:', error.message);
    }

    // Get keys from localStorage
    const localKeys = LocalStorageService.listKeys(prefix);
    localKeys.forEach(key => allKeys.add(key));

    return Array.from(allKeys).sort();
  }

  /**
   * Get all data from both storages (server takes precedence)
   * @param {string} prefix - Optional prefix to filter keys
   * @returns {Promise<Object>} Merged data object
   */
  static async getAll(prefix = '') {
    const data = {};

    // Start with localStorage data
    const localData = LocalStorageService.getAll(prefix);
    Object.assign(data, localData);

    // Overlay server data (takes precedence)
    try {
      const keys = await this.listKeys(prefix);
      for (const key of keys) {
        try {
          const response = await fetch(`${this.STATE_SERVER_URL}/${key}`);
          if (response.ok) {
            const result = await response.json();
            data[key] = result.value; // Server data overwrites local
          }
        } catch (error) {
          // Keep localStorage value if server fails
          console.warn(`Failed to get ${key} from server:`, error.message);
        }
      }
    } catch (error) {
      console.warn('Server unavailable for getAll:', error.message);
    }

    return data;
  }

  /**
   * Set multiple key-value pairs
   * @param {Object} data - Object containing key-value pairs
   * @returns {Promise<Object>} Results with success/failure counts
   */
  static async setMultiple(data) {
    const results = {
      server: { success: [], failed: [] },
      localStorage: { success: [], failed: [] },
      total: Object.keys(data).length
    };

    const promises = Object.entries(data).map(async ([key, value]) => {
      const result = await this.set(key, value);
      
      if (result.server) {
        results.server.success.push(key);
      } else {
        results.server.failed.push(key);
      }

      if (result.localStorage) {
        results.localStorage.success.push(key);
      } else {
        results.localStorage.failed.push(key);
      }
    });

    await Promise.all(promises);

    console.log(`✅ Batch set complete: Server(${results.server.success.length}/${results.total}), LocalStorage(${results.localStorage.success.length}/${results.total})`);
    return results;
  }

  /**
   * Clear all data from both storages
   * @param {string} prefix - Optional prefix to clear only specific keys
   * @returns {Promise<Object>} Clear results
   */
  static async clear(prefix = '') {
    const results = {
      server: 0,
      localStorage: 0,
      errors: []
    };

    // Clear from server
    try {
      if (!prefix) {
        const response = await fetch(`${this.STATE_SERVER_URL}/clear`, {
          method: 'POST'
        });
        if (response.ok) {
          const result = await response.json();
          results.server = result.cleared || 0;
        }
      } else {
        // Clear by prefix - delete each key individually
        const keys = await this.listKeys(prefix);
        let cleared = 0;
        for (const key of keys) {
          const deleteResult = await this.delete(key);
          if (deleteResult.server) cleared++;
        }
        results.server = cleared;
      }
    } catch (error) {
      results.errors.push(`Server clear failed: ${error.message}`);
    }

    // Clear from localStorage
    results.localStorage = LocalStorageService.clear(prefix);

    return results;
  }

  /**
   * Sync data from localStorage to server
   * @param {string} prefix - Optional prefix to sync only specific keys
   * @returns {Promise<Object>} Sync results
   */
  static async syncToServer(prefix = '') {
    const results = {
      synced: [],
      failed: [],
      total: 0
    };

    try {
      const localData = LocalStorageService.getAll(prefix);
      results.total = Object.keys(localData).length;

      for (const [key, value] of Object.entries(localData)) {
        try {
          const response = await fetch(this.STATE_SERVER_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ key, value })
          });

          if (response.ok) {
            results.synced.push(key);
            console.log(`✅ Synced to server: ${key}`);
          } else {
            results.failed.push({ key, error: `HTTP ${response.status}` });
          }
        } catch (error) {
          results.failed.push({ key, error: error.message });
        }
      }

      console.log(`🔄 Sync complete: ${results.synced.length}/${results.total} synced to server`);
    } catch (error) {
      console.error('Sync to server failed:', error);
    }

    return results;
  }

  /**
   * Check storage availability
   * @returns {Promise<Object>} Availability status
   */
  static async getStorageStatus() {
    const status = {
      server: false,
      localStorage: LocalStorageService.isAvailable(),
      serverError: null,
      localStorageInfo: LocalStorageService.getStorageInfo()
    };

    try {
      const response = await fetch(`${this.STATE_SERVER_URL.replace('/state', '/health')}`);
      status.server = response.ok;
    } catch (error) {
      status.server = false;
      status.serverError = error.message;
    }

    return status;
  }
}

export default HybridStorageService;