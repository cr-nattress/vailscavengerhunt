// netlify/functions/kv-list.ts
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

    const { prefix, includeValues } = event.queryStringParameters || {};
    
    console.log(`📋 Listing blobs with prefix: ${prefix || '(all)'}`);

    // List all blobs with optional prefix
    const blobs = store.list({ prefix: prefix || undefined });
    const keys: string[] = [];
    const data: Record<string, any> = {};

    // Iterate through the blobs
    for await (const { key } of blobs) {
      keys.push(key);
      
      // If includeValues is requested, fetch the actual values
      if (includeValues === 'true') {
        try {
          const value = await store.getJSON(key);
          data[key] = value;
        } catch (err) {
          console.warn(`Failed to get value for key ${key}:`, err);
          data[key] = null;
        }
      }
    }

    console.log(`✅ Found ${keys.length} blobs`);

    const response = {
      keys: keys.sort(),
      count: keys.length,
      timestamp: new Date().toISOString(),
      ...(includeValues === 'true' && { data })
    };

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(response),
    };
  } catch (err: any) {
    console.error(`❌ Error in kv-list:`, err);
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