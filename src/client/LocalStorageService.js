/**
 * LocalStorageService - Client-side dictionary storage using browser localStorage
 */
export class LocalStorageService {
  
  /**
   * Get a value by key from localStorage
   * @param {string} key - The key to retrieve
   * @returns {any|null} The stored value or null if not found
   */
  static get(key) {
    try {
      if (typeof localStorage === 'undefined') {
        console.warn('localStorage is not available');
        return null;
      }

      const item = localStorage.getItem(key);
      if (item === null) {
        return null;
      }

      // Try to parse as JSON, if it fails return the raw string
      try {
        return JSON.parse(item);
      } catch {
        return item;
      }
    } catch (error) {
      console.error('LocalStorageService.get error:', error);
      return null;
    }
  }

  /**
   * Set a key-value pair in localStorage
   * @param {string} key - The key to set
   * @param {any} value - The value to store (will be JSON stringified)
   * @returns {boolean} True if successful, false otherwise
   */
  static set(key, value) {
    try {
      if (typeof localStorage === 'undefined') {
        console.warn('localStorage is not available');
        return false;
      }

      const serializedValue = JSON.stringify(value);
      localStorage.setItem(key, serializedValue);
      
      console.log(`✅ LocalStorage set: ${key}`);
      return true;
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded:', error);
        return false;
      }
      console.error('LocalStorageService.set error:', error);
      return false;
    }
  }

  /**
   * Delete a key from localStorage
   * @param {string} key - The key to delete
   * @returns {boolean} True if successful, false otherwise
   */
  static delete(key) {
    try {
      if (typeof localStorage === 'undefined') {
        console.warn('localStorage is not available');
        return false;
      }

      localStorage.removeItem(key);
      console.log(`✅ LocalStorage deleted: ${key}`);
      return true;
    } catch (error) {
      console.error('LocalStorageService.delete error:', error);
      return false;
    }
  }

  /**
   * Get all keys from localStorage
   * @param {string} prefix - Optional prefix to filter keys
   * @returns {string[]} Array of keys
   */
  static listKeys(prefix = '') {
    try {
      if (typeof localStorage === 'undefined') {
        console.warn('localStorage is not available');
        return [];
      }

      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!prefix || key.startsWith(prefix)) {
          keys.push(key);
        }
      }

      return keys.sort();
    } catch (error) {
      console.error('LocalStorageService.listKeys error:', error);
      return [];
    }
  }

  /**
   * Get all key-value pairs from localStorage
   * @param {string} prefix - Optional prefix to filter keys
   * @returns {Object} Object containing all key-value pairs
   */
  static getAll(prefix = '') {
    try {
      const data = {};
      const keys = this.listKeys(prefix);

      for (const key of keys) {
        data[key] = this.get(key);
      }

      return data;
    } catch (error) {
      console.error('LocalStorageService.getAll error:', error);
      return {};
    }
  }

  /**
   * Set multiple key-value pairs at once
   * @param {Object} data - Object containing key-value pairs
   * @returns {Object} Result with success/failure counts
   */
  static setMultiple(data) {
    const results = {
      success: [],
      failed: [],
      total: Object.keys(data).length
    };

    for (const [key, value] of Object.entries(data)) {
      if (this.set(key, value)) {
        results.success.push(key);
      } else {
        results.failed.push(key);
      }
    }

    console.log(`✅ LocalStorage batch set: ${results.success.length}/${results.total} successful`);
    return results;
  }

  /**
   * Clear all localStorage data
   * @param {string} prefix - Optional prefix to clear only specific keys
   * @returns {number} Number of items cleared
   */
  static clear(prefix = '') {
    try {
      if (typeof localStorage === 'undefined') {
        console.warn('localStorage is not available');
        return 0;
      }

      if (!prefix) {
        const count = localStorage.length;
        localStorage.clear();
        console.log(`✅ LocalStorage cleared all ${count} items`);
        return count;
      } else {
        const keys = this.listKeys(prefix);
        keys.forEach(key => localStorage.removeItem(key));
        console.log(`✅ LocalStorage cleared ${keys.length} items with prefix: ${prefix}`);
        return keys.length;
      }
    } catch (error) {
      console.error('LocalStorageService.clear error:', error);
      return 0;
    }
  }

  /**
   * Check if localStorage is available
   * @returns {boolean} True if localStorage is available
   */
  static isAvailable() {
    try {
      if (typeof localStorage === 'undefined') {
        return false;
      }

      // Test if we can actually write to localStorage
      const testKey = '__localStorage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get storage usage information
   * @returns {Object} Information about localStorage usage
   */
  static getStorageInfo() {
    try {
      if (!this.isAvailable()) {
        return {
          available: false,
          used: 0,
          total: 0,
          percentage: 0,
          keyCount: 0
        };
      }

      // Calculate used space by serializing all data
      let used = 0;
      const keyCount = localStorage.length;
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        used += key.length + value.length;
      }

      // Estimate total available space (varies by browser, typically 5-10MB)
      const estimated = 5 * 1024 * 1024; // 5MB estimate

      return {
        available: true,
        used: used,
        total: estimated,
        percentage: Math.round((used / estimated) * 100),
        keyCount: keyCount,
        formattedUsed: this.formatBytes(used),
        formattedTotal: this.formatBytes(estimated)
      };
    } catch (error) {
      console.error('LocalStorageService.getStorageInfo error:', error);
      return {
        available: false,
        used: 0,
        total: 0,
        percentage: 0,
        keyCount: 0
      };
    }
  }

  /**
   * Format bytes into human-readable string
   * @param {number} bytes - Number of bytes
   * @returns {string} Formatted string
   */
  static formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Export all localStorage data as JSON
   * @param {string} prefix - Optional prefix to filter keys
   * @returns {string} JSON string of all data
   */
  static exportData(prefix = '') {
    try {
      const data = this.getAll(prefix);
      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('LocalStorageService.exportData error:', error);
      return '{}';
    }
  }

  /**
   * Import data from JSON string
   * @param {string} jsonString - JSON string containing key-value pairs
   * @param {boolean} overwrite - Whether to overwrite existing keys
   * @returns {Object} Import results
   */
  static importData(jsonString, overwrite = false) {
    try {
      const data = JSON.parse(jsonString);
      const results = {
        imported: [],
        skipped: [],
        failed: [],
        total: Object.keys(data).length
      };

      for (const [key, value] of Object.entries(data)) {
        if (!overwrite && this.get(key) !== null) {
          results.skipped.push(key);
          continue;
        }

        if (this.set(key, value)) {
          results.imported.push(key);
        } else {
          results.failed.push(key);
        }
      }

      console.log(`✅ LocalStorage import complete: ${results.imported.length} imported, ${results.skipped.length} skipped, ${results.failed.length} failed`);
      return results;
    } catch (error) {
      console.error('LocalStorageService.importData error:', error);
      return {
        imported: [],
        skipped: [],
        failed: [],
        total: 0,
        error: error.message
      };
    }
  }
}

export default LocalStorageService;