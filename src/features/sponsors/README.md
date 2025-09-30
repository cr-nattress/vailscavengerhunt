# Sponsors Feature

## Purpose

Dynamic sponsor card display system that fetches sponsor assets from the database and renders them in configurable layouts (1x1, 1x2, 1x3). Supports both SVG (inline) and raster images (PNG/JPEG via signed URLs).

## Key Entry Points

### SponsorCard.tsx
- **Purpose**: Renders individual sponsor card with logo and company name
- **Used By**: `ActiveView.tsx`, `HistoryView.tsx`
- **Props**:
  - `sponsor`: Sponsor data object
  - `layout`: Layout mode ('1x1', '1x2', '1x3')
- **Key Features**:
  - SVG inline rendering
  - Raster image loading with fallback
  - Responsive sizing based on layout
  - Alt text for accessibility

### useSponsors.ts
- **Purpose**: Custom hook for fetching sponsor data
- **Used By**: `ActiveView.tsx`, `HistoryView.tsx`
- **Returns**: `{ sponsors, layout, isLoading, error, refetch }`
- **Key Features**:
  - SWR caching
  - Automatic revalidation
  - Error handling
  - Manual refetch

## Data Flow

### Sponsor Data Fetching Flow

```
Component mounts
    ↓
useSponsors(orgId, huntId)
    ↓
SponsorsService.getSponsors()
    ↓
apiClient.post('/api/sponsors-get', { organizationId, huntId })
    ↓
Netlify Function: sponsors-get.js
    ↓
Supabase: Query sponsor_assets table
    ↓
Filter by organization_id and hunt_id
    ↓
Join with companies table for metadata
    ↓
Generate signed URLs for raster images (Supabase Storage)
    ↓
Response: { layout: '1x2', items: [...] }
    ↓
SWR caches response
    ↓
Component renders SponsorCard for each item
```

### Layout Selection Flow

```
User opens SettingsPanel
    ↓
Selects sponsor layout (1x1, 1x2, 1x3)
    ↓
SettingsPanel.handleSave()
    ↓
appStore.saveSettingsToServer()
    ↓
ServerSettingsService.saveSettings({ config: { sponsorLayout: '1x2' } })
    ↓
apiClient.post('/api/settings/:orgId/:teamId/:huntId')
    ↓
Netlify Function: settings-set-supabase.js
    ↓
Supabase: UPDATE settings table
    ↓
Response: { success: true }
    ↓
useActiveData refetches (includes updated settings)
    ↓
SponsorCard re-renders with new layout
```

## State Management

### Server State (SWR)
- **Cache Key**: `/api/sponsors-get?orgId=${orgId}&huntId=${huntId}`
- **Revalidation**: On focus, network reconnect, manual trigger
- **TTL**: 5 minutes (configurable in SWR config)

### Global State (appStore)
- **sponsorLayout**: Stored in `settings.config.sponsorLayout`
- **Default**: '1x2' (two-column layout)

### Component State
- **SponsorCard**: No internal state (fully controlled by props)

## Sponsor Data Schema

### Database Schema (sponsor_assets table)

```sql
CREATE TABLE sponsor_assets (
  id UUID PRIMARY KEY,
  organization_id TEXT NOT NULL,
  hunt_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  company_name TEXT NOT NULL,
  alt TEXT,
  type TEXT CHECK (type IN ('svg', 'png', 'jpeg')),
  svg TEXT, -- Inline SVG content (if type = 'svg')
  storage_path TEXT, -- Supabase Storage path (if type = 'png'/'jpeg')
  display_order INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### API Response Schema

```typescript
{
  layout: '1x1' | '1x2' | '1x3',
  items: [
    {
      id: string,
      companyId: string,
      companyName: string,
      alt: string,
      type: 'svg' | 'png' | 'jpeg',
      svg?: string, // If type = 'svg'
      imageUrl?: string // If type = 'png'/'jpeg' (signed URL)
    }
  ]
}
```

## Layout Modes

### 1x1 (Single Column)
- **Grid**: 1 column
- **Card Width**: 100%
- **Use Case**: Large sponsor logos, single sponsor per hunt

### 1x2 (Two Column)
- **Grid**: 2 columns
- **Card Width**: ~50% each
- **Use Case**: Default layout, balanced visibility

### 1x3 (Three Column)
- **Grid**: 3 columns
- **Card Width**: ~33% each
- **Use Case**: Many sponsors, compact display

## Related Files

- **Services**: `/src/services/SponsorsService.ts`
- **API**: `/netlify/functions/sponsors-get.js`
- **Types**: `/src/types/sponsors.ts`
- **Database**: `/scripts/sql/sponsor-assets-schema.sql`, `/scripts/sql/seed-sponsor-data.sql`
- **Documentation**: `/docs/sponsors-configuration.md`

## Testing

- **Unit Tests**: `__tests__/SponsorCard.test.tsx`
- **Integration Tests**: `views/__tests__/ActiveView.sponsor-integration.test.tsx`
- **Test Focus**: SVG rendering, image loading, layout switching, error states

## Extension Points

### Adding a New Sponsor

1. Insert record into `sponsor_assets` table:
   ```sql
   INSERT INTO sponsor_assets (organization_id, hunt_id, company_id, company_name, type, svg)
   VALUES ('bhhs', 'fall-2025', 'acme-corp', 'Acme Corp', 'svg', '<svg>...</svg>');
   ```
2. Sponsor appears automatically (no code changes needed)

### Adding a New Layout Mode

1. Update `SponsorCard.tsx` to handle new layout (e.g., '2x2')
2. Update `SettingsPanel.tsx` to add new option
3. Update `sponsors.ts` types to include new layout
4. Update CSS grid styles for new layout

### Adding Video Sponsors

1. Update `sponsor_assets` table schema to add `video_url` column
2. Update `SponsorCard.tsx` to render `<video>` element
3. Update `sponsors-get.js` to return video URLs
4. Update `sponsors.ts` types to include `video` type

## Performance Considerations

### SVG Inline Rendering
- **Pros**: No additional HTTP requests, instant rendering
- **Cons**: Increases HTML size, no browser caching
- **Best For**: Small logos (<10KB)

### Raster Image URLs
- **Pros**: Browser caching, smaller HTML size
- **Cons**: Additional HTTP requests, loading delay
- **Best For**: Large images (>10KB)

### Signed URLs
- **Expiration**: 1 hour (configurable in `sponsors-get.js`)
- **Rationale**: Security (prevent unauthorized access to Supabase Storage)
- **Trade-off**: URLs expire, requiring refetch (acceptable for use case)

## Troubleshooting

### Sponsors Not Displaying
- **Cause**: No records in `sponsor_assets` table for this org/hunt
- **Fix**: Run `npm run seed:sponsor-data` or insert records manually

### SVG Not Rendering
- **Cause**: Invalid SVG markup or XSS sanitization
- **Fix**: Validate SVG with online tool, ensure no `<script>` tags

### Images Not Loading
- **Cause**: Signed URL expired or Supabase Storage misconfigured
- **Fix**: Check Supabase Storage bucket permissions, regenerate signed URLs

### Layout Not Changing
- **Cause**: Settings not saving or cache not invalidating
- **Fix**: Check `/api/settings` response, manually clear SWR cache

## Notes

- **Sponsor order** is determined by `display_order` column (ascending)
- **Inactive sponsors** (`is_active = false`) are filtered out server-side
- **Layout preference** is per-team (stored in `settings` table)
- **SVG sanitization** is handled by React (dangerouslySetInnerHTML with caution)
- **Alt text** is required for accessibility (WCAG 2.1 compliance)
