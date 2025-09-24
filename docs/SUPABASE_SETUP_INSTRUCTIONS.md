# Supabase Setup Instructions

## Prerequisites
- Node.js 18+ installed
- npm or yarn package manager
- Modern web browser

## Step 1: Create Supabase Account & Project

### 1.1 Account Creation
1. Go to https://supabase.com
2. Click "Start your project"
3. Sign up with GitHub (recommended) or email
4. Complete account verification if required

### 1.2 Project Creation
```bash
# Create new project with these settings:
Name: vail-scavenger-hunt
Database Password: [Generate secure password - save this!]
Region: US East (us-east-1) - closest to target users
Organization: [Create or select existing]
```

### 1.3 Get Project Credentials
Once your project is created, navigate to **Project Settings > API**:

```bash
# Copy these values (you'll need them for .env):
Project URL: https://your-project-id.supabase.co
API URL: https://your-project-id.supabase.co/rest/v1/
Anon Key: [Long public key for client-side access]
Service Role Key: [Long secret key for admin operations]
```

## Step 2: Local Environment Setup

### 2.1 Configure Environment Variables
```bash
# Copy the template
cp .env.supabase.template .env

# Edit .env with your actual Supabase values:
VITE_SUPABASE_URL=https://your-actual-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key
```

### 2.2 Verify Installation
```bash
# Check Supabase CLI installation
npx supabase --version

# Validate environment setup
npm run validate:supabase
```

## Step 3: Project Configuration

### 3.1 Enable Realtime (Optional - for live features)
1. Go to **Database > Replication**
2. Enable realtime for tables you want to subscribe to
3. Will configure specific tables after schema creation

### 3.2 Configure Authentication
1. Go to **Authentication > Settings**
2. **Site URL**: Add your Netlify domain
3. **Redirect URLs**: Add your development and production URLs
4. **Email Templates**: Customize if needed (optional for this use case)

### 3.3 Set up CORS (if needed)
1. Go to **Settings > API**
2. Add your domains to CORS origins
3. Include localhost:5173 for development

## Step 4: Database Connection Test

### 4.1 Test API Access
```bash
# Test the connection
curl "https://your-project-id.supabase.co/rest/v1/" \
  -H "apikey: your-anon-key"
```

Expected response: `{"message":"We're glad you're here. Docs: https://supabase.com/docs"}`

### 4.2 Verify Dashboard Access
1. Access your project dashboard
2. Navigate to **Database > Tables** (should be empty initially)
3. Navigate to **Authentication > Users** (should be empty initially)

## Step 5: Next Steps

### Ready for Schema Creation
Once basic setup is complete:
1. ✅ Project created and accessible
2. ✅ Environment variables configured
3. ✅ API access verified
4. ✅ Dashboard navigation confirmed

**Next**: Proceed to Task 02 - Database Schema Design

## Troubleshooting

### Common Issues

**API Key Issues:**
- Ensure anon key is correct (starts with `eyJ`)
- Service role key should be different from anon key
- Double-check environment variable names

**Connection Issues:**
- Verify project URL format (must include https://)
- Check if project is paused (free tier auto-pauses)
- Confirm region selection matches your setup

**CORS Issues:**
- Add your development URL (localhost:5173)
- Add your Netlify production domain
- Include both http and https variants if needed

## Security Notes

- **Never commit** the service role key to version control
- **Anon key is safe** for client-side use (public)
- **Service role key** has admin privileges - keep secure
- Use environment variables for all sensitive data

## Cost Management

**Free Tier Limits:**
- 500MB database storage
- 1GB file storage
- 2GB bandwidth
- 50MB file uploads

**Pro Tier ($25/month):**
- 8GB database storage
- 100GB file storage
- 250GB bandwidth
- 5GB file uploads

Monitor usage in **Settings > Usage** to track consumption.