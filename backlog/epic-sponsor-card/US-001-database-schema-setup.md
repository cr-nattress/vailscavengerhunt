# US-001: Database Schema and Storage Setup

## User Story
**As a developer**, I need a Supabase table and storage bucket for sponsor assets so that sponsor data can be stored and retrieved efficiently.

## Priority: HIGH
**Estimated Time**: 4 hours
**Complexity**: MEDIUM
**Dependencies**: None

## Acceptance Criteria
- [ ] `sponsor_assets` table created in Supabase with all required columns
- [ ] Proper indexes created for query performance
- [ ] Row Level Security (RLS) policies implemented
- [ ] `sponsors` storage bucket created with proper permissions
- [ ] SQL migration script created and documented
- [ ] Seed data script created for testing

## Implementation Prompt

### Task 1: Create Database Schema
**Prompt**: Create a Supabase database schema for storing sponsor assets. The system needs to support multiple organizations, hunts, and sponsors with flexible image storage options (both file storage and inline SVG).

**Requirements**:
1. Create file `scripts/sponsor-assets-schema.sql` with:
   - `sponsor_assets` table with all columns as specified in the epic
   - UUID extension enabled
   - Proper indexes for performance
   - Auto-updating timestamps with triggers
   - Check constraints for `image_type` enum

**Table Structure**:
```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create sponsor_assets table
create table if not exists public.sponsor_assets (
  id uuid primary key default uuid_generate_v4(),
  organization_id text not null,
  hunt_id text not null,
  company_id text not null,
  company_name text not null,
  image_type text not null check (image_type in ('svg','png','jpeg','jpg')),
  image_alt text not null,
  order_index int not null default 0,
  is_active boolean not null default true,
  storage_path text,
  svg_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create indexes for performance
create index if not exists idx_sponsor_assets_org_hunt
  on public.sponsor_assets (organization_id, hunt_id, is_active, order_index);

create index if not exists idx_sponsor_assets_company
  on public.sponsor_assets (company_id);

-- Create updated_at trigger
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_sponsor_assets_updated_at
  before update on public.sponsor_assets
  for each row
  execute function update_updated_at_column();
```

### Task 2: Create RLS Policies
**Prompt**: Implement Row Level Security policies for the `sponsor_assets` table that allow public read access for active sponsors while restricting write access to service roles.

**Requirements**:
1. Add to the same `scripts/sponsor-assets-schema.sql` file:
   - Enable RLS on the table
   - Create policy for public read access (active sponsors only)
   - Create policy for service role full access

**RLS Implementation**:
```sql
-- Enable RLS
alter table public.sponsor_assets enable row level security;

-- Policy: Allow public read access to active sponsors
create policy "Public read access to active sponsors"
  on public.sponsor_assets
  for select
  to public
  using (is_active = true);

-- Policy: Allow service role full access
create policy "Service role full access"
  on public.sponsor_assets
  to service_role
  using (true)
  with check (true);
```

### Task 3: Create Storage Bucket
**Prompt**: Create a Supabase storage bucket for sponsor images with appropriate policies for public read access.

**Manual Steps** (document in `scripts/sponsor-assets-setup.md`):
1. In Supabase Dashboard → Storage → Create new bucket named `sponsors`
2. Set bucket to "Public" access
3. Create upload policy for service role
4. Create read policy for public access

**Bucket Policies**:
```sql
-- Storage policies (add these via Supabase Dashboard or CLI)
-- Policy: Allow public read access
create policy "Public read access"
  on storage.objects for select
  to public
  using (bucket_id = 'sponsors');

-- Policy: Allow service role upload/update/delete
create policy "Service role full access"
  on storage.objects
  to service_role
  using (bucket_id = 'sponsors');
```

### Task 4: Create Setup Script
**Prompt**: Create an automated setup script that can deploy the sponsor assets schema to Supabase.

**Requirements**:
1. Create `scripts/setup-sponsor-assets.js` that:
   - Connects to Supabase using service role
   - Executes the schema SQL file
   - Provides success/error feedback
   - Includes validation to check if setup was successful

**Script Template**:
```javascript
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

async function setupSponsorAssets() {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // Read and execute schema file
    const schemaSQL = fs.readFileSync(
      path.join(__dirname, 'sponsor-assets-schema.sql'),
      'utf8'
    )

    // Execute schema (implement proper SQL execution)
    // Add validation queries
    // Provide feedback

    console.log('✅ Sponsor assets schema setup completed successfully')
  } catch (error) {
    console.error('❌ Setup failed:', error.message)
    process.exit(1)
  }
}

setupSponsorAssets()
```

### Task 5: Create Seed Data Script
**Prompt**: Create a script to insert test sponsor data for development and testing.

**Requirements**:
1. Create `scripts/seed-sponsor-data.sql` with sample sponsors
2. Include various image types (SVG inline, PNG storage)
3. Cover different organizations and hunts for testing
4. Document the seed data in `scripts/sponsor-assets-setup.md`

**Sample Seed Data**:
```sql
-- Insert sample sponsor data for testing
insert into public.sponsor_assets
  (organization_id, hunt_id, company_id, company_name, image_type, image_alt, order_index, storage_path, svg_text)
values
  -- PNG sponsors with storage paths
  ('bhhs', 'fall-2025', 'chalk-digital', 'CHALK Digital', 'png', 'CHALK Digital logo', 0, 'bhhs/fall-2025/chalk-digital.png', null),
  ('bhhs', 'fall-2025', 'local-bank', 'First National Bank', 'png', 'First National Bank logo', 1, 'bhhs/fall-2025/first-national.png', null),

  -- SVG sponsor with inline markup
  ('bhhs', 'fall-2025', 'tech-startup', 'TechStart Inc', 'svg', 'TechStart Inc logo', 2, null,
   '<svg viewBox="0 0 100 40" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="40" fill="#007acc"/><text x="50" y="25" fill="white" text-anchor="middle" font-family="Arial">TechStart</text></svg>'),

  -- Test different layout scenarios
  ('vail', 'winter-2025', 'mountain-gear', 'Mountain Gear Co', 'jpeg', 'Mountain Gear Co logo', 0, 'vail/winter-2025/mountain-gear.jpg', null);
```

### Task 6: Add NPM Script
**Prompt**: Add an NPM script to `package.json` for easy setup execution.

**Requirements**:
Add to the `scripts` section of `package.json`:
```json
{
  "setup:sponsor-assets": "node scripts/setup-sponsor-assets.js"
}
```

## Acceptance Tests

### Test 1: Schema Validation
```sql
-- Verify table exists with correct structure
\d public.sponsor_assets;

-- Verify indexes exist
\di public.sponsor_assets*;

-- Test RLS policies
set role to 'anon';
select * from public.sponsor_assets where is_active = true; -- Should work
insert into public.sponsor_assets (organization_id, hunt_id, company_id, company_name, image_type, image_alt)
values ('test', 'test', 'test', 'Test', 'png', 'Test'); -- Should fail
```

### Test 2: Storage Bucket Validation
- [ ] Verify `sponsors` bucket exists
- [ ] Test public read access to bucket
- [ ] Test service role can upload files
- [ ] Verify bucket policies are correctly applied

### Test 3: Setup Script Validation
```bash
# Test the setup script
npm run setup:sponsor-assets

# Verify setup completed successfully
# Check console output for success messages
# Validate database schema was created
```

## Definition of Done
- [ ] SQL schema file created and tested
- [ ] RLS policies implemented and verified
- [ ] Storage bucket created with correct permissions
- [ ] Setup script created and functional
- [ ] Seed data script created
- [ ] NPM script added to package.json
- [ ] Documentation updated in setup guide
- [ ] All acceptance tests pass

## Files Created
- `scripts/sponsor-assets-schema.sql` - Database schema and RLS
- `scripts/setup-sponsor-assets.js` - Automated setup script
- `scripts/seed-sponsor-data.sql` - Test data for development
- `scripts/sponsor-assets-setup.md` - Setup documentation

## Notes
- Ensure proper error handling in setup script
- Test both successful setup and failure scenarios
- Document any manual steps required for storage bucket setup
- Consider adding rollback procedures in documentation