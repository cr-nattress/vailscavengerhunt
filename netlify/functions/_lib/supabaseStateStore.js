const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

class SupabaseStateStore {
  /**
   * Build compound key for state isolation
   */
  static buildStateKey(stateKey, context = {}) {
    const { organizationId = 'default', teamId = 'default', userSessionId = 'default' } = context;
    return `${organizationId}:${teamId}:${userSessionId}:${stateKey}`;
  }

  /**
   * Get state value by key
   * @param {string} stateKey - The state key to retrieve
   * @param {object} context - Context for state isolation
   * @returns {Promise<any>} - The state value or null if not found
   */
  static async get(stateKey, context = {}) {
    try {
      const { organizationId, teamId, userSessionId } = context;

      let query = supabase
        .from('application_state')
        .select('state_value, expires_at')
        .eq('state_key', stateKey);

      // Add context filters
      if (organizationId) query = query.eq('organization_id', organizationId);
      if (teamId) query = query.eq('team_id', teamId);
      if (userSessionId) query = query.eq('user_session_id', userSessionId);

      const { data, error } = await query.single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found
          return null;
        }
        console.error('SupabaseStateStore.get error:', error);
        return null;
      }

      // Check if state has expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        // Clean up expired state
        await this.delete(stateKey, context);
        return null;
      }

      return data.state_value;
    } catch (error) {
      console.error('SupabaseStateStore.get error:', error);
      return null;
    }
  }

  /**
   * Set state value with optional expiration
   * @param {string} stateKey - The state key to set
   * @param {any} stateValue - The state value to store
   * @param {object} context - Context for state isolation
   * @param {number} ttlSeconds - Time to live in seconds (optional)
   * @returns {Promise<boolean>} - Success status
   */
  static async set(stateKey, stateValue, context = {}, ttlSeconds = null) {
    try {
      const { organizationId, teamId, userSessionId, stateType = 'session' } = context;

      let expiresAt = null;
      if (ttlSeconds) {
        expiresAt = new Date(Date.now() + (ttlSeconds * 1000)).toISOString();
      }

      const stateData = {
        state_key: stateKey,
        state_value: stateValue,
        state_type: stateType,
        organization_id: organizationId || null,
        team_id: teamId || null,
        user_session_id: userSessionId || null,
        expires_at: expiresAt,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('application_state')
        .upsert(stateData, {
          onConflict: 'state_key,organization_id,team_id,user_session_id'
        });

      if (error) {
        console.error('SupabaseStateStore.set error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('SupabaseStateStore.set error:', error);
      return false;
    }
  }

  /**
   * Delete state by key
   * @param {string} stateKey - The state key to delete
   * @param {object} context - Context for state isolation
   * @returns {Promise<boolean>} - Success status
   */
  static async delete(stateKey, context = {}) {
    try {
      const { organizationId, teamId, userSessionId } = context;

      let query = supabase
        .from('application_state')
        .delete()
        .eq('state_key', stateKey);

      // Add context filters
      if (organizationId) query = query.eq('organization_id', organizationId);
      if (teamId) query = query.eq('team_id', teamId);
      if (userSessionId) query = query.eq('user_session_id', userSessionId);

      const { error } = await query;

      if (error) {
        console.error('SupabaseStateStore.delete error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('SupabaseStateStore.delete error:', error);
      return false;
    }
  }

  /**
   * List all state keys for a context
   * @param {object} context - Context for state isolation
   * @param {string} stateType - Optional state type filter
   * @returns {Promise<Array<string>>} - Array of state keys
   */
  static async list(context = {}, stateType = null) {
    try {
      const { organizationId, teamId, userSessionId } = context;

      let query = supabase
        .from('application_state')
        .select('state_key');

      // Add context filters
      if (organizationId) query = query.eq('organization_id', organizationId);
      if (teamId) query = query.eq('team_id', teamId);
      if (userSessionId) query = query.eq('user_session_id', userSessionId);
      if (stateType) query = query.eq('state_type', stateType);

      // Filter out expired entries
      query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

      const { data, error } = await query;

      if (error) {
        console.error('SupabaseStateStore.list error:', error);
        return [];
      }

      return data.map(row => row.state_key);
    } catch (error) {
      console.error('SupabaseStateStore.list error:', error);
      return [];
    }
  }

  /**
   * Clear all state for a context
   * @param {object} context - Context for state isolation
   * @param {string} stateType - Optional state type filter
   * @returns {Promise<number>} - Number of cleared entries
   */
  static async clear(context = {}, stateType = null) {
    try {
      const { organizationId, teamId, userSessionId } = context;

      let query = supabase
        .from('application_state')
        .delete();

      // Add context filters
      if (organizationId) query = query.eq('organization_id', organizationId);
      if (teamId) query = query.eq('team_id', teamId);
      if (userSessionId) query = query.eq('user_session_id', userSessionId);
      if (stateType) query = query.eq('state_type', stateType);

      const { data, error, count } = await query.select('*', { count: 'exact' });

      if (error) {
        console.error('SupabaseStateStore.clear error:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('SupabaseStateStore.clear error:', error);
      return 0;
    }
  }

  /**
   * Check if state exists
   * @param {string} stateKey - The state key to check
   * @param {object} context - Context for state isolation
   * @returns {Promise<boolean>} - Whether the state exists
   */
  static async exists(stateKey, context = {}) {
    try {
      const { organizationId, teamId, userSessionId } = context;

      let query = supabase
        .from('application_state')
        .select('state_key', { count: 'exact' })
        .eq('state_key', stateKey);

      // Add context filters
      if (organizationId) query = query.eq('organization_id', organizationId);
      if (teamId) query = query.eq('team_id', teamId);
      if (userSessionId) query = query.eq('user_session_id', userSessionId);

      // Filter out expired entries
      query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

      const { count, error } = await query;

      if (error) {
        console.error('SupabaseStateStore.exists error:', error);
        return false;
      }

      return count > 0;
    } catch (error) {
      console.error('SupabaseStateStore.exists error:', error);
      return false;
    }
  }

  /**
   * Get multiple state values
   * @param {Array<string>} stateKeys - Array of state keys to retrieve
   * @param {object} context - Context for state isolation
   * @returns {Promise<object>} - Object with keys and their values
   */
  static async getMultiple(stateKeys, context = {}) {
    try {
      const { organizationId, teamId, userSessionId } = context;

      let query = supabase
        .from('application_state')
        .select('state_key, state_value, expires_at')
        .in('state_key', stateKeys);

      // Add context filters
      if (organizationId) query = query.eq('organization_id', organizationId);
      if (teamId) query = query.eq('team_id', teamId);
      if (userSessionId) query = query.eq('user_session_id', userSessionId);

      const { data, error } = await query;

      if (error) {
        console.error('SupabaseStateStore.getMultiple error:', error);
        return {};
      }

      const result = {};
      const now = new Date();
      const expiredKeys = [];

      data.forEach(row => {
        // Check if state has expired
        if (row.expires_at && new Date(row.expires_at) < now) {
          expiredKeys.push(row.state_key);
        } else {
          result[row.state_key] = row.state_value;
        }
      });

      // Clean up expired states in background
      if (expiredKeys.length > 0) {
        Promise.all(expiredKeys.map(key => this.delete(key, context))).catch(console.error);
      }

      return result;
    } catch (error) {
      console.error('SupabaseStateStore.getMultiple error:', error);
      return {};
    }
  }

  /**
   * Cleanup expired state entries
   * @returns {Promise<number>} - Number of cleaned up entries
   */
  static async cleanupExpired() {
    try {
      const { error } = await supabase.rpc('cleanup_expired_state');

      if (error) {
        console.error('SupabaseStateStore.cleanupExpired error:', error);
        return 0;
      }

      return 0; // Function returns count but we don't need it here
    } catch (error) {
      console.error('SupabaseStateStore.cleanupExpired error:', error);
      return 0;
    }
  }
}

module.exports = SupabaseStateStore;