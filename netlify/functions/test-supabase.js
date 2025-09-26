/**
 * Test Supabase Connection from Netlify Function
 * Endpoint to verify Supabase connectivity from serverless environment
 */

const { getSupabaseClient, testConnection } = require('./_lib/supabaseClient');
const { withSentry } = require('./_lib/sentry')

exports.handler = withSentry(async (event, context) => {
  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow GET
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    console.log('[test-supabase] Starting connection test...');

    // Test connection
    const isConnected = await testConnection();

    if (!isConnected) {
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({
          status: 'error',
          message: 'Failed to connect to Supabase',
          environment: {
            hasUrl: !!process.env.SUPABASE_URL,
            hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            isNetlify: !!process.env.NETLIFY,
            functionName: context.functionName
          }
        })
      };
    }

    // Get client and check tables
    const supabase = getSupabaseClient();
    const tables = [
      'device_locks',
      'debug_logs',
      'kv_store',
      'team_progress',
      'team_mappings',
      'hunt_settings'
    ];

    const tableStatus = {};

    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).select('*').limit(1);

        if (error) {
          if (error.code === '42P01') {
            tableStatus[table] = 'missing';
          } else if (error.code === 'PGRST116') {
            tableStatus[table] = 'exists (empty)';
          } else {
            tableStatus[table] = `error: ${error.code}`;
          }
        } else {
          tableStatus[table] = 'exists';
        }
      } catch (err) {
        tableStatus[table] = `error: ${err.message}`;
      }
    }

    // Count existing tables
    const existingTables = Object.values(tableStatus).filter(status =>
      status === 'exists' || status === 'exists (empty)'
    ).length;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'success',
        message: 'Supabase connection successful',
        tables: tableStatus,
        summary: {
          total: tables.length,
          existing: existingTables,
          missing: tables.length - existingTables
        },
        environment: {
          hasUrl: !!process.env.SUPABASE_URL,
          hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
          isNetlify: !!process.env.NETLIFY,
          functionName: context.functionName,
          region: process.env.AWS_REGION || 'unknown'
        },
        timestamp: new Date().toISOString()
      }, null, 2)
    };

  } catch (error) {
    console.error('[test-supabase] Unexpected error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        status: 'error',
        message: 'Unexpected error during connection test',
        error: error.message,
        environment: {
          hasUrl: !!process.env.SUPABASE_URL,
          hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
          isNetlify: !!process.env.NETLIFY
        }
      })
    };
  }
});