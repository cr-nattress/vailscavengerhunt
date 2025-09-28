# Netlify Environment Variables Configuration

## Required Environment Variables for Production

The following environment variables MUST be set in the Netlify dashboard for the application to work correctly:

### Supabase Configuration (REQUIRED)
```
SUPABASE_URL=https://ksiqnglqlurlackoteyc.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzaXFuZ2xxbHVybGFja290ZXljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NjAxODcsImV4cCI6MjA3NDIzNjE4N30.ntdKKD1TkeeC0giJykw15bh5tR_dHMb9ZCNfL9rjGkc
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzaXFuZ2xxbHVybGFja290ZXljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODY2MDE4NywiZXhwIjoyMDc0MjM2MTg3fQ.jtiLrW4zLHm2DjorFCw7w4GzJXYo9U5JurJfdiG2d9g
```

### Cloudinary Configuration (REQUIRED)
```
CLOUDINARY_URL=cloudinary://635817961487476:AR3sYIZbDW9yAQ9JGGwqEOZIsqQ@dwmjbmdgq
CLOUDINARY_CLOUD_NAME=dwmjbmdgq
CLOUDINARY_API_KEY=635817961487476
CLOUDINARY_API_SECRET=AR3sYIZbDW9yAQ9JGGwqEOZIsqQ
CLOUDINARY_UPLOAD_FOLDER=scavenger/entries
CLOUDINARY_COLLAGE_WIDTH=2048
CLOUDINARY_COLLAGE_HEIGHT=1152
CLOUDINARY_COLLAGE_BG=#111111
```

### Email Configuration (Optional)
```
RESEND_API_KEY=re_7iR6vpfu_FYz5eEcqRnnS2ZjmYCfPF4ji
RESEND_FROM=cnattress@gmail.com
EMAIL_DEV_MODE=false
```

### Feature Flags (Optional)
```
ENABLE_SPONSOR_CARD=true
ENABLE_ORCHESTRATED_UPLOAD=true
```

### Sentry Configuration (Optional)
```
SENTRY_DSN=<your-sentry-dsn>
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=<your-release-version>
```

## How to Set Environment Variables in Netlify

1. Go to your Netlify dashboard
2. Navigate to your site
3. Click on "Site settings"
4. Click on "Environment variables" in the left sidebar
5. Click "Add a variable"
6. For each variable above:
   - Enter the variable name (e.g., `SUPABASE_URL`)
   - Enter the value
   - Choose "Production" for the scope (or "All scopes" if you want it in preview deployments too)
   - Click "Save"

## Verification

After setting the environment variables and deploying:

1. The `/api/login-initialize` endpoint should return a JSON response (not HTML)
2. You can verify by checking: `https://findr.quest/api/login-initialize` (should return a 405 for GET requests)
3. Check the function logs in Netlify dashboard under "Functions" tab

## Troubleshooting

If the API endpoints still return 404:

1. **Check the build logs** - Ensure the functions are being detected and built
2. **Check the _redirects file** - Ensure it's being included in the build (should be in the `dist` folder after build)
3. **Check function logs** - Look for runtime errors in the Netlify Functions tab
4. **Verify environment variables** - Missing required variables will cause functions to fail

## Important Notes

- The `_redirects` file in the `public` folder takes precedence over `netlify.toml` redirects
- API redirects MUST come before the SPA fallback redirect
- Functions automatically have access to environment variables set in Netlify dashboard
- No need to use `dotenv` in production - Netlify injects env vars automatically