// netlify/functions/kv-get.ts
import { NetlifyFunctionsResponse, HandlerEvent, HandlerContext } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

const store = getStore("kv"); // "kv" is the blob store name

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

    // Get the value from Netlify Blob
    const value = await store.getJSON(key);
    
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