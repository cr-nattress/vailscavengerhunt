-- Seed data for sponsor assets testing
-- Creates sample sponsors for development and testing

-- Clear any existing test data (optional, comment out to preserve data)
-- delete from public.sponsor_assets where organization_id in ('bhhs', 'vail', 'test-org');

-- Sample sponsors for BHHS Fall 2025 event
insert into public.sponsor_assets
  (organization_id, hunt_id, company_id, company_name, image_type, image_alt, order_index, storage_path, svg_text, is_active)
values
  -- PNG sponsors (would be uploaded to storage)
  ('bhhs', 'fall-2025', 'chalk-digital', 'CHALK Digital', 'png', 'CHALK Digital marketing agency logo', 0, 'bhhs/fall-2025/chalk-digital.png', null, true),
  ('bhhs', 'fall-2025', 'first-national', 'First National Bank', 'png', 'First National Bank logo', 1, 'bhhs/fall-2025/first-national-bank.png', null, true),
  ('bhhs', 'fall-2025', 'mountain-gear', 'Mountain Gear Co', 'jpeg', 'Mountain Gear Co outdoor equipment logo', 2, 'bhhs/fall-2025/mountain-gear-co.jpg', null, true),

  -- SVG sponsors (inline markup)
  ('bhhs', 'fall-2025', 'tech-startup', 'TechStart Inc', 'svg', 'TechStart Inc technology company logo', 3, null,
   '<svg viewBox="0 0 120 50" xmlns="http://www.w3.org/2000/svg">
     <rect width="120" height="50" fill="#007acc" rx="4"/>
     <text x="60" y="30" fill="white" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="bold">TechStart</text>
   </svg>', true),

  ('bhhs', 'fall-2025', 'local-coffee', 'Local Coffee Shop', 'svg', 'Local Coffee Shop logo with coffee cup', 4, null,
   '<svg viewBox="0 0 100 40" xmlns="http://www.w3.org/2000/svg">
     <rect width="100" height="40" fill="#8B4513" rx="3"/>
     <circle cx="20" cy="20" r="8" fill="#D2691E"/>
     <text x="50" y="25" fill="white" text-anchor="middle" font-family="Arial, sans-serif" font-size="10">Coffee Shop</text>
   </svg>', true);

-- Sample sponsors for Vail Winter 2025 event (different layout test)
insert into public.sponsor_assets
  (organization_id, hunt_id, company_id, company_name, image_type, image_alt, order_index, storage_path, svg_text, is_active)
values
  ('vail', 'winter-2025', 'ski-resort', 'Vail Ski Resort', 'png', 'Vail Ski Resort official logo', 0, 'vail/winter-2025/vail-ski-resort.png', null, true),
  ('vail', 'winter-2025', 'winter-sports', 'Alpine Sports', 'svg', 'Alpine Sports equipment rental logo', 1, null,
   '<svg viewBox="0 0 110 45" xmlns="http://www.w3.org/2000/svg">
     <rect width="110" height="45" fill="#2E8B57" rx="5"/>
     <polygon points="20,15 25,25 15,25" fill="white"/>
     <text x="55" y="28" fill="white" text-anchor="middle" font-family="Arial, sans-serif" font-size="12">Alpine Sports</text>
   </svg>', true),
  ('vail', 'winter-2025', 'hotel-chain', 'Mountain View Lodge', 'jpeg', 'Mountain View Lodge hotel logo', 2, 'vail/winter-2025/mountain-view-lodge.jpg', null, true);

-- Test organization with single sponsor (1x1 layout test)
insert into public.sponsor_assets
  (organization_id, hunt_id, company_id, company_name, image_type, image_alt, order_index, storage_path, svg_text, is_active)
values
  ('test-org', 'single-sponsor', 'major-sponsor', 'Major Event Sponsor', 'svg', 'Major Event Sponsor premium logo', 0, null,
   '<svg viewBox="0 0 150 60" xmlns="http://www.w3.org/2000/svg">
     <rect width="150" height="60" fill="#4A90E2" rx="6"/>
     <rect x="10" y="10" width="130" height="40" fill="none" stroke="white" stroke-width="2" rx="3"/>
     <text x="75" y="35" fill="white" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="bold">MAJOR SPONSOR</text>
   </svg>', true);

-- Test organization with no sponsors (empty state test)
-- (No entries for 'test-org', 'no-sponsors' - this tests empty response)

-- Inactive sponsor (should not appear in results)
insert into public.sponsor_assets
  (organization_id, hunt_id, company_id, company_name, image_type, image_alt, order_index, storage_path, svg_text, is_active)
values
  ('bhhs', 'fall-2025', 'inactive-sponsor', 'Inactive Sponsor', 'svg', 'Inactive sponsor logo', 999, null,
   '<svg viewBox="0 0 80 30"><rect width="80" height="30" fill="gray"/><text x="40" y="20" fill="white" text-anchor="middle" font-size="10">Inactive</text></svg>', false);

-- Display summary
select
  organization_id,
  hunt_id,
  count(*) as sponsor_count,
  count(*) filter (where is_active = true) as active_count,
  count(*) filter (where image_type = 'svg') as svg_count,
  count(*) filter (where image_type != 'svg') as image_count
from public.sponsor_assets
group by organization_id, hunt_id
order by organization_id, hunt_id;

-- Verify data insertion
\echo 'Sponsor Assets Seed Data Summary:'
\echo '================================'
select
  concat(organization_id, '/', hunt_id) as event,
  company_name,
  image_type,
  order_index,
  is_active,
  case
    when storage_path is not null then 'Stored Image'
    when svg_text is not null then 'Inline SVG'
    else 'No Content'
  end as content_type
from public.sponsor_assets
order by organization_id, hunt_id, order_index;