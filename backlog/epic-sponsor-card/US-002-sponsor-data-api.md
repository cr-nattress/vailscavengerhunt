# US-002: Sponsor Data API

## User Story
**As a developer**, I need a Netlify function to retrieve sponsor assets so that the frontend can display sponsor information.

## Priority: HIGH
**Estimated Time**: 6 hours
**Complexity**: MEDIUM
**Dependencies**: US-001 (Database Schema Setup)

## Acceptance Criteria
- [ ] `sponsors-get` Netlify function created
- [ ] Function queries Supabase for sponsor assets by organization + hunt
- [ ] Function generates signed URLs for stored images
- [ ] Function returns sponsor data in specified JSON format
- [ ] Function handles empty results gracefully
- [ ] Function includes proper error handling and logging
- [ ] Function respects layout configuration from settings

## Implementation Prompt

### Task 1: Create Sponsors API Function
**Prompt**: Create a Netlify function that retrieves sponsor assets from Supabase and returns them in the format expected by the frontend component.

**Requirements**:
1. Create `netlify/functions/sponsors-get.js`
2. Query Supabase `sponsor_assets` table for active sponsors
3. Generate signed URLs for images stored in the `sponsors` bucket
4. Return data in the specified JSON contract format
5. Handle layout configuration retrieval
6. Include comprehensive error handling

**Function Implementation**:
```javascript
const { createClient } = require('@supabase/supabase-js')

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request parameters
    const { organizationId, huntId, teamName } = JSON.parse(event.body || '{}')

    if (!organizationId || !huntId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required parameters: organizationId, huntId'
        })
      }
    }

    console.log(`[sponsors-get] Fetching sponsors for org:${organizationId}, hunt:${huntId}`)

    // Query sponsor assets
    const { data: sponsors, error } = await supabase
      .from('sponsor_assets')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('hunt_id', huntId)
      .eq('is_active', true)
      .order('order_index')

    if (error) {
      console.error('[sponsors-get] Database error:', error)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database query failed' })
      }
    }

    // Handle empty results
    if (!sponsors || sponsors.length === 0) {
      console.log('[sponsors-get] No sponsors found, returning empty array')
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ items: [] })
      }
    }

    // Process sponsor data and generate signed URLs
    const processedSponsors = await Promise.all(
      sponsors.map(async (sponsor) => {
        let src = null
        let svg = null

        if (sponsor.image_type === 'svg' && sponsor.svg_text) {
          // Use inline SVG
          svg = sponsor.svg_text
        } else if (sponsor.storage_path) {
          // Generate signed URL for stored images
          const { data: signedUrl, error: urlError } = await supabase.storage
            .from('sponsors')
            .createSignedUrl(sponsor.storage_path, 3600) // 1 hour TTL

          if (urlError) {
            console.warn(`[sponsors-get] Failed to generate signed URL for ${sponsor.storage_path}:`, urlError)
          } else {
            src = signedUrl.signedUrl
          }
        }

        return {
          id: sponsor.id,
          companyId: sponsor.company_id,
          companyName: sponsor.company_name,
          alt: sponsor.image_alt,
          type: sponsor.image_type,
          src,
          svg
        }
      })
    )

    // Get layout configuration (implement this based on your settings system)
    const layout = await getLayoutConfiguration(supabase, organizationId, huntId)

    const response = {
      layout: layout || '1x2', // Default to 1x2 if not configured
      items: processedSponsors
    }

    console.log(`[sponsors-get] Returning ${processedSponsors.length} sponsors with ${layout} layout`)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    }

  } catch (error) {
    console.error('[sponsors-get] Function error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    }
  }
}

// Helper function to get layout configuration
async function getLayoutConfiguration(supabase, organizationId, huntId) {
  try {
    // Query your existing settings system for sponsor layout config
    // This will depend on how your current settings are structured
    // Example implementation:
    const { data: settings } = await supabase
      .from('settings') // or whatever your settings table is called
      .select('value')
      .eq('organization_id', organizationId)
      .eq('hunt_id', huntId)
      .eq('key', 'sponsor_layout')
      .single()

    if (settings && settings.value) {
      const validLayouts = ['1x1', '1x2', '1x3']
      return validLayouts.includes(settings.value) ? settings.value : '1x2'
    }
  } catch (error) {
    console.warn('[sponsors-get] Failed to fetch layout config:', error)
  }

  return '1x2' // Default layout
}
```

### Task 2: Add Request/Response Type Definitions
**Prompt**: Create TypeScript type definitions for the sponsors API to ensure type safety and documentation.

**Requirements**:
1. Create `src/types/sponsors.ts` with request and response types
2. Document the API contract clearly
3. Export types for use in frontend components

**Type Definitions**:
```typescript
// src/types/sponsors.ts

export interface SponsorAsset {
  id: string
  companyId: string
  companyName: string
  alt: string
  type: 'svg' | 'png' | 'jpeg' | 'jpg'
  src: string | null        // signed URL for stored images
  svg: string | null        // inline SVG markup
}

export interface SponsorsResponse {
  layout: '1x1' | '1x2' | '1x3'
  items: SponsorAsset[]
}

export interface SponsorsRequest {
  organizationId: string
  huntId: string
  teamName?: string // Optional for future team-specific targeting
}

// Database types
export interface SponsorAssetRow {
  id: string
  organization_id: string
  hunt_id: string
  company_id: string
  company_name: string
  image_type: 'svg' | 'png' | 'jpeg' | 'jpg'
  image_alt: string
  order_index: number
  is_active: boolean
  storage_path: string | null
  svg_text: string | null
  created_at: string
  updated_at: string
}
```

### Task 3: Create API Client Service
**Prompt**: Create a client-side service to interact with the sponsors API, following the existing patterns in the codebase.

**Requirements**:
1. Create `src/services/SponsorsService.ts`
2. Follow existing service patterns in the codebase
3. Include proper error handling and logging
4. Cache responses appropriately

**Service Implementation**:
```typescript
// src/services/SponsorsService.ts

import { SponsorsRequest, SponsorsResponse } from '../types/sponsors'

export class SponsorsService {
  private static cache = new Map<string, { data: SponsorsResponse; timestamp: number }>()
  private static readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  /**
   * Fetch sponsor assets for a given organization and hunt
   */
  static async getSponsors(request: SponsorsRequest): Promise<SponsorsResponse> {
    const cacheKey = `${request.organizationId}-${request.huntId}`

    // Check cache first
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log('[SponsorsService] Returning cached sponsor data')
      return cached.data
    }

    try {
      console.log('[SponsorsService] Fetching sponsors from API', request)

      const response = await fetch('/.netlify/functions/sponsors-get', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }

      const data: SponsorsResponse = await response.json()

      // Validate response structure
      if (!data.items || !Array.isArray(data.items)) {
        throw new Error('Invalid response format: missing items array')
      }

      // Cache the response
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      })

      console.log(`[SponsorsService] Fetched ${data.items.length} sponsors with ${data.layout} layout`)
      return data

    } catch (error) {
      console.error('[SponsorsService] Failed to fetch sponsors:', error)

      // Return empty response on error to prevent UI breakage
      return {
        layout: '1x2',
        items: []
      }
    }
  }

  /**
   * Clear the sponsors cache (useful for testing or manual refresh)
   */
  static clearCache(): void {
    this.cache.clear()
    console.log('[SponsorsService] Cache cleared')
  }

  /**
   * Check if sponsors exist for the given org/hunt without making API call
   */
  static hasCachedSponsors(organizationId: string, huntId: string): boolean {
    const cacheKey = `${organizationId}-${huntId}`
    const cached = this.cache.get(cacheKey)
    return !!(cached && cached.data.items.length > 0)
  }
}
```

### Task 4: Add Environment Configuration
**Prompt**: Ensure all necessary environment variables are documented and the function can access Supabase configuration.

**Requirements**:
1. Document required environment variables
2. Add any missing variables to `.env.template` if needed
3. Verify function can access existing Supabase config

**Environment Variables** (document in function comments):
```bash
# Required for sponsors-get function
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional: Enable feature flag
VITE_ENABLE_SPONSOR_CARD=true
```

### Task 5: Add Function Testing
**Prompt**: Create tests for the sponsors API function to ensure it works correctly across different scenarios.

**Requirements**:
1. Create `netlify/functions/sponsors-get.test.js`
2. Test successful sponsor retrieval
3. Test empty results
4. Test error scenarios
5. Test signed URL generation

**Test Implementation**:
```javascript
// netlify/functions/sponsors-get.test.js

const { handler } = require('./sponsors-get')

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          }))
        }))
      }))
    })),
    storage: {
      from: jest.fn(() => ({
        createSignedUrl: jest.fn(() => Promise.resolve({
          data: { signedUrl: 'https://example.com/signed-url' },
          error: null
        }))
      }))
    }
  }))
}))

describe('sponsors-get function', () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
  })

  test('returns empty array when no sponsors found', async () => {
    const event = {
      httpMethod: 'POST',
      body: JSON.stringify({
        organizationId: 'test-org',
        huntId: 'test-hunt'
      })
    }

    const result = await handler(event, {})
    const body = JSON.parse(result.body)

    expect(result.statusCode).toBe(200)
    expect(body.items).toEqual([])
  })

  test('returns 400 for missing parameters', async () => {
    const event = {
      httpMethod: 'POST',
      body: JSON.stringify({})
    }

    const result = await handler(event, {})
    expect(result.statusCode).toBe(400)
  })

  test('handles OPTIONS request for CORS', async () => {
    const event = { httpMethod: 'OPTIONS' }
    const result = await handler(event, {})

    expect(result.statusCode).toBe(200)
    expect(result.headers['Access-Control-Allow-Origin']).toBe('*')
  })
})
```

## Acceptance Tests

### Test 1: API Function Integration
```bash
# Test API function locally
curl -X POST "http://localhost:8888/.netlify/functions/sponsors-get" \
  -H "Content-Type: application/json" \
  -d '{"organizationId": "test", "huntId": "test"}'

# Expected: 200 response with { "items": [] } when no sponsors
# Expected: 200 response with sponsors array when data exists
```

### Test 2: Signed URL Generation
- [ ] Verify signed URLs are generated for stored images
- [ ] Confirm signed URLs have appropriate expiration (1 hour)
- [ ] Test that SVG inline content is returned correctly
- [ ] Validate URLs are accessible and return expected images

### Test 3: Error Handling
- [ ] Test missing environment variables
- [ ] Test invalid organizationId/huntId
- [ ] Test Supabase connection failures
- [ ] Test malformed request bodies
- [ ] Verify error responses have proper status codes and messages

### Test 4: Layout Configuration
- [ ] Test layout retrieval from settings system
- [ ] Verify fallback to default '1x2' layout
- [ ] Test valid layout values ('1x1', '1x2', '1x3')
- [ ] Test invalid layout handling

## Definition of Done
- [ ] `sponsors-get` function created and deployed
- [ ] Function properly queries Supabase sponsor_assets table
- [ ] Signed URL generation works for stored images
- [ ] SVG inline content handling works
- [ ] Layout configuration retrieval implemented
- [ ] Error handling covers all edge cases
- [ ] API returns data in specified JSON format
- [ ] CORS headers properly configured
- [ ] Type definitions created and exported
- [ ] Client service created following existing patterns
- [ ] Function tests written and passing
- [ ] Integration testing completed

## Files Created
- `netlify/functions/sponsors-get.js` - Main API function
- `src/types/sponsors.ts` - Type definitions
- `src/services/SponsorsService.ts` - Client service
- `netlify/functions/sponsors-get.test.js` - Function tests

## Notes
- Ensure proper CORS configuration for frontend access
- Consider adding rate limiting for production use
- Monitor signed URL generation performance
- Document any layout configuration dependencies
- Test thoroughly with different image types and sizes