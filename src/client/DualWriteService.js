/**
 * DualWriteService - Always writes to localStorage, always POSTs to /api/kv/upsert
 * Implements the dual-write pattern with Netlify Blobs backend
 */
import { LocalStorageService } from './LocalStorageService.js';

export class DualWriteService {
  static SERVER_URL = "/.netlify/functions/kv-upsert"; // Netlify Function endpoint
  static GET_URL = "/.netlify/functions/kv-get"; // Read endpoint
  static LIST_URL = "/.netlify/functions/kv-list"; // List endpoint
  
  /**
   * Environment detection for local development
   */
  static get API_BASE() {
    // Always use the deployed Netlify API
    return 'https://vaillovehunt.netlify.app';
  }

  /**
   * Set a key-value pair (dual write: localStorage + server)
   * @param {string} key - The key to set
   * @param {any} value - The value to store
   * @param {Array} indexes - Optional index entries for search
   * @returns {Promise<Object>} Results from both storage methods
   */
  static async set(key, value, indexes = []) {
    const results = {
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
      results.errors.push(`localStorage error: ${error.message}`);
    }

    // Always POST to server (Netlify Function)
    try {
      const payload = {
        key,
        value,
        indexes: indexes.length > 0 ? indexes : undefined
      };

      const response = await fetch(`${this.API_BASE}${this.SERVER_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        results.server = true;
        console.log(`✅ DualWrite server: ${key}`, result);
      } else {
        const errorData = await response.json().catch(() => ({}));
        results.errors.push(`Server error: ${errorData.error || response.statusText}`);
        console.warn(`❌ Server write failed for ${key}:`, errorData);
      }
    } catch (error) {
      results.errors.push(`Server unavailable: ${error.message}`);
      console.warn(`❌ Server unavailable for ${key}:`, error.message);
    }

    return results;
  }

  /**
   * Get a value by key (localStorage first for speed, server for fresh data)
   * @param {string} key - The key to retrieve
   * @param {boolean} preferServer - If true, try server first
   * @returns {Promise<any>} The stored value or null if not found
   */
  static async get(key, preferServer = false) {
    if (preferServer) {
      // Try server first for fresh data
      try {
        const response = await fetch(`${this.API_BASE}${this.GET_URL}?key=${encodeURIComponent(key)}`);
        if (response.ok) {
          const result = await response.json();
          console.log(`✅ Retrieved from server: ${key}`);
          
          // Update localStorage cache with fresh data
          LocalStorageService.set(key, result.value);
          return result.value;
        } else if (response.status !== 404) {
          console.warn(`Server read error for ${key}:`, response.statusText);
        }
      } catch (error) {
        console.warn(`Server unavailable for ${key}:`, error.message);
      }
    }

    // Fall back to or start with localStorage
    const localValue = LocalStorageService.get(key);
    if (localValue !== null) {
      console.log(`✅ Retrieved from localStorage: ${key}`);
      return localValue;
    }

    // If not in localStorage and we haven't tried server yet
    if (!preferServer) {
      try {
        const response = await fetch(`${this.API_BASE}${this.GET_URL}?key=${encodeURIComponent(key)}`);
        if (response.ok) {
          const result = await response.json();
          console.log(`✅ Retrieved from server (fallback): ${key}`);
          
          // Cache in localStorage for next time
          LocalStorageService.set(key, result.value);
          return result.value;
        }
      } catch (error) {
        console.warn(`Server fallback failed for ${key}:`, error.message);
      }
    }

    return null;
  }

  /**
   * List all keys from both storages
   * @param {string} prefix - Optional prefix to filter keys
   * @param {boolean} includeValues - Whether to include values
   * @returns {Promise<Object>} List results with merged data
   */
  static async list(prefix = '', includeValues = false) {
    const result = {
      keys: new Set(),
      data: {},
      sources: { server: false, localStorage: true }
    };

    // Get from localStorage
    const localKeys = LocalStorageService.listKeys(prefix);
    localKeys.forEach(key => result.keys.add(key));
    
    if (includeValues) {
      const localData = LocalStorageService.getAll(prefix);
      Object.assign(result.data, localData);
    }

    // Get from server
    try {
      const params = new URLSearchParams();
      if (prefix) params.set('prefix', prefix);
      if (includeValues) params.set('includeValues', 'true');

      const response = await fetch(`${this.API_BASE}${this.LIST_URL}?${params}`);
      if (response.ok) {
        const serverResult = await response.json();
        result.sources.server = true;
        
        serverResult.keys.forEach(key => result.keys.add(key));
        
        if (includeValues && serverResult.data) {
          // Server data takes precedence
          Object.assign(result.data, serverResult.data);
          
          // Update localStorage cache with server data
          for (const [key, value] of Object.entries(serverResult.data)) {
            LocalStorageService.set(key, value);
          }
        }
      }
    } catch (error) {
      console.warn('Server list unavailable:', error.message);
    }

    return {
      keys: Array.from(result.keys).sort(),
      count: result.keys.size,
      data: includeValues ? result.data : undefined,
      sources: result.sources,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Set multiple key-value pairs with batch operations
   * @param {Object} data - Object containing key-value pairs
   * @param {Object} indexConfig - Configuration for indexes per key
   * @returns {Promise<Object>} Batch operation results
   */
  static async setMultiple(data, indexConfig = {}) {
    const results = {
      localStorage: { success: [], failed: [] },
      server: { success: [], failed: [] },
      total: Object.keys(data).length
    };

    // Process each key-value pair
    const promises = Object.entries(data).map(async ([key, value]) => {
      const indexes = indexConfig[key] || [];
      const result = await this.set(key, value, indexes);
      
      if (result.localStorage) {
        results.localStorage.success.push(key);
      } else {
        results.localStorage.failed.push(key);
      }

      if (result.server) {
        results.server.success.push(key);
      } else {
        results.server.failed.push(key);
      }
    });

    await Promise.all(promises);

    console.log(`✅ Batch operation complete: LocalStorage(${results.localStorage.success.length}/${results.total}), Server(${results.server.success.length}/${results.total})`);
    return results;
  }

  /**
   * Create a session with automatic indexing
   * @param {string} sessionId - Unique session identifier
   * @param {Object} sessionData - Session data
   * @returns {Promise<Object>} Set operation results
   */
  static async createSession(sessionId, sessionData) {
    const key = `session:${sessionId}`;
    const indexes = [
      { key: 'index:sessions', member: sessionId },
      { key: `index:location:${sessionData.location}`, member: sessionId },
      { key: `index:date:${new Date().toISOString().split('T')[0]}`, member: sessionId }
    ];

    return await this.set(key, sessionData, indexes);
  }

  /**
   * Save app settings with indexing
   * @param {Object} settings - Application settings
   * @returns {Promise<Object>} Set operation results
   */
  static async saveSettings(settings) {
    const key = 'app-settings';
    const indexes = [
      { key: 'index:settings', member: 'app-settings' }
    ];

    return await this.set(key, settings, indexes);
  }

  /**
   * Get storage status from both systems
   * @returns {Promise<Object>} Status information
   */
  static async getStatus() {
    const status = {
      localStorage: {
        available: LocalStorageService.isAvailable(),
        info: LocalStorageService.getStorageInfo()
      },
      server: {
        available: false,
        error: null
      },
      timestamp: new Date().toISOString()
    };

    try {
      const response = await fetch(`${this.API_BASE}${this.LIST_URL}?prefix=health-check`);
      status.server.available = response.ok;
      
      if (!response.ok) {
        status.server.error = response.statusText;
      }
    } catch (error) {
      status.server.available = false;
      status.server.error = error.message;
    }

    return status;
  }

  /**
   * Sync localStorage data to server
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
          const result = await this.set(key, value);
          if (result.server) {
            results.synced.push(key);
          } else {
            results.failed.push({ key, errors: result.errors });
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
}

export default DualWriteService;