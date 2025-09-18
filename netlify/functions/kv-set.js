import { getStore } from '@netlify/blobs';

export default async (req, context) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await req.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return new Response(JSON.stringify({ error: 'Key and value are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const store = getStore({
      name: process.env.NETLIFY_BLOBS_STORE_NAME || 'vail-hunt-state',
      siteID: context.site.id
    });

    await store.setJSON(key, value);

    return new Response(JSON.stringify({ success: true, key }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error setting blob:', error);
    return new Response(JSON.stringify({
      error: 'Failed to set value',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const config = {
  path: "/kv-set"
};