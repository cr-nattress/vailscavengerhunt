// Load environment variables FIRST (restart)
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

// Get current file path for proper .env resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = path.join(__dirname, '../../.env');

dotenv.config({ path: envPath });

// Initialize Sentry EARLY - before other imports
import { maybeInitSentryNode, captureSentryException } from '../logging/server';
maybeInitSentryNode();

import express from 'express';
import cors from 'cors';
import collageRouter from './collageRoute';
import kvRouter from './kvRoute';
import photoRouter from './photoRoute';
import settingsRouter from './settingsRoute';
import progressRouter from './progressRoute';
import leaderboardRouter from './leaderboardRoute';
import teamRouter from './teamRoute';
import sponsorsRouter from './sponsorsRoute';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
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
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

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
  
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
    console.warn('⚠️  Warning: Cloudinary not configured. Check your .env file.');
  }
});

export default app;
