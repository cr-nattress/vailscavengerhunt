/**
 * KV List Function - Hybrid Version with Feature Flag
 * Lists key-value pairs with optional filtering
 * Can use either Supabase or Netlify Blobs based on feature flag
 */

// Load environment variables
require('dotenv').config();

const { getSupabaseClient } = require('./_lib/supabaseClient');
const { getStore } = require("@netlify/blobs");

// Feature flag for gradual rollout
const USE_SUPABASE_KV = process.env.USE_SUPABASE_KV === 'true'; // Default to false for safety

exports.handler = async (event, context) => {
  try {
    // Handle CORS preflight
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
        },
        body: "",
      };
    }

    if (event.httpMethod !== "GET") {
      return {
        statusCode: 405,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "Method Not Allowed" })
      };
    }

    const {
      prefix,
      includeValues,
      limit = '1000',
      offset = '0',
      index,
      sortBy = 'key',
      sortOrder = 'asc'
    } = event.queryStringParameters || {};

    console.log(`📋 Listing KV pairs (Mode: ${USE_SUPABASE_KV ? 'Supabase' : 'Blobs'}) with prefix: ${prefix || '(all)'}`);

    if (USE_SUPABASE_KV) {
      // ========================================
      // SUPABASE MODE
      // ========================================
      const supabase = getSupabaseClient();

      // Build the query
      let query = supabase
        .from('kv_store')
        .select(includeValues === 'true' ? '*' : 'key, created_at, updated_at');

      // Apply prefix filter using LIKE
      if (prefix) {
        query = query.like('key', `${prefix}%`);
      }

      // Apply index filter if provided
      if (index) {
        // Index format is "indexKey:indexValue"
        query = query.contains('indexes', [index]);
      }

      // Apply sorting
      const ascending = sortOrder !== 'desc';
      if (sortBy === 'created' || sortBy === 'created_at') {
        query = query.order('created_at', { ascending });
      } else if (sortBy === 'updated' || sortBy === 'updated_at') {
        query = query.order('updated_at', { ascending });
      } else {
        // Default to sorting by key
        query = query.order('key', { ascending });
      }

      // Apply pagination
      const limitNum = parseInt(limit, 10) || 1000;
      const offsetNum = parseInt(offset, 10) || 0;
      query = query.range(offsetNum, offsetNum + limitNum - 1);

      // Execute query
      const { data: records, error, count } = await query;

      if (error) {
        console.error(`❌ Supabase error:`, error);
        throw new Error(`Database error: ${error.message}`);
      }

      // Format response to match original API
      const keys = records ? records.map(r => r.key) : [];
      const response = {
        keys,
        count: keys.length
      };

      // Include values if requested
      if (includeValues === 'true' && records) {
        response.data = {};
        for (const record of records) {
          response.data[record.key] = record.value;
        }
      }

      // Add pagination info
      if (limitNum < 1000 || offsetNum > 0) {
        response.pagination = {
          limit: limitNum,
          offset: offsetNum,
          hasMore: keys.length === limitNum
        };
      }

      console.log(`✅ Found ${keys.length} KV pairs in Supabase`);

      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(response),
      };

    } else {
      // ========================================
      // BLOB STORAGE MODE (Original)
      // ========================================
      const store = getStore("kv");

      console.log(`📋 Listing blobs with prefix: ${prefix || '(all)'}`);

      // List all blobs with optional prefix
      const blobs = store.list({ prefix: prefix || undefined });
      const keys = [];
      const data = {};

      // Iterate through the blobs
      for await (const { key } of blobs) {
        keys.push(key);

        // If includeValues is requested, fetch the actual values
        if (includeValues === 'true') {
          try {
            const value = await store.getJSON(key);
            data[key] = value;
          } catch (err) {
            console.warn(`Failed to get value for ${key}:`, err);
            data[key] = null;
          }
        }
      }

      console.log(`✅ Found ${keys.length} blobs`);

      const response = includeValues === 'true'
        ? { keys, data, count: keys.length }
        : { keys, count: keys.length };

      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(response),
      };
    }

  } catch (err) {
    console.error(`❌ Error listing KV pairs:`, err);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: String(err?.message || err),
        timestamp: new Date().toISOString()
      }),
    };
  }
};