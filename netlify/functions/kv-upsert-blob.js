const { getStore } = require("@netlify/blobs");

// Local development fallback storage
let localStore = new Map();
let localIndexes = new Map();

const getKVStore = () => {
  try {
    // Check if we're in Netlify environment
    if (!process.env.NETLIFY) {
      console.log("Not in Netlify environment, using local fallback");
      return null;
    }
    return getStore("kv");
  } catch (error) {
    console.log("Error getting store, using local fallback:", error.message);
    return null;
  }
};

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

    console.log(`📝 Storing blob: ${key}`);

    const store = getKVStore();

    if (store) {
      // Production: Use Netlify Blobs
      await store.setJSON(key, value);

      // Handle indexes by storing them as JSON arrays
      if (indexes && Array.isArray(indexes)) {
        console.log(`🔍 Processing ${indexes.length} indexes`);
        for (const ix of indexes) {
          if (ix.key && ix.member) {
            // Get existing index or create new array
            let indexArray = [];
            try {
              const existing = await store.get(ix.key, { type: 'json' });
              if (Array.isArray(existing)) {
                indexArray = existing;
              }
            } catch (e) {
              // Index doesn't exist yet, start with empty array
            }

            // Add member if not already present
            if (!indexArray.includes(ix.member)) {
              indexArray.push(ix.member);
              await store.setJSON(ix.key, indexArray);
              console.log(`✅ Added to index ${ix.key}: ${ix.member}`);
            }
          }
        }
      }
    } else {
      // Local development: Use in-memory fallback
      localStore.set(key, value);

      // Handle indexes for local development
      if (indexes && Array.isArray(indexes)) {
        console.log(`🔍 Processing ${indexes.length} indexes (local)`);
        for (const ix of indexes) {
          if (ix.key && ix.member) {
            if (!localIndexes.has(ix.key)) {
              localIndexes.set(ix.key, new Set());
            }
            localIndexes.get(ix.key).add(ix.member);
            console.log(`✅ Added to local index ${ix.key}: ${ix.member}`);
          }
        }
      }
    }

    console.log(`✅ Successfully stored: ${key}`);

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ok: true,
        key,
        timestamp: new Date().toISOString()
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