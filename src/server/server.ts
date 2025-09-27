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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Handle Netlify Functions locally in development
app.all('/.netlify/functions/:functionName*', async (req, res) => {
  try {
    const functionPath = req.params.functionName + (req.params[0] || '');
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

    // Import and execute the Netlify function locally
    const netlifyFunction = await import(`../../netlify/functions/${functionFile}.js`);

    // Prepare event object similar to Netlify's
    const event = {
      path: req.path,
      httpMethod: req.method,
      headers: req.headers,
      queryStringParameters: req.query,
      body: req.body ? JSON.stringify(req.body) : null,
      isBase64Encoded: false,
      // Add path parameters for functions like settings-get
      pathParameters: {
        proxy: functionPath.substring(functionFile.length + 1) // Remove function name and slash
      }
    };

    const result = await netlifyFunction.handler(event);

    // Set headers from the function response
    Object.entries(result.headers || {}).forEach(([key, value]) => {
      res.setHeader(key, value as string);
    });

    // Send the response
    res.status(result.statusCode || 200).send(result.body);
  } catch (error) {
    console.error('Error executing Netlify function:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
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
