# US-004: Layout Configuration

## User Story
**As an organizer**, I want to configure 1x1, 1x2, or 1x3 grid layouts so that sponsor logos display appropriately for each event.

## Priority: MEDIUM
**Estimated Time**: 4 hours
**Complexity**: LOW
**Dependencies**: US-001 (Database Schema), US-002 (API)

## Acceptance Criteria
- [ ] Layout configuration stored in existing settings system
- [ ] Settings can be retrieved per organization + hunt
- [ ] Valid layout values enforced ('1x1', '1x2', '1x3')
- [ ] Default layout ('1x2') used when no configuration exists
- [ ] Feature flag implemented for easy disable/enable
- [ ] Configuration API endpoint updated (if needed)
- [ ] Admin interface consideration documented

## Implementation Prompt

### Task 1: Extend Settings System for Sponsor Layout
**Prompt**: Add sponsor layout configuration to the existing settings system, allowing organizers to specify how sponsor logos should be displayed for each hunt.

**Requirements**:
1. Investigate current settings storage mechanism
2. Add sponsor layout setting with proper validation
3. Ensure settings are retrievable by organization + hunt
4. Implement fallback to default value

**Settings Integration** (adapt based on existing system):
```sql
-- If using a settings table, add entries like this:
insert into settings (organization_id, hunt_id, key, value, description)
values
  ('bhhs', 'fall-2025', 'sponsor_layout', '1x3', 'Sponsor card grid layout: 1x1, 1x2, or 1x3'),
  ('vail', 'winter-2025', 'sponsor_layout', '1x2', 'Sponsor card grid layout: 1x1, 1x2, or 1x3');

-- Add constraint for valid values
alter table settings
add constraint check_sponsor_layout
check (key != 'sponsor_layout' or value in ('1x1', '1x2', '1x3'));
```

**Settings Service Extension** (adapt to your existing service):
```typescript
// Add to existing settings service or create new methods

interface SponsorSettings {
  layout: '1x1' | '1x2' | '1x3'
}

export class SettingsService {
  /**
   * Get sponsor configuration for an organization + hunt
   */
  static async getSponsorSettings(
    organizationId: string,
    huntId: string
  ): Promise<SponsorSettings> {
    try {
      const layout = await this.getSetting(organizationId, huntId, 'sponsor_layout')

      // Validate layout value
      if (layout && ['1x1', '1x2', '1x3'].includes(layout)) {
        return { layout: layout as '1x1' | '1x2' | '1x3' }
      }

      // Return default
      return { layout: '1x2' }
    } catch (error) {
      console.warn('[SettingsService] Failed to fetch sponsor settings:', error)
      return { layout: '1x2' }
    }
  }

  /**
   * Update sponsor layout configuration
   */
  static async updateSponsorLayout(
    organizationId: string,
    huntId: string,
    layout: '1x1' | '1x2' | '1x3'
  ): Promise<void> {
    await this.setSetting(organizationId, huntId, 'sponsor_layout', layout)
  }
}
```

### Task 2: Update sponsors-get API Function
**Prompt**: Modify the sponsors-get function to retrieve and return layout configuration from the settings system.

**Requirements**:
1. Update `netlify/functions/sponsors-get.js`
2. Call settings service to get layout configuration
3. Return layout in response
4. Handle errors gracefully with fallback to default

**API Function Update**:
```javascript
// Update the getLayoutConfiguration function in sponsors-get.js

async function getLayoutConfiguration(supabase, organizationId, huntId) {
  try {
    console.log(`[sponsors-get] Fetching layout config for ${organizationId}/${huntId}`)

    // Query settings table for sponsor layout
    const { data: setting, error } = await supabase
      .from('settings') // Adjust table name as needed
      .select('value')
      .eq('organization_id', organizationId)
      .eq('hunt_id', huntId)
      .eq('key', 'sponsor_layout')
      .single()

    if (error) {
      console.warn('[sponsors-get] Settings query failed:', error.message)
      return '1x2' // Default fallback
    }

    if (setting && setting.value) {
      const validLayouts = ['1x1', '1x2', '1x3']
      if (validLayouts.includes(setting.value)) {
        console.log(`[sponsors-get] Using configured layout: ${setting.value}`)
        return setting.value
      } else {
        console.warn(`[sponsors-get] Invalid layout value: ${setting.value}, using default`)
      }
    }

    console.log('[sponsors-get] No layout configuration found, using default: 1x2')
    return '1x2'

  } catch (error) {
    console.error('[sponsors-get] Error fetching layout config:', error)
    return '1x2' // Default fallback
  }
}
```

### Task 3: Add Feature Flag Support
**Prompt**: Implement a feature flag system to allow quick enabling/disabling of the sponsor card feature.

**Requirements**:
1. Add environment variable `VITE_ENABLE_SPONSOR_CARD`
2. Update sponsors API to respect feature flag
3. Update frontend hook to check feature flag
4. Document feature flag usage

**Feature Flag Implementation**:

**Environment Variable** (add to `.env.template`):
```bash
# Feature Flags
VITE_ENABLE_SPONSOR_CARD=true
```

**API Function Update**:
```javascript
// Add to sponsors-get.js at the beginning of handler
exports.handler = async (event, context) => {
  // Check feature flag first
  const featureEnabled = process.env.VITE_ENABLE_SPONSOR_CARD === 'true'

  if (!featureEnabled) {
    console.log('[sponsors-get] Sponsor card feature is disabled')
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ items: [] })
    }
  }

  // ... rest of existing function
}
```

**Frontend Hook Update**:
```typescript
// Update useSponsors.ts to check feature flag
export const useSponsors = (): UseSponsorsResult => {
  const [sponsors, setSponsors] = useState<SponsorsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check feature flag
  const featureEnabled = import.meta.env.VITE_ENABLE_SPONSOR_CARD === 'true'

  const { organizationId, huntId, teamName } = useAppStore()

  const request = useMemo(() => {
    if (!organizationId || !huntId || !featureEnabled) {
      return null
    }

    return { organizationId, huntId, teamName }
  }, [organizationId, huntId, teamName, featureEnabled])

  // ... rest of hook implementation
}
```

### Task 4: Create Settings Management Utility
**Prompt**: Create a utility function or admin interface consideration for managing sponsor layout settings.

**Requirements**:
1. Create utility functions for settings management
2. Document how organizers can update settings
3. Consider admin interface requirements
4. Add validation and error handling

**Settings Management Utility**:
```typescript
// src/utils/sponsorSettingsManager.ts

export class SponsorSettingsManager {
  /**
   * Update sponsor layout for an event
   * This could be called from an admin interface
   */
  static async updateLayout(
    organizationId: string,
    huntId: string,
    layout: '1x1' | '1x2' | '1x3'
  ): Promise<void> {
    try {
      const response = await fetch('/.netlify/functions/settings-set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          huntId,
          key: 'sponsor_layout',
          value: layout
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to update layout: ${response.statusText}`)
      }

      console.log(`[SponsorSettingsManager] Layout updated to ${layout} for ${organizationId}/${huntId}`)
    } catch (error) {
      console.error('[SponsorSettingsManager] Failed to update layout:', error)
      throw error
    }
  }

  /**
   * Get current sponsor layout
   */
  static async getLayout(
    organizationId: string,
    huntId: string
  ): Promise<'1x1' | '1x2' | '1x3'> {
    try {
      const response = await fetch('/.netlify/functions/settings-get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          huntId,
          key: 'sponsor_layout'
        })
      })

      if (!response.ok) {
        console.warn('[SponsorSettingsManager] Failed to get layout, using default')
        return '1x2'
      }

      const data = await response.json()
      const layout = data.value

      if (['1x1', '1x2', '1x3'].includes(layout)) {
        return layout
      }

      return '1x2'
    } catch (error) {
      console.warn('[SponsorSettingsManager] Error getting layout:', error)
      return '1x2'
    }
  }

  /**
   * Validate layout value
   */
  static isValidLayout(layout: string): layout is '1x1' | '1x2' | '1x3' {
    return ['1x1', '1x2', '1x3'].includes(layout)
  }
}
```

### Task 5: Add Configuration Documentation
**Prompt**: Create documentation explaining how to configure sponsor layouts and manage the feature.

**Requirements**:
1. Document how to set layout per event
2. Explain feature flag usage
3. Provide examples of each layout
4. Include troubleshooting guide

**Documentation** (`docs/sponsors-configuration.md`):
```markdown
# Sponsor Card Configuration

## Overview
The sponsor card feature allows displaying sponsor logos on the Active page with configurable layouts.

## Feature Flag
Control the sponsor card feature globally:

```bash
# Enable sponsor card
VITE_ENABLE_SPONSOR_CARD=true

# Disable sponsor card
VITE_ENABLE_SPONSOR_CARD=false
```

## Layout Configuration

### Available Layouts
- **1x1**: Single column, one logo per row
- **1x2**: Two columns, two logos per row (default)
- **1x3**: Three columns, three logos per row

### Setting Layout per Event

**Via Database** (requires database access):
```sql
insert into settings (organization_id, hunt_id, key, value)
values ('your-org', 'your-hunt', 'sponsor_layout', '1x3')
on conflict (organization_id, hunt_id, key)
do update set value = excluded.value;
```

**Via API** (if settings API exists):
```javascript
// Update layout programmatically
await SponsorSettingsManager.updateLayout('your-org', 'your-hunt', '1x3')
```

### Layout Guidelines

**1x1 Layout - Best for:**
- Single major sponsor
- Large detailed logos
- Mobile-first designs

**1x2 Layout - Best for:**
- 2-4 sponsors
- Balanced desktop/mobile experience
- Default choice for most events

**1x3 Layout - Best for:**
- 3+ sponsors
- Simple logos that work at smaller sizes
- Desktop-focused events

## Troubleshooting

### Sponsors Not Showing
1. Check feature flag: `VITE_ENABLE_SPONSOR_CARD=true`
2. Verify sponsor assets exist in database
3. Check browser console for errors
4. Confirm API is returning sponsor data

### Wrong Layout Displaying
1. Verify settings in database
2. Check for typos in layout value
3. Confirm API is reading settings correctly
4. Clear browser cache

### Layout Doesn't Look Right
1. Test with different numbers of sponsors
2. Check sponsor image sizes and aspect ratios
3. Test on different screen sizes
4. Consider switching to different layout

## Admin Interface Considerations

For a full admin interface, consider implementing:
- Visual layout picker
- Live preview of sponsor card
- Bulk layout updates
- Layout recommendation based on sponsor count
- A/B testing for different layouts
```

## Acceptance Tests

### Test 1: Settings Integration
- [ ] Layout setting can be stored in database
- [ ] Layout setting can be retrieved by org + hunt
- [ ] Invalid layout values are rejected
- [ ] Default layout is used when no setting exists

### Test 2: API Integration
- [ ] sponsors-get API returns correct layout from settings
- [ ] API handles missing settings gracefully
- [ ] API respects feature flag setting
- [ ] API falls back to default when settings fail

### Test 3: Feature Flag
- [ ] Feature flag disables sponsor card entirely
- [ ] Feature flag works in both frontend and backend
- [ ] Disabled feature returns empty sponsor array
- [ ] Feature can be enabled/disabled without code changes

### Test 4: Configuration Management
- [ ] Settings utility can update layouts
- [ ] Settings utility validates layout values
- [ ] Settings utility handles errors properly
- [ ] Layout changes take effect immediately

### Test 5: Different Layout Scenarios
- [ ] 1x1 layout displays correctly with 1 sponsor
- [ ] 1x2 layout displays correctly with 2-4 sponsors
- [ ] 1x3 layout displays correctly with 3+ sponsors
- [ ] Layout handles odd numbers of sponsors appropriately

## Definition of Done
- [ ] Settings system extended for sponsor layout configuration
- [ ] sponsors-get API retrieves layout from settings
- [ ] Feature flag implemented and functional
- [ ] Settings management utilities created
- [ ] Default layout (1x2) works when no configuration exists
- [ ] Layout validation prevents invalid values
- [ ] Documentation created for configuration management
- [ ] All layout options work correctly in UI
- [ ] Configuration changes take effect without restart
- [ ] Error handling works for settings failures

## Files Created/Modified
- `netlify/functions/sponsors-get.js` - Updated layout retrieval
- `src/utils/sponsorSettingsManager.ts` - Settings management utility
- `docs/sponsors-configuration.md` - Configuration documentation
- Settings table/system - Extended for sponsor layout
- `.env.template` - Added feature flag documentation

## Notes
- Consider adding admin interface for easier configuration
- Test layout changes with various sponsor counts
- Document rollout procedure for enabling feature
- Consider adding layout analytics to understand usage
- Plan for future layout options (2x2, etc.) if needed