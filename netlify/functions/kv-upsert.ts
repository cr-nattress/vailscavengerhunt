// netlify/functions/kv-upsert.ts
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

    const { key, value, indexes } = JSON.parse(event.body || "{}") as {
      key: string;
      value: unknown;
      indexes?: Array<{ key: string; member: string }>;
    };

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

    // Write main record to Netlify Blob
    await store.setJSON(key, value);

    // Handle indexes (append-only sets)
    if (indexes && Array.isArray(indexes)) {
      console.log(`🔍 Processing ${indexes.length} indexes`);
      for (const ix of indexes) {
        if (ix.key && ix.member) {
          const set = store.set(ix.key);
          await set.add(ix.member);
          console.log(`✅ Added to index ${ix.key}: ${ix.member}`);
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
  } catch (err: any) {
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