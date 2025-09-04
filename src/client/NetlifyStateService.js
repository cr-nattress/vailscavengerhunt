/**
 * NetlifyStateService - Client for interacting with Netlify Functions + Blobs state storage
 */
export class NetlifyStateService {
  // Automatically detects environment - uses Netlify Functions in production, localhost in development
  static get API_BASE() {
    if (typeof window !== 'undefined') {
      // Check for explicit API URL from environment or use default based on hostname  
      const apiUrl = import.meta.env?.VITE_API_URL;
      if (apiUrl) return apiUrl;
      
      const isDevelopment = window.location.hostname === 'localhost';
      return isDevelopment 
        ? 'http://localhost:8889/.netlify/functions' // Use local Netlify Dev server
        : '/.netlify/functions';
    }
    return '/.netlify/functions';
  }

  /**
   * Get a value by key
   * @param {string} key - The key to retrieve
   * @returns {Promise<any>} The stored value
   */
  static async get(key) {
    try {
      const response = await fetch(`${this.API_BASE}/state-get/${key}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null; // Key doesn't exist
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to get value: ${response.statusText}`);
      }

      const data = await response.json();
      return data.value;
    } catch (error) {
      console.error('NetlifyStateService.get error:', error);
      throw error;
    }
  }

  /**
   * Set a key-value pair (create or update)
   * @param {string} key - The key to set
   * @param {any} value - The value to store
   * @returns {Promise<Object>} Response with action taken
   */
  static async set(key, value) {
    try {
      const response = await fetch(`${this.API_BASE}/state-set`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key, value }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to set value: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('NetlifyStateService.set error:', error);
      throw error;
    }
  }

  /**
   * Delete a key-value pair
   * @param {string} key - The key to delete
   * @returns {Promise<Object>} Response confirming deletion
   */
  static async delete(key) {
    try {
      const response = await fetch(`${this.API_BASE}/state-delete/${key}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return { message: 'Key not found' };
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to delete value: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('NetlifyStateService.delete error:', error);
      throw error;
    }
  }

  /**
   * List all keys
   * @param {boolean} includeValues - Whether to include values with keys
   * @returns {Promise<Object>} Object with keys or full data
   */
  static async list(includeValues = false) {
    try {
      const url = new URL(`${this.API_BASE}/state-list`, window.location.origin);
      if (includeValues) {
        url.searchParams.append('includeValues', 'true');
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to list keys: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('NetlifyStateService.list error:', error);
      throw error;
    }
  }

  /**
   * Clear all state
   * @returns {Promise<Object>} Response confirming clear
   */
  static async clear() {
    try {
      const response = await fetch(`${this.API_BASE}/state-clear`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to clear state: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('NetlifyStateService.clear error:', error);
      throw error;
    }
  }

  /**
   * Check if the service is available
   * @returns {Promise<boolean>} True if service is available
   */
  static async isAvailable() {
    try {
      // Try to list keys as a health check
      await this.list();
      return true;
    } catch (error) {
      console.warn('NetlifyStateService not available:', error.message);
      return false;
    }
  }

  /**
   * Sync data from localStorage to Netlify Blobs
   * Useful for migrating existing localStorage data
   * @param {Object} localStorageData - Data from localStorage to sync
   * @returns {Promise<Object>} Sync results
   */
  static async syncFromLocalStorage(localStorageData) {
    const results = {
      synced: [],
      failed: [],
      total: Object.keys(localStorageData).length
    };

    for (const [key, value] of Object.entries(localStorageData)) {
      try {
        await this.set(key, value);
        results.synced.push(key);
        console.log(`✅ Synced ${key} to Netlify Blobs`);
      } catch (error) {
        console.error(`❌ Failed to sync ${key}:`, error);
        results.failed.push({ key, error: error.message });
      }
    }

    console.log(`🔄 Sync complete: ${results.synced.length}/${results.total} items synced`);
    return results;
  }
}

// Hybrid storage class that tries Netlify first, falls back to localStorage
export class HybridStateService {
  static async get(key) {
    // Try Netlify first
    if (await NetlifyStateService.isAvailable()) {
      try {
        return await NetlifyStateService.get(key);
      } catch (error) {
        console.warn(`Netlify get failed for ${key}, falling back to localStorage:`, error);
      }
    }

    // Fall back to localStorage
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`localStorage get failed for ${key}:`, error);
      return null;
    }
  }

  static async set(key, value) {
    const results = { netlify: false, localStorage: false };

    // Try Netlify first
    if (await NetlifyStateService.isAvailable()) {
      try {
        await NetlifyStateService.set(key, value);
        results.netlify = true;
      } catch (error) {
        console.warn(`Netlify set failed for ${key}:`, error);
      }
    }

    // Always backup to localStorage
    try {
      localStorage.setItem(key, JSON.stringify(value));
      results.localStorage = true;
    } catch (error) {
      console.error(`localStorage set failed for ${key}:`, error);
    }

    return results;
  }

  static async delete(key) {
    const results = { netlify: false, localStorage: false };

    // Try Netlify first
    if (await NetlifyStateService.isAvailable()) {
      try {
        await NetlifyStateService.delete(key);
        results.netlify = true;
      } catch (error) {
        console.warn(`Netlify delete failed for ${key}:`, error);
      }
    }

    // Also remove from localStorage
    try {
      localStorage.removeItem(key);
      results.localStorage = true;
    } catch (error) {
      console.error(`localStorage delete failed for ${key}:`, error);
    }

    return results;
  }
}