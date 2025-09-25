const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration for KV Store')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * Supabase-based Key-Value Store
 * Provides blob storage compatible interface for key-value operations
 */
class SupabaseKVStore {
  /**
   * Get value by key
   * @param {string} key - The key to retrieve
   * @returns {Promise<any|null>} The value or null if not found
   */
  static async get(key) {
    try {
      const { data, error } = await supabase
        .from('key_value_store')
        .select('value')
        .eq('key', key)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null
        }
        throw error
      }

      return data.value
    } catch (error) {
      console.error(`SupabaseKVStore.get error for key ${key}:`, error)
      return null
    }
  }

  /**
   * Set value by key
   * @param {string} key - The key to set
   * @param {any} value - The value to store (will be JSON serialized)
   * @returns {Promise<boolean>} True if successful, false otherwise
   */
  static async set(key, value) {
    try {
      const { error } = await supabase
        .from('key_value_store')
        .upsert({
          key,
          value: value
        })

      if (error) {
        throw error
      }

      return true
    } catch (error) {
      console.error(`SupabaseKVStore.set error for key ${key}:`, error)
      return false
    }
  }

  /**
   * Delete value by key
   * @param {string} key - The key to delete
   * @returns {Promise<boolean>} True if successful, false otherwise
   */
  static async delete(key) {
    try {
      const { error } = await supabase
        .from('key_value_store')
        .delete()
        .eq('key', key)

      if (error) {
        throw error
      }

      return true
    } catch (error) {
      console.error(`SupabaseKVStore.delete error for key ${key}:`, error)
      return false
    }
  }

  /**
   * Check if key exists
   * @param {string} key - The key to check
   * @returns {Promise<boolean>} True if key exists, false otherwise
   */
  static async exists(key) {
    try {
      const { data, error } = await supabase
        .from('key_value_store')
        .select('key')
        .eq('key', key)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      return !!data
    } catch (error) {
      console.error(`SupabaseKVStore.exists error for key ${key}:`, error)
      return false
    }
  }

  /**
   * List all keys with optional prefix filter
   * @param {string} prefix - Optional prefix to filter keys
   * @returns {Promise<string[]>} Array of keys
   */
  static async listKeys(prefix = '') {
    try {
      let query = supabase
        .from('key_value_store')
        .select('key')

      if (prefix) {
        query = query.ilike('key', `${prefix}%`)
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      return data.map(row => row.key)
    } catch (error) {
      console.error(`SupabaseKVStore.listKeys error:`, error)
      return []
    }
  }

  /**
   * Get multiple values by keys
   * @param {string[]} keys - Array of keys to retrieve
   * @returns {Promise<Object>} Object with key-value pairs
   */
  static async getMultiple(keys) {
    try {
      const { data, error } = await supabase
        .from('key_value_store')
        .select('key, value')
        .in('key', keys)

      if (error) {
        throw error
      }

      const result = {}
      data.forEach(row => {
        result[row.key] = row.value
      })

      return result
    } catch (error) {
      console.error(`SupabaseKVStore.getMultiple error:`, error)
      return {}
    }
  }

  /**
   * Clear all keys with optional prefix
   * @param {string} prefix - Optional prefix to filter deletion
   * @returns {Promise<number>} Number of deleted keys
   */
  static async clear(prefix = '') {
    try {
      let query = supabase
        .from('key_value_store')
        .delete()

      if (prefix) {
        query = query.ilike('key', `${prefix}%`)
      } else {
        // Safety check: don't allow clearing all data without explicit confirmation
        throw new Error('Clear all data requires explicit prefix or override')
      }

      const { data, error } = await query.select()

      if (error) {
        throw error
      }

      return data ? data.length : 0
    } catch (error) {
      console.error(`SupabaseKVStore.clear error:`, error)
      return 0
    }
  }
}

module.exports = { SupabaseKVStore }