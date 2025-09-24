-- Sponsor Assets Schema for Supabase
-- Creates table and storage for sponsor logos/images
-- Compatible with existing multi-tenant architecture

-- Enable UUID extension if not already enabled
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

create index if not exists idx_sponsor_assets_active
  on public.sponsor_assets (is_active) where is_active = true;

-- Create updated_at trigger function if it doesn't exist
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger for updated_at
drop trigger if exists update_sponsor_assets_updated_at on public.sponsor_assets;
create trigger update_sponsor_assets_updated_at
  before update on public.sponsor_assets
  for each row
  execute function update_updated_at_column();

-- Enable Row Level Security
alter table public.sponsor_assets enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Public read access to active sponsors" on public.sponsor_assets;
drop policy if exists "Service role full access" on public.sponsor_assets;

-- Policy: Allow public read access to active sponsors only
create policy "Public read access to active sponsors"
  on public.sponsor_assets
  for select
  to public
  using (is_active = true);

-- Policy: Allow service role full access for management operations
create policy "Service role full access"
  on public.sponsor_assets
  to service_role
  using (true)
  with check (true);

-- Add helpful comments
comment on table public.sponsor_assets is 'Sponsor assets for hunt events with flexible image storage';
comment on column public.sponsor_assets.organization_id is 'Organization identifier for multi-tenant isolation';
comment on column public.sponsor_assets.hunt_id is 'Hunt/event identifier';
comment on column public.sponsor_assets.company_id is 'Stable company slug for consistent identification';
comment on column public.sponsor_assets.image_type is 'Image format: svg (inline), png, jpeg, jpg (stored)';
comment on column public.sponsor_assets.storage_path is 'Path in sponsors bucket for stored images (png/jpeg/jpg)';
comment on column public.sponsor_assets.svg_text is 'Inline SVG markup for svg image_type';
comment on column public.sponsor_assets.order_index is 'Display order within hunt (ascending)';

-- Storage bucket policies (to be applied manually in Supabase dashboard)
-- These need to be created in the Supabase dashboard or via CLI
/*
Storage Bucket: sponsors
- Public: true
- File size limit: 5MB
- Allowed MIME types: image/png, image/jpeg, image/jpg, image/svg+xml

Policies to create:
1. "Public read access"
   - Operation: SELECT
   - Target: public
   - Definition: bucket_id = 'sponsors'

2. "Service role upload access"
   - Operation: INSERT, UPDATE, DELETE
   - Target: service_role
   - Definition: bucket_id = 'sponsors'
*/