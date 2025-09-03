/**
 * StateService - Client for interacting with the state management server
 */
export class StateService {
  static API_BASE = process.env.REACT_APP_STATE_API || 'http://localhost:3002/api';

  /**
   * Get a value by key
   * @param {string} key - The key to retrieve
   * @returns {Promise<any>} The stored value
   */
  static async get(key) {
    try {
      const response = await fetch(`${this.API_BASE}/state/${key}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null; // Key doesn't exist
        }
        throw new Error(`Failed to get value: ${response.statusText}`);
      }

      const data = await response.json();
      return data.value;
    } catch (error) {
      console.error('StateService.get error:', error);
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
      const response = await fetch(`${this.API_BASE}/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key, value }),
      });

      if (!response.ok) {
        throw new Error(`Failed to set value: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('StateService.set error:', error);
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
      const response = await fetch(`${this.API_BASE}/state/${key}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return { message: 'Key not found' };
        }
        throw new Error(`Failed to delete value: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('StateService.delete error:', error);
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
      const url = new URL(`${this.API_BASE}/state`);
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
        throw new Error(`Failed to list keys: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('StateService.list error:', error);
      throw error;
    }
  }

  /**
   * Clear all state
   * @returns {Promise<Object>} Response confirming clear
   */
  static async clear() {
    try {
      const response = await fetch(`${this.API_BASE}/state/clear`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to clear state: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('StateService.clear error:', error);
      throw error;
    }
  }

  /**
   * Check server health
   * @returns {Promise<Object>} Server health status
   */
  static async health() {
    try {
      const response = await fetch(`${this.API_BASE.replace('/api', '')}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to check health: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('StateService.health error:', error);
      throw error;
    }
  }
}

// Example usage:
/*
// Set a value
await StateService.set('user:123', { name: 'John', age: 30 });

// Get a value
const user = await StateService.get('user:123');

// Update a value
await StateService.set('user:123', { ...user, age: 31 });

// Delete a value
await StateService.delete('user:123');

// List all keys
const { keys } = await StateService.list();

// Get all data
const { data } = await StateService.list(true);
*/