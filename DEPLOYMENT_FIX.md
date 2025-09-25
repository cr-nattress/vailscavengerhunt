# Deployment API Issues - Analysis and Fix

## Problem Summary
When deployed to Netlify, the app shows these errors:
1. `Unexpected token '<', "<!doctype "... is not valid JSON` - API returning HTML instead of JSON
2. 404 errors on `/api/settings/*` endpoints
3. Settings can't be saved

## Root Cause
The API endpoints are returning the HTML fallback page instead of being routed to Netlify Functions.

## Issue Analysis

### Current Setup
- **Local Development**:
  - Express server on port 3001 handles `/api/settings/*`
  - Vite proxies `/api/*` to localhost:3001
  - Works perfectly locally

- **Production (Netlify)**:
  - No Express server running
  - Netlify Functions should handle `/api/*` routes
  - `netlify.toml` has redirects configured
  - BUT: The SPA fallback redirect is catching requests before function redirects

## The Fix

The issue is in `netlify.toml`. The SPA fallback redirect:
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

This catch-all is intercepting API calls before they reach the function redirects.

### Solution: Reorder Redirects

Netlify processes redirects in order. API redirects must come BEFORE the SPA fallback.

## Immediate Actions

1. **Verify redirect order in netlify.toml** - API redirects should be first
2. **Add explicit conditions to SPA fallback** to exclude API routes
3. **Test with Netlify CLI locally** before deploying

## Updated netlify.toml Structure

```toml
# 1. API redirects FIRST (already correct in current file)
[[redirects]]
  from = "/api/settings/*"
  to = "/.netlify/functions/settings-get/:splat"
  # ...

# 2. SPA fallback LAST with conditions
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
  conditions = {Role = ["user"]}  # Or exclude /api/* paths
```

## Alternative Fix: Update SPA Redirect

Change the SPA fallback to be more specific:
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
  force = false  # Don't override existing paths
```

## Testing Locally

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Run with Netlify Dev (mimics production)
netlify dev

# Test API endpoint
curl http://localhost:8888/api/settings/bhhs/berrypicker/fall-2025
```

## Environment Variables for Production

Ensure these are set in Netlify dashboard:
- `VITE_SENTRY_DSN` (if using Sentry)
- Any Supabase/database credentials
- `NODE_ENV=production`

## Quick Fix for Current Deployment

Since the redirects are actually in the correct order, the issue might be:

1. **The 404 is legitimate** - The Netlify Blob store doesn't have the data yet
2. **The HTML error** happens when the function itself errors

To fix:
1. The app should handle 404s gracefully and create default settings
2. Add better error handling in the Netlify functions

## Next Steps

1. Deploy with updated error handling
2. Monitor Netlify function logs for errors
3. Ensure Netlify Blobs store is properly configured
4. Add logging to track where requests are going