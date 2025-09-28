// Load environment variables FIRST (restart)
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import fs from 'fs';

// Get current file path for proper .env resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = path.join(__dirname, '../../.env');

dotenv.config({ path: envPath });

// Initialize Sentry EARLY - before other imports
import { maybeInitSentryNode, captureSentryException } from '../logging/server';
maybeInitSentryNode();

import express from 'express';
import * as Sentry from '@sentry/node'
import cors from 'cors';
import collageRouter from './collageRoute';
import kvRouter from './kvRoute';
import photoRouter from './photoRoute';
import settingsRouter from './settingsRoute';
import progressRouter from './progressRoute';
import leaderboardRouter from './leaderboardRoute';
import teamRouter from './teamRoute';
import sponsorsRouter from './sponsorsRoute';
import consolidatedRouter from './consolidatedRoute';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());

// Add connection keep-alive headers for better connection management
app.use((req, res, next) => {
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Keep-Alive', 'timeout=30');
  next();
});

// Setup Sentry Express handlers (works across SDK versions)
try {
  // v8-style helper adds request + error handlers
  // @ts-ignore
  if (typeof (Sentry as any).setupExpressErrorHandler === 'function') {
    // @ts-ignore
    (Sentry as any).setupExpressErrorHandler(app)
  } else if ((Sentry as any).Handlers?.requestHandler) {
    // v7 Handlers fallback
    app.use((Sentry as any).Handlers.requestHandler())
  }
} catch {}

// Parse JSON and URL-encoded bodies, but skip photo-upload endpoints
app.use((req, res, next) => {
  // Skip JSON parsing for photo upload endpoints
  if (req.path.includes('/photo-upload')) {
    return next();
  }
  return express.json()(req, res, next);
});

app.use((req, res, next) => {
  // Skip URL-encoded parsing for photo upload endpoints
  if (req.path.includes('/photo-upload')) {
    return next();
  }
  return express.urlencoded({ extended: true })(req, res, next);
});

// Raw body capture for multipart requests (must be AFTER body parsers)
app.use((req, res, next) => {
  const contentType = req.headers['content-type'] || '';

  // Capture raw body for photo upload endpoints with multipart
  if ((req.path.includes('/photo-upload-orchestrated') || req.path.includes('/photo-upload-complete'))
      && contentType.includes('multipart/form-data')) {
    let data = Buffer.alloc(0);

    req.on('data', (chunk) => {
      data = Buffer.concat([data, chunk]);
    });

    req.on('end', () => {
      (req as any).rawBody = data;
      console.log('[Raw Body Capture] Captured', data.length, 'bytes for photo-upload-orchestrated');
      next();
    });
  } else {
    next();
  }
});

// Serve static files from public directory
const publicPath = path.join(__dirname, '../../public');
app.use(express.static(publicPath));

// API routes
app.use('/api', collageRouter);
app.use('/api', kvRouter);
app.use('/api', photoRouter);
app.use('/api', settingsRouter);
app.use('/api', progressRouter);
app.use('/api', leaderboardRouter);
app.use('/api', teamRouter);
app.use('/api', sponsorsRouter);
app.use('/api', consolidatedRouter);

// Forward specific Netlify function requests to the handler
app.all('/api/login-initialize', async (req, res, next) => {
  // Rewrite the URL to match Netlify function pattern
  req.url = '/.netlify/functions/login-initialize';
  req.params = { functionName: 'login-initialize', '0': '' };
  next();
});

// Handle complete photo upload (photo + progress in single atomic operation)
app.all('/api/photo-upload-complete', async (req, res, next) => {
  console.log('[Photo Upload Complete] Request received');
  console.log('[Photo Upload Complete] Headers:', req.headers['content-type']);
  console.log('[Photo Upload Complete] Body size:', req.headers['content-length']);

  // Set up the request to look like it's going to the Netlify function
  const originalUrl = req.url;
  req.url = '/.netlify/functions/photo-upload-complete';
  req.params = { functionName: 'photo-upload-complete', '0': '' };

  // Call the Netlify function handler directly
  try {
    // Import and execute the Netlify function
    const netlifyFunction: any = await import('../../netlify/functions/photo-upload-complete.js');

    // Prepare the event object for the function
    let eventBody: string | null = null;
    let isBase64Encoded = false;

    if ((req as any).rawBody) {
      eventBody = (req as any).rawBody.toString('base64');
      isBase64Encoded = true;
      console.log('[Photo Upload Complete] Using raw body, size:', (req as any).rawBody.length, 'bytes');
    } else if (req.body) {
      eventBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const event = {
      path: originalUrl,
      httpMethod: req.method,
      headers: req.headers as any,
      queryStringParameters: req.query as any,
      body: eventBody,
      isBase64Encoded,
      pathParameters: {}
    };

    const handlerFn = netlifyFunction.handler;
    if (handlerFn) {
      const result = await handlerFn(event);

      // Set headers from the function response
      Object.entries(result.headers || {}).forEach(([key, value]) => {
        res.setHeader(key, value as string);
      });

      // Send the response
      res.status(result.statusCode || 200).send(result.body);
    } else {
      throw new Error('Handler function not found');
    }
  } catch (error) {
    console.error('[Photo Upload Complete] Error executing function:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Handle photo upload - DON'T parse multipart, pass raw data through
// Forward directly to Netlify function handler
app.all('/api/photo-upload-orchestrated', async (req, res, next) => {
  console.log('[Photo Upload] Request received');
  console.log('[Photo Upload] Headers:', req.headers['content-type']);
  console.log('[Photo Upload] Body size:', req.headers['content-length']);

  // Set up the request to look like it's going to the Netlify function
  const originalUrl = req.url;
  req.url = '/.netlify/functions/photo-upload-orchestrated';
  req.params = { functionName: 'photo-upload-orchestrated', '0': '' };

  // Call the Netlify function handler directly
  try {
    // Import and execute the Netlify function
    const netlifyFunction: any = await import('../../netlify/functions/photo-upload-orchestrated.js');

    // Prepare the event object for the function
    let eventBody: string | null = null;
    let isBase64Encoded = false;

    if ((req as any).rawBody) {
      eventBody = (req as any).rawBody.toString('base64');
      isBase64Encoded = true;
      console.log('[Photo Upload] Using raw body, size:', (req as any).rawBody.length, 'bytes');
    } else if (req.body) {
      eventBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const event = {
      path: originalUrl,
      httpMethod: req.method,
      headers: req.headers as any,
      queryStringParameters: req.query as any,
      body: eventBody,
      isBase64Encoded,
      pathParameters: {}
    };

    const handlerFn = netlifyFunction.handler;
    if (handlerFn) {
      const result = await handlerFn(event);

      // Set headers from the function response
      Object.entries(result.headers || {}).forEach(([key, value]) => {
        res.setHeader(key, value as string);
      });

      // Send the response
      res.status(result.statusCode || 200).send(result.body);
    } else {
      throw new Error('Handler function not found');
    }
  } catch (error) {
    console.error('[Photo Upload] Error executing function:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Handle OPTIONS for CORS preflight
app.options('/api/photo-upload-complete', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.status(204).send();
});

// Handle OPTIONS for CORS preflight
app.options('/api/photo-upload-orchestrated', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.status(204).send();
});

// Handle Netlify Functions locally in development
app.all('/.netlify/functions/:functionName*', async (req, res) => {
  try {
    // Safely access params that include a splat (*)
    const paramsAny: any = req.params as any;
    const functionNameParam: string = paramsAny.functionName ?? paramsAny['functionName*'] ?? '';
    const splatParam: string = paramsAny[0] ?? '';
    const functionPath = functionNameParam + (splatParam || '');
    let functionFile = functionPath.split('/')[0];

    // Use Supabase versions for functions that use Netlify Blobs
    const supabaseVersions: Record<string, string> = {
      'settings-get': 'settings-get-supabase',
      'settings-set': 'settings-set-supabase',
      'kv-get': 'kv-get-supabase',
      'kv-set': 'kv-set-supabase',
      'kv-upsert': 'kv-upsert-supabase',
      'progress-get': 'progress-get-supabase',
      'progress-set': 'progress-set-supabase',
      'leaderboard-get': 'leaderboard-get-supabase'
    };

    if (supabaseVersions[functionFile]) {
      functionFile = supabaseVersions[functionFile];
    }

    console.log(`Executing Netlify function: ${functionFile} (path: ${functionPath})`);

    // Import the Netlify function module
    const netlifyFunction: any = await import(`../../netlify/functions/${functionFile}.js`);

    // Prepare common request body state
    let eventBody: string | null = null;
    let isBase64Encoded = false;

    if (functionFile === 'photo-upload-orchestrated' && (req as any).rawBody) {
      // For photo upload, use raw body and encode as base64
      eventBody = (req as any).rawBody.toString('base64');
      isBase64Encoded = true;
      console.log('[Photo Upload] Using raw body, size:', (req as any).rawBody.length, 'bytes');
    } else if (req.body) {
      // If body is already a string (e.g., raw), use it; otherwise stringify
      eventBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    // Determine function style: v1 (exports.handler) or v2 (export default)
    const cjsDefault = netlifyFunction?.default && typeof netlifyFunction.default === 'object' ? netlifyFunction.default : null;
    const handlerFn: any = (typeof netlifyFunction?.handler === 'function')
      ? netlifyFunction.handler
      : (cjsDefault && typeof cjsDefault.handler === 'function')
        ? cjsDefault.handler
        : undefined;
    const hasV2Default = typeof netlifyFunction?.default === 'function';

    if (handlerFn) {
      // v1 style (AWS Lambda-style) - use event object
      const event = {
        path: req.path,
        httpMethod: req.method,
        headers: req.headers,
        queryStringParameters: req.query,
        body: eventBody,
        isBase64Encoded,
        // Add path parameters for functions like settings-get
        pathParameters: {
          proxy: functionPath.substring(functionFile.length + 1) // Remove function name and slash
        }
      };

      const result = await handlerFn(event);

      // Set headers from the function response
      Object.entries(result.headers || {}).forEach(([key, value]) => {
        res.setHeader(key, value as string);
      });

      // Send the response
      res.status(result.statusCode || 200).send(result.body);
      return;
    }

    if (hasV2Default) {
      // v2 style (Request/Response) - construct a Fetch API Request
      const origin = `${req.protocol}://${req.get('host')}`;
      const fullUrl = new URL(req.originalUrl || req.url, origin).toString();

      const requestInit: any = {
        method: req.method,
        headers: req.headers as any
      };

      // Attach raw body when available and method allows a body
      if (!['GET', 'HEAD'].includes(req.method.toUpperCase())) {
        if ((req as any).rawBody) {
          requestInit.body = (req as any).rawBody; // Buffer
        } else if (typeof eventBody === 'string') {
          requestInit.body = eventBody; // JSON string or raw
        }
      }

      const RequestCtor: any = (global as any).Request;
      const v2Request = new RequestCtor(fullUrl, requestInit);

      const v2Response: any = await netlifyFunction.default(v2Request, {});

      // Copy headers from Response
      if (v2Response?.headers) {
        for (const [key, value] of v2Response.headers.entries()) {
          res.setHeader(key, value as string);
        }
      }

      // Stream/Buffer the body back to Express
      const arrayBuffer = await v2Response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      res.status(v2Response.status || 200).send(buffer);
      return;
    }

    // If neither format is detected, throw informative error
    throw new Error(`Unsupported Netlify function format for ${functionFile}. Expected exports.handler or default export.`);
  } catch (error: any) {
    console.error('Error executing Netlify function:', error);
    res.status(500).json({ error: 'Internal server error', details: error?.message || String(error) });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    cloudinary: {
      configured: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY),
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'not-set'
    }
  });
});

// Serve React app for all other routes (SPA fallback)
// In development, this should redirect to Vite dev server
app.get('*', (req, res) => {
  if (process.env.NODE_ENV === 'development' || !fs.existsSync(path.join(__dirname, '../../public/index.html'))) {
    // In development, redirect to Vite dev server
    res.status(404).json({
      error: 'Not Found',
      message: 'In development mode, use http://localhost:5173 for the UI'
    });
  } else {
    // In production, serve the built React app
    res.sendFile(path.join(__dirname, '../../public/index.html'));
  }
});

// Sentry error handler MUST come before any other error middleware (v7 fallback)
try {
  if ((Sentry as any).Handlers?.errorHandler) {
    app.use((Sentry as any).Handlers.errorHandler())
  }
} catch {}

// Error handling middleware (restart)
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);

  // Capture exception in Sentry if available
  try {
    captureSentryException(err, {
      component: 'express-server',
      action: 'request-handler',
      url: req.url,
      method: req.method,
      headers: req.headers,
      userAgent: req.get('User-Agent'),
      requestId: req.headers['x-request-id'] || req.headers['x-nf-request-id']
    });
  } catch (sentryError) {
    // Sentry capture failed - don't break the response
    console.warn('Failed to capture exception in Sentry:', sentryError);
  }

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT} with Supabase sponsors and Sentry integration`);
  console.log(`📁 Static files served from: ${publicPath}`);
  console.log(`☁️  Cloudinary configured: ${!!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY)}`);
  console.log(`☁️  Cloudinary cloud: ${process.env.CLOUDINARY_CLOUD_NAME}`);

  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
    console.warn('⚠️  Warning: Cloudinary not configured. Check your .env file.');
  }
});

export default app;

// trigger restart
// restart trigger
// force restart
