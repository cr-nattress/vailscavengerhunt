# Sponsor Card Configuration

## Overview
The sponsor card feature allows displaying sponsor logos on the Active page with configurable layouts per event.

## Feature Control

### Global Feature Flag
Control the sponsor card feature globally via environment variable:

```bash
# Enable sponsor card feature
VITE_ENABLE_SPONSOR_CARD=true

# Disable sponsor card feature (default)
VITE_ENABLE_SPONSOR_CARD=false
```

### Per-Event Feature Control
Individual events can enable/disable the sponsor card via settings:

```sql
-- Enable for specific event
INSERT INTO settings (organization_id, hunt_id, key, value)
VALUES ('your-org', 'your-hunt', 'sponsor_card_enabled', 'true');

-- Disable for specific event
INSERT INTO settings (organization_id, hunt_id, key, value)
VALUES ('your-org', 'your-hunt', 'sponsor_card_enabled', 'false');
```

## Layout Configuration

### Available Layouts

#### 1x1 Layout - Single Column
- **Best for**: Single major sponsor, large detailed logos, mobile-first designs
- **Usage**: `'1x1'`
- **Visual**: One logo per row, full width

#### 1x2 Layout - Two Columns (Default)
- **Best for**: 2-4 sponsors, balanced desktop/mobile experience
- **Usage**: `'1x2'`
- **Visual**: Two logos per row, good balance

#### 1x3 Layout - Three Columns
- **Best for**: 3+ sponsors, simple logos that work at smaller sizes
- **Usage**: `'1x3'`
- **Visual**: Three logos per row, compact layout

### Setting Layout per Event

#### Via Database (Direct SQL)
```sql
-- Set layout for specific event
INSERT INTO settings (organization_id, hunt_id, key, value, description)
VALUES ('your-org', 'your-hunt', 'sponsor_layout', '1x3', 'Sponsor card grid layout: 1x1, 1x2, or 1x3')
ON CONFLICT (organization_id, hunt_id, key)
DO UPDATE SET value = EXCLUDED.value, updated_at = now();
```

#### Via JavaScript/TypeScript
```typescript
import { SponsorSettingsManager } from '../utils/sponsorSettingsManager'

// Update layout programmatically
await SponsorSettingsManager.updateLayout('your-org', 'your-hunt', '1x3')

// Get current layout
const layout = await SponsorSettingsManager.getLayout('your-org', 'your-hunt')
```

#### Via SQL Script (Batch Updates)
```typescript
const sql = SponsorSettingsManager.generateSetLayoutSQL('your-org', 'your-hunt', '1x2')
// Execute the returned SQL in your database
```

## Layout Guidelines

### Layout Selection Guide

| Sponsor Count | Recommended Layout | Reasoning |
|---------------|-------------------|-----------|
| 1 | 1x1 | Single sponsor gets full attention |
| 2-4 | 1x2 | Balanced appearance, works well on all devices |
| 5+ | 1x3 | Efficient use of space for many sponsors |

### Content Considerations

**For 1x1 Layout:**
- Works well with detailed logos
- Good for sponsors with text-heavy branding
- Ideal for primary/title sponsors

**For 1x2 Layout:**
- Most versatile option
- Good balance between visibility and space efficiency
- Works well on both desktop and mobile

**For 1x3 Layout:**
- Best for simple, iconic logos
- Logos should work well at smaller sizes
- Consider mobile experience (may be cramped)

## Automatic Layout Recommendations

The system can automatically recommend layouts based on sponsor count:

```typescript
import { SponsorSettingsManager } from '../utils/sponsorSettingsManager'

const recommendedLayout = SponsorSettingsManager.recommendLayout(sponsorCount)
// Returns: '1x1' for 1 sponsor, '1x2' for 2-4 sponsors, '1x3' for 5+ sponsors
```

## Configuration Management

### Using the Settings Manager

```typescript
import { SponsorSettingsManager } from '../utils/sponsorSettingsManager'

// Check if feature is enabled
if (SponsorSettingsManager.isFeatureEnabled()) {
  // Feature is available
}

// Get layout options with descriptions
const options = SponsorSettingsManager.getLayoutOptions()
/*
Returns:
[
  { value: '1x1', label: 'Single Column (1x1)', description: '...' },
  { value: '1x2', label: 'Two Columns (1x2)', description: '...' },
  { value: '1x3', label: 'Three Columns (1x3)', description: '...' }
]
*/

// Validate layout value
if (SponsorSettingsManager.isValidLayout(userInput)) {
  // Valid layout
}

// Batch update multiple events
await SponsorSettingsManager.batchUpdateLayouts([
  { organizationId: 'org1', huntId: 'hunt1', layout: '1x2' },
  { organizationId: 'org1', huntId: 'hunt2', layout: '1x3' },
])
```

## Database Schema

### Settings Table Requirements
The sponsor configuration system expects a `settings` table with this structure:

```sql
CREATE TABLE IF NOT EXISTS public.settings (
  id uuid primary key default uuid_generate_v4(),
  organization_id text not null,
  hunt_id text not null,
  key text not null,
  value text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  UNIQUE(organization_id, hunt_id, key)
);
```

### Settings Keys Used
- `sponsor_layout`: Layout configuration ('1x1', '1x2', '1x3')
- `sponsor_card_enabled`: Per-event feature flag ('true', 'false')
- `sponsor_card_position`: Future enhancement for positioning

### Configuration View
A helpful database view shows all sponsor configurations:

```sql
SELECT * FROM public.sponsor_configuration;
```

This view shows:
- Organization and hunt IDs
- Total and active sponsor counts
- Current layout setting
- Feature enabled status
- Overall status (Active, Disabled, No sponsors)

## Troubleshooting

### Sponsors Not Showing

1. **Check global feature flag**:
   ```bash
   echo $VITE_ENABLE_SPONSOR_CARD
   # Should be 'true'
   ```

2. **Check per-event setting**:
   ```sql
   SELECT value FROM settings
   WHERE organization_id = 'your-org'
     AND hunt_id = 'your-hunt'
     AND key = 'sponsor_card_enabled';
   ```

3. **Verify sponsor assets exist**:
   ```sql
   SELECT count(*) FROM sponsor_assets
   WHERE organization_id = 'your-org'
     AND hunt_id = 'your-hunt'
     AND is_active = true;
   ```

4. **Check browser console** for API errors

### Wrong Layout Displaying

1. **Verify settings in database**:
   ```sql
   SELECT value FROM settings
   WHERE organization_id = 'your-org'
     AND hunt_id = 'your-hunt'
     AND key = 'sponsor_layout';
   ```

2. **Check for typos** in layout value (must be exactly '1x1', '1x2', or '1x3')

3. **Clear browser cache** and sponsor service cache:
   ```typescript
   SponsorsService.clearCache()
   ```

4. **Test API directly**:
   ```bash
   curl -X POST http://localhost:8888/.netlify/functions/sponsors-get \
     -H 'Content-Type: application/json' \
     -d '{"organizationId":"your-org","huntId":"your-hunt"}'
   ```

### Layout Doesn't Look Right

1. **Test with different numbers of sponsors**
2. **Check sponsor image sizes and aspect ratios**
3. **Test on different screen sizes**
4. **Consider switching to different layout**:
   - 1x3 may be too cramped on mobile
   - 1x1 may waste space with small logos
   - 1x2 is usually the safest choice

## Admin Interface Considerations

For a full admin interface, consider implementing:

### Layout Management UI
- Visual layout picker with previews
- Live preview of sponsor card
- Sponsor count-based recommendations
- Bulk layout updates for multiple events

### Advanced Features
- A/B testing for different layouts
- Analytics for sponsor impression rates
- Automatic layout optimization based on performance
- Seasonal or event-specific layout themes

### API Endpoints Needed
- `GET /api/admin/sponsor-settings` - List all configurations
- `POST /api/admin/sponsor-settings` - Update configurations
- `GET /api/admin/sponsor-preview` - Preview layout with current sponsors
- `POST /api/admin/sponsor-recommendations` - Get layout recommendations

## Best Practices

### Implementation
1. **Always set layout explicitly** rather than relying on defaults
2. **Test layouts with real sponsor images** before going live
3. **Consider mobile experience** when choosing 1x3 layout
4. **Use feature flags** for gradual rollout
5. **Monitor performance** with many sponsors

### Content Management
1. **Optimize sponsor images** for web (< 100KB recommended)
2. **Use consistent aspect ratios** within each event
3. **Provide alt text** for accessibility
4. **Test SVG content** in target browsers
5. **Have fallback plans** for image loading failures

### Maintenance
1. **Regular audits** of sponsor configurations
2. **Performance monitoring** on pages with many sponsors
3. **Cache management** when sponsors change
4. **Security reviews** of SVG content
5. **Accessibility testing** with screen readers

---

This configuration system provides flexible, powerful sponsor display options while maintaining ease of use and strong defaults.