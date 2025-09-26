# Sentry Error Tracking Setup

## Current Status
✅ Sentry is **always enabled** in the application
✅ Global error handlers are installed
⚠️ **Running in offline mode** (no DSN configured)

## Why Errors Aren't Showing in Sentry

The application has Sentry integrated and running, but it's in **offline mode** because no Sentry DSN is configured. This means:
- All Sentry API calls work (no errors)
- Errors are captured internally
- Nothing is sent to Sentry servers

## To Enable Sentry Error Tracking

### Step 1: Get Your Sentry DSN

1. Go to [Sentry.io](https://sentry.io)
2. Sign up or log in
3. Create a new project (React)
4. Copy your DSN from: Settings → Projects → [Your Project] → Client Keys

Your DSN will look like:
```
https://abc123def456@o123456.ingest.sentry.io/1234567
```

### Step 2: Add DSN to Environment

Create or update your `.env` file:

```bash
# Client-side Sentry
VITE_SENTRY_DSN=https://YOUR_KEY@o123456.ingest.sentry.io/YOUR_PROJECT_ID
VITE_SENTRY_ENVIRONMENT=development
VITE_SENTRY_TRACES_SAMPLE_RATE=1.0  # 100% in dev, use 0.1 in production

# Server-side Sentry
SENTRY_DSN=https://YOUR_KEY@o123456.ingest.sentry.io/YOUR_PROJECT_ID
SENTRY_ENVIRONMENT=development
```

### Step 3: Restart the Application

```bash
# Stop current server (Ctrl+C)
npm run start
```

### Step 4: Verify Sentry is Working

Once restarted with a valid DSN, you should see in console:
```
[Sentry] Browser client initialized successfully with DSN
[Sentry] Node client initialized successfully with DSN
```

## What Errors Are Captured

With the current setup, Sentry will automatically capture:

1. **JavaScript Errors**: All uncaught exceptions
2. **Promise Rejections**: Unhandled promise rejections
3. **Network Errors**: Failed fetch requests
4. **Server Errors**: HTTP 500+ responses
5. **React Errors**: Component errors via ErrorBoundary
6. **Logger Errors**: All errors logged through the logging system

## Testing Sentry

### Method 1: Use the Test Component

```jsx
// Temporarily add to your App.jsx
import { SentryTestComponent } from './components/SentryTestComponent'

// In your JSX
<SentryTestComponent />
```

### Method 2: Trigger Test Error in Console

Open browser DevTools console and run:
```javascript
// This will be captured by global error handler
throw new Error("Test Sentry Integration")
```

### Method 3: Test Network Error Capture

The 500 error from `/api/write-log` should already be captured once you add a DSN.

## Current Issues

### `/api/write-log` 500 Error
This endpoint is failing because it's a Netlify function that's not running locally. To fix:

**Option 1**: Run with Netlify Dev
```bash
npm run start:netlify
```

**Option 2**: Disable file logging in development
The error is non-critical - it's just trying to write logs to a file.

## Production Deployment

For production deployments, add these environment variables:

### Vercel/Netlify
```
VITE_SENTRY_DSN=your_production_dsn
VITE_SENTRY_ENVIRONMENT=production
VITE_SENTRY_TRACES_SAMPLE_RATE=0.1
```

## Troubleshooting

### "Sentry is not capturing errors"
- Check console for: `[Sentry] Browser client initialized successfully with DSN`
- If it says "offline mode", you need to add a DSN to `.env`
- Make sure to restart the dev server after adding DSN

### "I added DSN but still not working"
1. Verify DSN format is correct
2. Check for typos in environment variable names
3. Restart the development server
4. Clear browser cache
5. Check browser DevTools Network tab for requests to `ingest.sentry.io`

## Summary

**Sentry is fully integrated** but needs a DSN to send errors to your Sentry dashboard. Without a DSN, it runs in offline mode - all the capture logic works but nothing is sent anywhere.

Add your Sentry DSN to `.env` and restart to start seeing errors in your Sentry dashboard!