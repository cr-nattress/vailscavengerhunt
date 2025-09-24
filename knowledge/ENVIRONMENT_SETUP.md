# Environment Variables Setup

## Required Environment Variables for Production (Netlify)

The following environment variables MUST be set in your Netlify dashboard for the application to work properly:

### Cloudinary Configuration (Required for Photo Uploads)

These variables are required for photo upload functionality:

1. **CLOUDINARY_CLOUD_NAME**
   - Your Cloudinary cloud name
   - Found in your Cloudinary Dashboard
   - Example: `dxxxxx123`

2. **CLOUDINARY_API_KEY**
   - Your Cloudinary API key
   - Found in Dashboard > Settings > API Keys
   - Example: `123456789012345`

3. **CLOUDINARY_API_SECRET**
   - Your Cloudinary API secret
   - Found in Dashboard > Settings > API Keys
   - Keep this secure!
   - Example: `AbC123XyZ...`

4. **CLOUDINARY_UPLOAD_FOLDER** (Optional)
   - Folder path for uploaded images
   - Default: `scavenger/entries`
   - Example: `my-app/photos`

## How to Set Environment Variables in Netlify

1. Go to your Netlify dashboard
2. Select your site (e.g., teamhuntpro)
3. Navigate to **Site settings** > **Environment variables**
4. Click **Add a variable**
5. Choose **Add a single variable**
6. Enter the key and value
7. Click **Create variable**
8. Repeat for all required variables
9. Redeploy your site for changes to take effect

## How to Get Cloudinary Credentials

1. Sign up for a free account at [cloudinary.com](https://cloudinary.com)
2. Go to your Dashboard after login
3. Find your **Cloud Name**, **API Key**, and **API Secret**
4. Copy these values to Netlify environment variables

## Local Development

For local development, create a `.env` file in the project root:

```env
# Required for server-side uploads
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_UPLOAD_FOLDER=scavenger/entries

# Optional: For unsigned uploads (direct from browser)
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UNSIGNED_PRESET=your_unsigned_preset_name
VITE_CLOUDINARY_UPLOAD_FOLDER=scavenger/entries
VITE_ENABLE_UNSIGNED_UPLOADS=false

# Optional: Upload settings
VITE_DISABLE_CLIENT_RESIZE=false
VITE_MAX_UPLOAD_BYTES=10485760
VITE_ALLOW_LARGE_UPLOADS=false
```

**Important**: Never commit the `.env` file to git!

## Troubleshooting

### Photo Upload Fails with 500 Error
- Check that all three Cloudinary variables are set in Netlify
- Verify the API key and secret are correct
- Make sure there are no extra spaces in the values

### "Must supply api_key" Error
- This means the Cloudinary environment variables are not set
- Add them in Netlify dashboard and redeploy

### How to Verify Configuration
After setting environment variables:
1. Go to Netlify > Deploys
2. Click "Trigger deploy" > "Deploy site"
3. Wait for deployment to complete
4. Test photo upload functionality

## Unsigned Uploads (Optional)

For direct browser-to-Cloudinary uploads (bypassing server):

1. **Create an Upload Preset in Cloudinary:**
   - Go to Settings > Upload > Upload Presets
   - Click "Add upload preset"
   - Set "Signing Mode" to **Unsigned**
   - Configure restrictions:
     - Allowed formats: jpg, png, gif, webp
     - Max file size: 10-15 MB
     - Folder: scavenger/entries
   - Note the preset name

2. **Configure in Netlify:**
   - Add `VITE_CLOUDINARY_CLOUD_NAME` (same as cloud name)
   - Add `VITE_CLOUDINARY_UNSIGNED_PRESET` (your preset name)
   - Set `VITE_ENABLE_UNSIGNED_UPLOADS` to `true` to enable

3. **Benefits:**
   - Reduces server load
   - Avoids function timeouts for large images
   - Direct CDN upload

## Security Notes

- Never expose your API Secret in client-side code
- Use Netlify Functions (serverless) to handle API calls
- Keep your `.env` file in `.gitignore`
- Rotate API keys periodically for security
- For unsigned uploads, use strict upload presets with size/format limits