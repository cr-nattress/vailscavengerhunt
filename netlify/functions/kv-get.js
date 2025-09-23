import { getStore } from '@netlify/blobs';

export default async (req, context) => {
  const url = new URL(req.url);
  const key = url.pathname.split('/').pop();

  if (!key) {
    return new Response(JSON.stringify({ error: 'Key is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const store = getStore({ name: 'kv' });

    const value = await store.get(key);

    if (!value) {
      return new Response(JSON.stringify({ error: 'Key not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(value, {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error getting blob:', error);
    return new Response(JSON.stringify({
      error: 'Failed to get value',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const config = {
  path: "/kv-get/*"
};