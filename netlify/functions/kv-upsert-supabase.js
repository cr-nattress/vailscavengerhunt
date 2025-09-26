/**
 * KV Upsert Function - Supabase Version
 * Stores key-value pairs with optional indexes in Supabase
 */

const { getSupabaseClient } = require('./_lib/supabaseClient');

exports.handler = async (event, context) => {
  try {
    // Handle CORS preflight
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
        },
        body: "",
      };
    }

    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "Method Not Allowed" })
      };
    }

    const { key, value, indexes } = JSON.parse(event.body || "{}");

    if (!key || typeof value !== "object") {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "key and JSON value required" })
      };
    }

    console.log(`📝 Storing KV pair: ${key} in Supabase`);

    // Use Supabase
    const supabase = getSupabaseClient();

    // Prepare the data for upsert
    const kvData = {
      key: key,
      value: value,
      indexes: indexes && Array.isArray(indexes)
        ? indexes.filter(ix => ix.key && ix.member).map(ix => `${ix.key}:${ix.member}`)
        : [],
      updated_at: new Date().toISOString()
    };

    // Perform upsert (insert or update based on key)
    const { data, error } = await supabase
      .from('kv_store')
      .upsert(kvData, {
        onConflict: 'key',
        returning: 'minimal' // Don't return the full record for performance
      });

    if (error) {
      console.error(`❌ Supabase error:`, error);
      throw new Error(`Database error: ${error.message}`);
    }

    // Handle additional index operations if needed
    if (indexes && Array.isArray(indexes)) {
      console.log(`🔍 Processed ${indexes.length} indexes in Supabase`);

      // Log index information for debugging
      for (const ix of indexes) {
        if (ix.key && ix.member) {
          console.log(`✅ Index stored: ${ix.key}:${ix.member}`);
        }
      }
    }

    console.log(`✅ Successfully stored in Supabase: ${key}`);

    // Return same format as original for backward compatibility
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ok: true,
        key,
        timestamp: new Date().toISOString(),
        storage: 'supabase' // Add indicator for debugging
      }),
    };

  } catch (err) {
    console.error(`❌ Error in kv-upsert:`, err);
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