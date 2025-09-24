# Sponsor Assets Setup Guide

## Overview
This guide walks through setting up the sponsor assets system, including database schema, storage bucket, and test data.

## Prerequisites
- Supabase project created
- Environment variables configured:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

## Setup Steps

### 1. Database Schema Setup
Run the automated setup script:

```bash
npm run setup:sponsor-assets
```

This script will:
- Create the `sponsor_assets` table with proper indexes
- Set up Row Level Security (RLS) policies
- Configure triggers for `updated_at` timestamps
- Validate the installation

### 2. Storage Bucket Setup (Manual)
The storage bucket must be created manually in the Supabase Dashboard:

#### Steps:
1. Go to **Supabase Dashboard** → **Storage**
2. Click **"New bucket"**
3. Configure:
   - **Name**: `sponsors`
   - **Public bucket**: ✅ Enabled
   - **File size limit**: `5MB`
   - **Allowed MIME types**:
     - `image/png`
     - `image/jpeg`
     - `image/jpg`
     - `image/svg+xml`

#### Storage Policies:
The following policies should be automatically applied:

**Public Read Access:**
- **Operation**: `SELECT`
- **Target**: `public`
- **Definition**: `bucket_id = 'sponsors'`

**Service Role Upload Access:**
- **Operation**: `INSERT, UPDATE, DELETE`
- **Target**: `service_role`
- **Definition**: `bucket_id = 'sponsors'`

### 3. Seed Test Data
Add sample sponsor data for testing:

```bash
# If using psql directly
psql -h your-supabase-host -U postgres -d postgres -f scripts/seed-sponsor-data.sql

# Or via Supabase SQL editor
# Copy and paste contents of seed-sponsor-data.sql
```

### 4. Verify Setup

#### Database Verification:
```sql
-- Check table exists and has data
select count(*) from public.sponsor_assets;

-- Check RLS is enabled
select schemaname, tablename, rowsecurity
from pg_tables
where tablename = 'sponsor_assets';

-- Test data access
select organization_id, hunt_id, company_name, is_active
from public.sponsor_assets
where is_active = true
order by organization_id, hunt_id, order_index;
```

#### Storage Verification:
1. Go to **Storage** → **sponsors** bucket
2. Try uploading a test image
3. Verify public access to uploaded files

## Test Data Overview

The seed data includes sponsors for different test scenarios:

### BHHS Fall 2025 (Multiple Sponsors - 1x2/1x3 Layout Test)
- **CHALK Digital** (PNG) - Marketing agency
- **First National Bank** (PNG) - Financial sponsor
- **Mountain Gear Co** (JPEG) - Outdoor equipment
- **TechStart Inc** (SVG) - Technology company
- **Local Coffee Shop** (SVG) - Local business

### Vail Winter 2025 (Ski Resort Event - 1x3 Layout Test)
- **Vail Ski Resort** (PNG) - Main sponsor
- **Alpine Sports** (SVG) - Equipment rental
- **Mountain View Lodge** (JPEG) - Accommodation

### Test Org Single Sponsor (1x1 Layout Test)
- **Major Event Sponsor** (SVG) - Premium sponsor

### Test Org No Sponsors (Empty State Test)
- No sponsors configured - tests empty response handling

## NPM Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "setup:sponsor-assets": "node scripts/setup-sponsor-assets.js",
    "seed:sponsor-data": "echo 'Run seed-sponsor-data.sql in Supabase SQL editor'",
    "test:sponsor-api": "curl -X POST http://localhost:8888/.netlify/functions/sponsors-get -H 'Content-Type: application/json' -d '{\"organizationId\":\"bhhs\",\"huntId\":\"fall-2025\"}'"
  }
}
```

## Troubleshooting

### Common Issues

**"Table does not exist" error:**
- Ensure setup script ran successfully
- Check Supabase service role permissions
- Verify connection to correct Supabase project

**"Access denied" errors:**
- Check RLS policies are correctly applied
- Verify service role key has proper permissions
- Ensure public access is enabled for read operations

**Storage bucket issues:**
- Confirm bucket name is exactly `sponsors`
- Verify bucket is set to public
- Check storage policies are applied correctly

**Seed data not visible:**
- Check `is_active = true` on sponsor records
- Verify organization_id and hunt_id match your test data
- Ensure RLS policies allow read access

### Validation Queries

```sql
-- Check table structure
\d public.sponsor_assets;

-- Check indexes
\di public.sponsor_assets*;

-- Check RLS policies
select schemaname, tablename, policyname, roles, cmd, qual
from pg_policies
where tablename = 'sponsor_assets';

-- Test public access (run as anonymous user)
set role to 'anon';
select count(*) from public.sponsor_assets where is_active = true;
reset role;
```

## Next Steps

After successful setup:

1. **Test API Integration**: Create the sponsors-get function
2. **Upload Sample Images**: Add real images to storage bucket for PNG/JPEG sponsors
3. **Configure Layouts**: Set up sponsor layout preferences in settings
4. **Frontend Integration**: Build React components to display sponsors

## File Structure

```
scripts/
├── sponsor-assets-schema.sql      # Database schema and RLS
├── setup-sponsor-assets.js        # Automated setup script
├── seed-sponsor-data.sql          # Test data for development
└── sponsor-assets-setup.md        # This documentation
```

## Security Considerations

- **RLS Policies**: Only active sponsors are publicly readable
- **Service Role**: Full access for administrative operations
- **Storage Access**: Public read, service role write
- **SVG Sanitization**: Will be implemented in frontend components
- **Input Validation**: Enforced via database constraints