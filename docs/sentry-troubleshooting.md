# Sentry Integration Troubleshooting Guide

## Quick Diagnosis

### 1. Check Current Status
Run the application and navigate to the Sentry test component to verify the integration:

```javascript
// Add this temporary route to your App.jsx
import { SentryTestComponent } from './components/SentryTestComponent'

// In your routing or component rendering:
<SentryTestComponent />
```

## Common Issues and Solutions

### Issue: Sentry Not Receiving Any Events

#### Root Causes Analysis

1. **Environment Variables Not Set**
   - **Check:** Run `console.log(import.meta.env.VITE_ENABLE_SENTRY, import.meta.env.VITE_SENTRY_DSN)` in browser console
   - **Solution:** Ensure `.env` file contains:
     ```
     VITE_ENABLE_SENTRY=true
     VITE_SENTRY_DSN=https://YOUR_KEY@o123456.ingest.sentry.io/1234567
     ```
   - **Note:** Restart dev server after changing .env files

2. **Sentry Not Initialized**
   - **Check:** Look for "[Sentry] Browser client initialized successfully" in browser console
   - **Issue Location:** `src/logging/initSentryClient.ts:13`
   - **Solution:** The initialization is conditional on VITE_ENABLE_SENTRY being exactly "true"

3. **Logger Not Using Sentry Sink**
   - **Check:** Verify `enableSentry` parameter in logger creation
   - **Issue Location:** `src/logging/factories/clientLoggerFactory.ts:82,97`
   - **Solution:** Loggers check `import.meta.env.VITE_ENABLE_SENTRY === 'true'`

4. **Sentry Sink Not Active**
   - **Check:** `SentryBrowserSink` checks if Sentry is initialized
   - **Issue Location:** `src/logging/sinks/SentryBrowserSink.ts:10`
   - **Solution:** Ensure Sentry.getCurrentScope() returns a valid scope

## Step-by-Step Fix

### 1. Configure Environment Variables
```bash
# Copy template and edit with your values
cp .env.sentry.template .env

# Edit .env and set:
VITE_ENABLE_SENTRY=true
VITE_SENTRY_DSN=your_actual_dsn_here
```

### 2. Restart Development Server
```bash
# Stop current server (Ctrl+C)
# Start fresh
npm run dev
```

### 3. Verify Initialization
Open browser DevTools console and check for:
- "[Sentry] Browser client initialized successfully"
- No errors about missing DSN

### 4. Test Error Capture
```javascript
// In browser console:
throw new Error("Sentry test error")

// Or use the test component:
// Click "Run All Tests" button in SentryTestComponent
```

### 5. Check Sentry Dashboard
- Go to https://sentry.io/issues/
- Look for recent events
- Check correct project is selected

## Configuration Files

### Required Files and Their Purposes

1. **`.env`** - Environment variables
   ```
   VITE_ENABLE_SENTRY=true
   VITE_SENTRY_DSN=your_dsn_here
   ```

2. **`src/logging/initSentryClient.ts`** - Client-side initialization
   - Checks VITE_ENABLE_SENTRY === 'true'
   - Initializes with DSN from VITE_SENTRY_DSN

3. **`src/main.jsx`** - Application entry point
   - Calls `maybeInitSentryBrowser()` on line 16
   - Wraps app in Sentry.ErrorBoundary if initialized

4. **`src/logging/sinks/SentryBrowserSink.ts`** - Sentry logging sink
   - Sends logs to Sentry as breadcrumbs or exceptions

5. **`vite.config.js`** - Build configuration
   - Includes Sentry plugin for source maps (optional)

## Debug Mode

Enable debug mode to see what Sentry is doing:

```typescript
// In src/logging/initSentryClient.ts, add to Sentry.init():
Sentry.init({
  dsn,
  debug: true,  // Add this line
  // ... other config
})
```

## Verification Checklist

- [ ] `.env` file exists with VITE_ENABLE_SENTRY=true
- [ ] VITE_SENTRY_DSN is set to valid DSN
- [ ] Dev server restarted after env changes
- [ ] Browser console shows initialization success message
- [ ] No ad blockers blocking Sentry requests
- [ ] No CORS issues (check Network tab)
- [ ] Sentry dashboard shows correct project
- [ ] Test error appears in Sentry within 1-2 minutes

## Production Deployment

### Vercel
Add these environment variables in Vercel dashboard:
- `VITE_ENABLE_SENTRY` = `true`
- `VITE_SENTRY_DSN` = Your DSN
- `VITE_SENTRY_ENVIRONMENT` = `production`

### Netlify
Add in Netlify environment variables:
- Same as Vercel above
- Ensure build command includes environment variables

### Docker
Include in Dockerfile or docker-compose:
```yaml
environment:
  - VITE_ENABLE_SENTRY=true
  - VITE_SENTRY_DSN=${SENTRY_DSN}
```

## Advanced Debugging

### Check if Sentry is loaded
```javascript
// Browser console
console.log('Sentry loaded:', typeof window.Sentry)
console.log('Sentry client:', Sentry.getClient())
console.log('Sentry DSN:', Sentry.getClient()?.getDsn())
```

### Force send test event
```javascript
// Browser console
Sentry.captureMessage('Manual test message', 'info')
await Sentry.flush(2000)
```

### Check network requests
1. Open Network tab in DevTools
2. Filter by "sentry" or your ingest domain
3. Look for POST requests to /envelope/
4. Check response is 200 OK

## Contact Support

If issues persist after following this guide:
1. Check Sentry status: https://status.sentry.io/
2. Review Sentry docs: https://docs.sentry.io/platforms/javascript/guides/react/
3. File issue with details: environment, browser, console errors