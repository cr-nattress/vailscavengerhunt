const { getStore } = require("@netlify/blobs");

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

    const store = getStore("kv");
    const { prefix, includeValues } = event.queryStringParameters || {};

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
  } catch (err) {
    console.error(`❌ Error listing blobs:`, err);
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