// netlify/functions/kv-get.ts
import { NetlifyFunctionsResponse, HandlerEvent, HandlerContext } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

// Local development fallback storage (shared with kv-upsert)
let localStore: Map<string, any> = new Map();

const getKVStore = () => {
  try {
    return getStore("kv");
  } catch (error) {
    console.log("Using local development fallback store");
    return null;
  }
};

export const handler = async (event: HandlerEvent, context: HandlerContext): Promise<NetlifyFunctionsResponse> => {
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

    const { key } = event.queryStringParameters || {};
    
    if (!key) {
      return { 
        statusCode: 400, 
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "Missing key parameter" })
      };
    }

    console.log(`📖 Reading blob: ${key}`);

    const store = getKVStore();
    let value = null;
    
    if (store) {
      // Production: Use Netlify Blobs
      value = await store.getJSON(key);
    } else {
      // Local development: Use in-memory fallback
      value = localStore.get(key) || null;
    }
    
    if (value === null) {
      console.log(`❌ Key not found: ${key}`);
      return {
        statusCode: 404,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          error: "Key not found",
          key,
          timestamp: new Date().toISOString()
        }),
      };
    }

    console.log(`✅ Successfully retrieved: ${key}`);

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        key,
        value,
        timestamp: new Date().toISOString()
      }),
    };
  } catch (err: any) {
    console.error(`❌ Error in kv-get:`, err);
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