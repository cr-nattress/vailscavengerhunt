/**
 * Supabase Client Utility
 * Singleton client for server-side operations using service role key
 */

const { createClient } = require('@supabase/supabase-js');

// Singleton instance
let supabaseClient = null;

// Load dotenv for local development
try {
  require('dotenv').config();
} catch (e) {
  // Ignore if dotenv is not available (production)
}

// Configuration with defaults for local development
const config = {
  url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  retryAttempts: 3,
  retryDelay: 1000, // Start with 1 second
};

/**
 * Create or return existing Supabase client
 */
function getSupabaseClient() {
  if (!config.url || !config.serviceRoleKey) {
    console.error('[supabaseClient] Missing Supabase configuration');
    throw new Error('Supabase configuration is incomplete. Check environment variables.');
  }

  if (!supabaseClient) {
    supabaseClient = createClient(config.url, config.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      },
      global: {
        headers: {
          'x-source': 'netlify-function'
        }
      }
    });

    console.log('[supabaseClient] Client initialized');
  }

  return supabaseClient;
}

/**
 * Execute a query with retry logic
 */
async function executeWithRetry(operation, operationName = 'operation') {
  let lastError;

  for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
    try {
      const result = await operation();

      // Check for Supabase error in result
      if (result.error) {
        throw result.error;
      }

      return result;
    } catch (error) {
      lastError = error;

      // Don't retry on certain errors
      const nonRetryableErrors = [
        'PGRST301', // JWT expired
        'PGRST302', // Invalid JWT
        '23505', // Unique constraint violation
        '23503', // Foreign key violation
      ];

      const errorCode = error.code || error.details?.code;
      if (nonRetryableErrors.includes(errorCode)) {
        console.error(`[supabaseClient] Non-retryable error in ${operationName}:`, error.message);
        throw error;
      }

      if (attempt < config.retryAttempts) {
        const delay = config.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
        console.warn(`[supabaseClient] Attempt ${attempt} failed for ${operationName}, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  console.error(`[supabaseClient] All ${config.retryAttempts} attempts failed for ${operationName}`);
  throw lastError;
}

/**
 * Helper for upsert operations
 */
async function upsert(table, data, options = {}) {
  const client = getSupabaseClient();

  return executeWithRetry(
    async () => client.from(table).upsert(data, options),
    `upsert to ${table}`
  );
}

/**
 * Helper for bulk insert operations
 */
async function bulkInsert(table, data, options = {}) {
  const client = getSupabaseClient();
  const batchSize = options.batchSize || 100;
  const results = [];

  // Process in batches
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);

    const result = await executeWithRetry(
      async () => client.from(table).insert(batch, { ...options, batchSize: undefined }),
      `bulk insert to ${table} (batch ${Math.floor(i / batchSize) + 1})`
    );

    results.push(result);

    // Log progress
    if (data.length > batchSize) {
      console.log(`[supabaseClient] Inserted batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(data.length / batchSize)} to ${table}`);
    }
  }

  return results;
}

/**
 * Helper for select with pagination
 */
async function selectWithPagination(table, options = {}) {
  const client = getSupabaseClient();
  const {
    select = '*',
    filter = {},
    orderBy = null,
    ascending = true,
    pageSize = 100,
    page = 1
  } = options;

  let query = client.from(table).select(select, { count: 'exact' });

  // Apply filters
  for (const [key, value] of Object.entries(filter)) {
    if (value !== undefined && value !== null) {
      query = query.eq(key, value);
    }
  }

  // Apply ordering
  if (orderBy) {
    query = query.order(orderBy, { ascending });
  }

  // Apply pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  return executeWithRetry(
    async () => query,
    `select from ${table}`
  );
}

/**
 * Helper for delete operations
 */
async function deleteFrom(table, filter = {}) {
  const client = getSupabaseClient();

  let query = client.from(table).delete();

  // Apply filters
  for (const [key, value] of Object.entries(filter)) {
    if (value !== undefined && value !== null) {
      query = query.eq(key, value);
    }
  }

  return executeWithRetry(
    async () => query,
    `delete from ${table}`
  );
}

/**
 * Test database connection
 */
async function testConnection() {
  try {
    const client = getSupabaseClient();

    // Try to check auth which should work even without tables
    const { data: authTest, error: authError } = await client.auth.getSession();

    // Service role key should allow this even if no session exists
    if (authError && !authError.message.includes('session')) {
      throw authError;
    }

    console.log('[supabaseClient] Connection test successful');
    return true;
  } catch (error) {
    console.error('[supabaseClient] Connection test failed:', error.message);
    return false;
  }
}

/**
 * Execute raw SQL (use with caution)
 */
async function executeSQL(sql, params = []) {
  const client = getSupabaseClient();

  return executeWithRetry(
    async () => client.rpc('exec_sql', { query: sql, params }),
    'execute SQL'
  );
}

/**
 * Handle Supabase errors consistently
 */
function handleError(error, context = '') {
  const errorInfo = {
    message: error.message || 'Unknown error',
    code: error.code,
    details: error.details,
    hint: error.hint,
    context
  };

  // Log without exposing sensitive data
  console.error('[supabaseClient] Error:', {
    context: errorInfo.context,
    code: errorInfo.code,
    message: errorInfo.message.substring(0, 200) // Truncate long messages
  });

  // Return sanitized error for response
  return {
    error: 'Database operation failed',
    code: errorInfo.code || 'UNKNOWN',
    context: errorInfo.context
  };
}

// Export utilities
module.exports = {
  getSupabaseClient,
  executeWithRetry,
  upsert,
  bulkInsert,
  selectWithPagination,
  deleteFrom,
  testConnection,
  executeSQL,
  handleError,

  // Export config for testing purposes
  config
};