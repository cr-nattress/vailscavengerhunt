# Epic: Sponsor Card on Active Page

## Overview
Add a new Sponsor Card component to the Active page that appears directly below the app header and immediately above the Progress card. The Sponsor Card displays sponsor logos/images in one of three CSS Grid layouts selected by configuration:

- 1 row / 1 column
- 1 row / 2 columns
- 1 row / 3 columns

If there are no sponsor images configured for the current organization + hunt, the Sponsor Card must not render at all, and the page layout should be identical to current behavior.

The page to update is `src/features/views/ActiveView.tsx`. Spacing must match existing cards on this page:

- Outer container on page: `div.max-w-screen-sm.mx-auto.px-4.py-3`
- Card container (match this styling): `border rounded-lg shadow-sm px-4 py-3` with colors `var(--color-white)` background and border `var(--color-light-grey)`.

## Goals
- Present sponsors prominently without pushing content too far down the page.
- Make layout flexible and maintain visual harmony with other cards.
- Fetch sponsor assets per organization/hunt from Supabase.
- Do not render Sponsor Card when dataset is empty.

---

## User Stories

1. As an attendee, I see a Sponsor Card with logos at the top of the Active page so I know who sponsored the event.
2. As an organizer, I can configure 1/1, 1/2, or 1/3 grid layouts so logos fit nicely for each event.
3. As an organizer, I can upload SVG/PNG/JPEG files for sponsors and order them.
4. As a developer, I need the Sponsor Card to inherit the page’s existing card spacing and colors for consistency.
5. As a developer, I need the Sponsor Card to be fully hidden when there are no sponsor images for the current organization + hunt.

---

## Acceptance Criteria

- The Sponsor Card renders on `ActiveView` directly above the Progress card.
- The Sponsor Card uses classes consistent with other cards: `border rounded-lg shadow-sm px-4 py-3`, background `var(--color-white)`, border `var(--color-light-grey)`.
- Layout options supported via config/prop:
  - `grid-cols-1` (1 column)
  - `grid-cols-2` (2 columns)
  - `grid-cols-3` (3 columns)
- Use CSS Grid with a consistent gap matching the design: `gap-3`.
- Images fit their grid cell, preserve aspect ratio, and do not stretch. Use `object-contain`, fixed max height (e.g., `h-12 md:h-14`), and balanced horizontal padding.
- If no sponsor assets exist for the current `organizationId + huntId` (and optional `teamName` if needed), the Sponsor Card is not rendered at all.
- Card spacing vertically matches current content: same margin stack as other cards on the page (the progress card currently sits right below; the Sponsor Card should have `mt-0` for the top-most card and use `mt-3` spacing to the next content where appropriate).
- The card must be accessible (images include `alt` text from metadata; logos are announced once; card has `aria-label="Sponsors"`).

---

## Information Architecture

Keys available in `ActiveView` via `useAppStore()`:
- `organizationId`, `teamName`, `huntId`, `eventName`.

Use those to query Supabase for sponsor assets.

---

## Supabase Schema

Create a table `sponsor_assets` and a storage bucket `sponsors`.

### Table: sponsor_assets

Columns:
- `id uuid primary key default uuid_generate_v4()`
- `organization_id text not null`
- `hunt_id text not null`
- `company_id text not null` — stable slug for company/organization
- `company_name text not null`
- `image_type text not null check (image_type in ('svg','png','jpeg','jpg'))`
- `image_alt text not null`
- `order_index int not null default 0`
- `is_active boolean not null default true`
- `storage_path text` — path inside `sponsors` bucket (PNG/JPEG)
- `svg_text text` — raw inline SVG markup when `image_type='svg'` (optional alternative to storage)
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Indexes:
- `idx_sponsor_assets_org_hunt` on `(organization_id, hunt_id, is_active, order_index)`
- Optional: `idx_sponsor_assets_company` on `(company_id)`

Recommended Row-Level Security (RLS):
- Enable RLS and define a read-only policy for anonymous selects filtered by `(organization_id, hunt_id, is_active=true)` if the app reads anonymously; otherwise use service role key in Netlify Functions.

Example SQL (Postgres):
```sql
create extension if not exists "uuid-ossp";

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

create index if not exists idx_sponsor_assets_org_hunt
  on public.sponsor_assets (organization_id, hunt_id, is_active, order_index);
```

Storage bucket (CLI or dashboard): `sponsors`.

Seed example:
```sql
insert into public.sponsor_assets
  (organization_id, hunt_id, company_id, company_name, image_type, image_alt, order_index, storage_path)
values
  ('bhhs','fall-2025','chalk','CHALK Digital','png','CHALK Digital logo', 0, 'bhhs/fall-2025/chalk.png'),
  ('bhhs','fall-2025','maxa','MAXA','svg','MAXA logo', 1, null);
```

---

## Data Access Contract

- Endpoint: `/.netlify/functions/sponsors-get` (new)
- Request: derives `organizationId`, `huntId` from app state. Optionally `teamName` for future targeting.
- Response JSON shape:
```ts
{
  layout: '1x1' | '1x2' | '1x3',
  items: Array<{
    id: string
    companyId: string
    companyName: string
    alt: string
    type: 'svg' | 'png' | 'jpeg' | 'jpg'
    src: string | null        // signed URL when png/jpeg
    svg: string | null        // inline markup when svg
  }>
}
```
- Layout may come from a `settings` source; if missing, default to `1x2`.
- If `items.length === 0`, return `{ items: [] }` and the UI must not render the card.

---

## CSS Grid Specification

- Wrapper: same card container as Progress card.
- Grid container classes: `grid gap-3` + one of `grid-cols-1 | grid-cols-2 | grid-cols-3` derived from `layout`.
- Each cell: center content both axes using `flex items-center justify-center`.
- Image element:
  - For raster: `class="h-12 md:h-14 object-contain"`
  - For SVG string: inject into `div` using `dangerouslySetInnerHTML` with container `class="h-12 md:h-14"` and CSS to scale to fit.
- Respect reduced motion; no animations are required for MVP.

---

## Tasks

### 1) Backend: Supabase/Netlify Function
- Create SQL migration file under `scripts/` to create `sponsor_assets` table and indexes.
- Create storage bucket `sponsors`.
- Add `netlify/functions/sponsors-get.ts`:
  - Query Supabase for active assets matching `organizationId` + `huntId` ordered by `order_index`.
  - For PNG/JPEG rows with `storage_path`, generate a signed URL (short TTL, e.g., 1 hour) and return as `src`.
  - For SVG rows with `svg_text`, return `svg` string.
  - Return `{ items: [] }` when none.
- Environment:
  - Reuse existing Supabase URL/anon/service role vars used by progress functions.

### 2) Frontend: Component and Integration
- Create `src/features/sponsors/SponsorCard.tsx` component:
  - Props: `{ items, layout }`.
  - Card wrapper styles identical to Progress card: `border rounded-lg shadow-sm px-4 py-3`, colors as above.
  - Render nothing if `items.length === 0`.
- Add hook `src/features/sponsors/useSponsors.ts` to fetch from `/.netlify/functions/sponsors-get` using `organizationId`, `huntId` from `useAppStore()`.
- Update `src/features/views/ActiveView.tsx`:
  - Import and render `<SponsorCard />` inside the page container `div.max-w-screen-sm.mx-auto.px-4.py-3`.
  - Place it before the existing progress card block at lines ~187-225.
  - Ensure vertical spacing is visually consistent; use `mt-0` for SponsorCard and add `mt-3` on the progress card when SponsorCard is present.

### 3) Styling and Accessibility
- Provide alt text from `image_alt`.
- Ensure color contrast for any background behind logos is adequate.
- Add `aria-label="Sponsors"` to card container.

### 4) Configuration
- Layout source:
  - Option A: From a new row in existing settings service keyed by `organizationId + huntId` (recommended).
  - Option B: Fallback to default `1x2` if not set.
- Add feature flag `VITE_ENABLE_SPONSOR_CARD=true` to allow quick disable.

### 5) QA & Testing
- Unit tests for `SponsorCard` rendering combinations (1/1, 1/2, 1/3) and empty state (no render).
- Integration test that verifies the card hides when API returns empty list.
- Visual check on small phones and mid-sized screens.

### 6) Documentation
- Update `README` or a new `docs/sponsors.md` describing how to upload assets and set order.

---

## Rollout Plan
- Deploy backend function and table migration.
- Seed 1–3 sponsor assets for a test hunt.
- Enable feature flag in staging; validate empty-state behavior.
- Enable in production per event.

---

## Risks & Mitigations
- Too-tall logos can crowd the header area → enforce `h-12 md:h-14` and `object-contain`.
- Network latency for signed URLs → small images and caching headers where appropriate.
- SVG injection risks → sanitize known-safe inline SVGs (limit to logo paths; no scripts/styles), or prefer storage URLs.

---

## Definition of Done
- New Supabase table and bucket exist with RLS policies.
- `sponsors-get` function returns expected shape.
- `ActiveView` shows Sponsor Card above Progress card when assets exist; otherwise no card shows and layout is unchanged.
- Layout options (1/1, 1/2, 1/3) render correctly and responsively.
- Tests pass and lint is clean.
