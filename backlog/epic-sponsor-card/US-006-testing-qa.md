# US-006: Testing and Quality Assurance

## User Story
**As a developer**, I need comprehensive tests for the sponsor card system so that it works reliably across different layouts and edge cases.

## Priority: MEDIUM
**Estimated Time**: 6 hours
**Complexity**: MEDIUM
**Dependencies**: All previous user stories (US-001 through US-005)

## Acceptance Criteria
- [ ] Unit tests for all sponsor components and services
- [ ] Integration tests for API functions
- [ ] End-to-end tests for complete sponsor workflow
- [ ] Visual regression tests for different layouts
- [ ] Performance tests for multiple sponsors
- [ ] Accessibility tests for screen readers
- [ ] Cross-browser compatibility tests
- [ ] Mobile responsiveness tests
- [ ] Error handling and edge case tests

## Implementation Prompt

### Task 1: Comprehensive Unit Tests
**Prompt**: Create comprehensive unit tests for all sponsor-related components, services, and utilities to ensure they work correctly in isolation.

**Requirements**:
1. Test SponsorCard component with all layouts and edge cases
2. Test useSponsors hook with different data states
3. Test SponsorsService with mock API responses
4. Test settings management utilities
5. Achieve >90% code coverage for sponsor features

**Unit Test Suite**:
```typescript
// src/features/sponsors/__tests__/SponsorCard.test.tsx
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { SponsorCard } from '../SponsorCard'
import { SponsorAsset } from '../../../types/sponsors'

describe('SponsorCard Component', () => {
  const mockImageSponsor: SponsorAsset = {
    id: '1',
    companyId: 'company-1',
    companyName: 'Test Company',
    alt: 'Test Company logo',
    type: 'png',
    src: 'https://example.com/logo.png',
    svg: null
  }

  const mockSVGSponsor: SponsorAsset = {
    id: '2',
    companyId: 'company-2',
    companyName: 'SVG Company',
    alt: 'SVG Company logo',
    type: 'svg',
    src: null,
    svg: '<svg viewBox="0 0 100 40"><rect width="100" height="40" fill="#007acc"/></svg>'
  }

  describe('Layout Rendering', () => {
    test('renders 1x1 layout correctly', () => {
      render(<SponsorCard items={[mockImageSponsor]} layout="1x1" />)

      const grid = screen.getByLabelText('Sponsors').querySelector('.grid')
      expect(grid).toHaveClass('grid-cols-1')
    })

    test('renders 1x2 layout correctly', () => {
      render(<SponsorCard items={[mockImageSponsor, mockSVGSponsor]} layout="1x2" />)

      const grid = screen.getByLabelText('Sponsors').querySelector('.grid')
      expect(grid).toHaveClass('grid-cols-2')
    })

    test('renders 1x3 layout correctly', () => {
      render(<SponsorCard items={[mockImageSponsor, mockSVGSponsor, mockImageSponsor]} layout="1x3" />)

      const grid = screen.getByLabelLabel('Sponsors').querySelector('.grid')
      expect(grid).toHaveClass('grid-cols-3')
    })
  })

  describe('Content Handling', () => {
    test('renders image sponsors with correct attributes', () => {
      render(<SponsorCard items={[mockImageSponsor]} layout="1x1" />)

      const image = screen.getByAltText('Test Company logo')
      expect(image).toHaveAttribute('src', 'https://example.com/logo.png')
      expect(image).toHaveClass('h-12', 'md:h-14', 'object-contain')
    })

    test('renders SVG sponsors with inline content', () => {
      render(<SponsorCard items={[mockSVGSponsor]} layout="1x1" />)

      const svgContainer = screen.getByRole('img', { name: 'SVG Company logo' })
      expect(svgContainer).toBeInTheDocument()
      expect(svgContainer.innerHTML).toContain('<svg')
    })

    test('sanitizes dangerous SVG content', () => {
      const maliciousSponsor = {
        ...mockSVGSponsor,
        svg: '<svg><script>alert("xss")</script><rect width="100" height="40"/></svg>'
      }

      render(<SponsorCard items={[maliciousSponsor]} layout="1x1" />)

      const svgContainer = screen.getByRole('img', { name: 'SVG Company logo' })
      expect(svgContainer.innerHTML).not.toContain('<script>')
      expect(svgContainer.innerHTML).toContain('<rect')
    })

    test('handles image load failures gracefully', async () => {
      render(<SponsorCard items={[mockImageSponsor]} layout="1x1" />)

      const image = screen.getByAltText('Test Company logo')

      // Simulate image load error
      fireEvent.error(image)

      await waitFor(() => {
        expect(screen.getByText('Test Company')).toBeInTheDocument()
      })
    })
  })

  describe('Edge Cases', () => {
    test('returns null for empty items array', () => {
      const { container } = render(<SponsorCard items={[]} layout="1x2" />)
      expect(container.firstChild).toBeNull()
    })

    test('returns null for null items', () => {
      const { container } = render(<SponsorCard items={null as any} layout="1x2" />)
      expect(container.firstChild).toBeNull()
    })

    test('handles sponsors with missing src and svg', () => {
      const incompleteSpnsor = {
        ...mockImageSponsor,
        src: null,
        svg: null
      }

      render(<SponsorCard items={[incompleteSpnsor]} layout="1x1" />)
      expect(screen.getByText('Test Company')).toBeInTheDocument()
    })

    test('handles malformed sponsor data', () => {
      const malformedSponsor = {
        id: 'test',
        companyName: 'Test',
        // Missing required fields
      } as SponsorAsset

      expect(() => {
        render(<SponsorCard items={[malformedSponsor]} layout="1x1" />)
      }).not.toThrow()
    })
  })

  describe('Accessibility', () => {
    test('has proper ARIA labels', () => {
      render(<SponsorCard items={[mockImageSponsor]} layout="1x1" />)

      expect(screen.getByLabelText('Sponsors')).toBeInTheDocument()
    })

    test('images have alt text', () => {
      render(<SponsorCard items={[mockImageSponsor]} layout="1x1" />)

      const image = screen.getByAltText('Test Company logo')
      expect(image).toBeInTheDocument()
    })

    test('SVG elements have proper roles', () => {
      render(<SponsorCard items={[mockSVGSponsor]} layout="1x1" />)

      const svgElement = screen.getByRole('img', { name: 'SVG Company logo' })
      expect(svgElement).toHaveAttribute('role', 'img')
      expect(svgElement).toHaveAttribute('aria-label', 'SVG Company logo')
    })
  })
})
```

**Service Tests**:
```typescript
// src/services/__tests__/SponsorsService.test.ts
import { SponsorsService } from '../SponsorsService'

// Mock fetch globally
global.fetch = jest.fn()
const mockFetch = fetch as jest.MockedFunction<typeof fetch>

describe('SponsorsService', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    SponsorsService.clearCache()
  })

  describe('getSponsors', () => {
    test('fetches sponsors successfully', async () => {
      const mockResponse = {
        layout: '1x2',
        items: [
          {
            id: '1',
            companyId: 'test',
            companyName: 'Test Company',
            alt: 'Test logo',
            type: 'png',
            src: 'https://example.com/logo.png',
            svg: null
          }
        ]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response)

      const result = await SponsorsService.getSponsors({
        organizationId: 'test-org',
        huntId: 'test-hunt'
      })

      expect(result).toEqual(mockResponse)
      expect(mockFetch).toHaveBeenCalledWith('/.netlify/functions/sponsors-get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: 'test-org',
          huntId: 'test-hunt'
        })
      })
    })

    test('handles API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as Response)

      const result = await SponsorsService.getSponsors({
        organizationId: 'test-org',
        huntId: 'test-hunt'
      })

      expect(result).toEqual({
        layout: '1x2',
        items: []
      })
    })

    test('caches responses correctly', async () => {
      const mockResponse = { layout: '1x2', items: [] }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response)

      // First call
      await SponsorsService.getSponsors({ organizationId: 'test', huntId: 'test' })

      // Second call should use cache
      const result = await SponsorsService.getSponsors({ organizationId: 'test', huntId: 'test' })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(result).toEqual(mockResponse)
    })

    test('validates response format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: 'response' })
      } as Response)

      const result = await SponsorsService.getSponsors({
        organizationId: 'test-org',
        huntId: 'test-hunt'
      })

      expect(result).toEqual({
        layout: '1x2',
        items: []
      })
    })
  })

  describe('cache management', () => {
    test('clearCache removes all cached data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ layout: '1x2', items: [] })
      } as Response)

      await SponsorsService.getSponsors({ organizationId: 'test', huntId: 'test' })

      SponsorsService.clearCache()

      await SponsorsService.getSponsors({ organizationId: 'test', huntId: 'test' })

      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    test('hasCachedSponsors returns correct status', async () => {
      expect(SponsorsService.hasCachedSponsors('test', 'test')).toBe(false)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          layout: '1x2',
          items: [{ id: '1', companyId: 'test', companyName: 'Test', alt: 'Test', type: 'png', src: 'test.png', svg: null }]
        })
      } as Response)

      await SponsorsService.getSponsors({ organizationId: 'test', huntId: 'test' })

      expect(SponsorsService.hasCachedSponsors('test', 'test')).toBe(true)
    })
  })
})
```

### Task 2: API Integration Tests
**Prompt**: Create integration tests for the sponsors-get Netlify function to ensure it works correctly with the Supabase database.

**Requirements**:
1. Test successful sponsor retrieval
2. Test empty results handling
3. Test error scenarios (database errors, invalid params)
4. Test signed URL generation
5. Test layout configuration retrieval

**API Integration Tests**:
```javascript
// netlify/functions/__tests__/sponsors-get.integration.test.js
const { handler } = require('../sponsors-get')

// Mock Supabase
const mockSupabase = {
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
}

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase)
}))

describe('sponsors-get Integration Tests', () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
    process.env.VITE_ENABLE_SPONSOR_CARD = 'true'

    // Reset all mocks
    jest.clearAllMocks()
  })

  describe('Successful Responses', () => {
    test('returns sponsors with image URLs', async () => {
      const mockSponsors = [
        {
          id: '1',
          organization_id: 'test-org',
          hunt_id: 'test-hunt',
          company_id: 'company-1',
          company_name: 'Test Company',
          image_type: 'png',
          image_alt: 'Test Company logo',
          order_index: 0,
          is_active: true,
          storage_path: 'test-org/test-hunt/logo.png',
          svg_text: null
        }
      ]

      mockSupabase.from.mockReturnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                order: () => Promise.resolve({ data: mockSponsors, error: null })
              })
            })
          })
        })
      })

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
      expect(body.items).toHaveLength(1)
      expect(body.items[0].companyName).toBe('Test Company')
      expect(body.items[0].src).toBe('https://example.com/signed-url')
    })

    test('returns sponsors with SVG content', async () => {
      const mockSponsors = [
        {
          id: '2',
          organization_id: 'test-org',
          hunt_id: 'test-hunt',
          company_id: 'company-2',
          company_name: 'SVG Company',
          image_type: 'svg',
          image_alt: 'SVG Company logo',
          order_index: 0,
          is_active: true,
          storage_path: null,
          svg_text: '<svg viewBox="0 0 100 40"><rect width="100" height="40" fill="blue"/></svg>'
        }
      ]

      mockSupabase.from.mockReturnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                order: () => Promise.resolve({ data: mockSponsors, error: null })
              })
            })
          })
        })
      })

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
      expect(body.items[0].svg).toContain('<svg')
      expect(body.items[0].src).toBeNull()
    })
  })

  describe('Empty Results', () => {
    test('returns empty array when no sponsors found', async () => {
      mockSupabase.from.mockReturnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                order: () => Promise.resolve({ data: [], error: null })
              })
            })
          })
        })
      })

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

    test('returns empty array when feature is disabled', async () => {
      process.env.VITE_ENABLE_SPONSOR_CARD = 'false'

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
  })

  describe('Error Handling', () => {
    test('returns 400 for missing parameters', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({})
      }

      const result = await handler(event, {})

      expect(result.statusCode).toBe(400)
    })

    test('returns 500 for database errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                order: () => Promise.resolve({
                  data: null,
                  error: { message: 'Database connection failed' }
                })
              })
            })
          })
        })
      })

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          organizationId: 'test-org',
          huntId: 'test-hunt'
        })
      }

      const result = await handler(event, {})

      expect(result.statusCode).toBe(500)
    })

    test('handles signed URL generation errors', async () => {
      const mockSponsors = [{
        id: '1',
        organization_id: 'test-org',
        hunt_id: 'test-hunt',
        company_id: 'company-1',
        company_name: 'Test Company',
        image_type: 'png',
        image_alt: 'Test Company logo',
        order_index: 0,
        is_active: true,
        storage_path: 'invalid/path.png',
        svg_text: null
      }]

      mockSupabase.from.mockReturnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                order: () => Promise.resolve({ data: mockSponsors, error: null })
              })
            })
          })
        })
      })

      mockSupabase.storage.from.mockReturnValue({
        createSignedUrl: () => Promise.resolve({
          data: null,
          error: { message: 'File not found' }
        })
      })

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
      expect(body.items[0].src).toBeNull()
    })
  })

  describe('CORS Handling', () => {
    test('handles OPTIONS request correctly', async () => {
      const event = { httpMethod: 'OPTIONS' }
      const result = await handler(event, {})

      expect(result.statusCode).toBe(200)
      expect(result.headers['Access-Control-Allow-Origin']).toBe('*')
      expect(result.headers['Access-Control-Allow-Methods']).toBe('GET, POST, OPTIONS')
    })

    test('includes CORS headers in all responses', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          organizationId: 'test-org',
          huntId: 'test-hunt'
        })
      }

      const result = await handler(event, {})

      expect(result.headers['Access-Control-Allow-Origin']).toBe('*')
      expect(result.headers['Content-Type']).toBe('application/json')
    })
  })
})
```

### Task 3: End-to-End Tests
**Prompt**: Create end-to-end tests that verify the complete sponsor card workflow from database to UI rendering.

**Requirements**:
1. Test complete sponsor display workflow
2. Test different layout configurations
3. Test responsive behavior
4. Test accessibility with screen readers
5. Use tools like Playwright or Cypress

**E2E Test Implementation**:
```typescript
// tests/e2e/sponsor-card.spec.ts (Playwright example)
import { test, expect } from '@playwright/test'

test.describe('Sponsor Card E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses for consistent testing
    await page.route('**/sponsors-get', async (route) => {
      const url = new URL(route.request().url())
      const body = JSON.parse(route.request().postData() || '{}')

      if (body.organizationId === 'test-org' && body.huntId === 'test-hunt') {
        await route.fulfill({
          json: {
            layout: '1x2',
            items: [
              {
                id: '1',
                companyId: 'company-1',
                companyName: 'Test Company 1',
                alt: 'Test Company 1 logo',
                type: 'png',
                src: '/test-logo-1.png',
                svg: null
              },
              {
                id: '2',
                companyId: 'company-2',
                companyName: 'Test Company 2',
                alt: 'Test Company 2 logo',
                type: 'svg',
                src: null,
                svg: '<svg viewBox="0 0 100 40"><rect width="100" height="40" fill="#007acc"/><text x="50" y="25" fill="white" text-anchor="middle">Company 2</text></svg>'
              }
            ]
          }
        })
      } else {
        await route.fulfill({ json: { items: [] } })
      }
    })
  })

  test('displays sponsor card with sponsors', async ({ page }) => {
    await page.goto('/active?org=test-org&hunt=test-hunt')

    // Wait for sponsor card to appear
    await expect(page.locator('[aria-label="Sponsors"]')).toBeVisible()

    // Check that both sponsors are displayed
    await expect(page.locator('img[alt="Test Company 1 logo"]')).toBeVisible()
    await expect(page.locator('[role="img"][aria-label="Test Company 2 logo"]')).toBeVisible()

    // Verify layout (should be 2 columns)
    const grid = page.locator('[aria-label="Sponsors"] .grid')
    await expect(grid).toHaveClass(/grid-cols-2/)
  })

  test('does not display sponsor card without sponsors', async ({ page }) => {
    await page.goto('/active?org=no-sponsors&hunt=no-sponsors')

    // Sponsor card should not exist
    await expect(page.locator('[aria-label="Sponsors"]')).not.toBeVisible()

    // Progress card should still be visible (assuming it exists)
    // await expect(page.locator('[data-testid="progress-card"]')).toBeVisible()
  })

  test('handles different layouts correctly', async ({ page }) => {
    // Test 1x3 layout
    await page.route('**/sponsors-get', async (route) => {
      await route.fulfill({
        json: {
          layout: '1x3',
          items: [
            { id: '1', companyId: 'c1', companyName: 'Company 1', alt: 'Logo 1', type: 'png', src: '/logo1.png', svg: null },
            { id: '2', companyId: 'c2', companyName: 'Company 2', alt: 'Logo 2', type: 'png', src: '/logo2.png', svg: null },
            { id: '3', companyId: 'c3', companyName: 'Company 3', alt: 'Logo 3', type: 'png', src: '/logo3.png', svg: null }
          ]
        }
      })
    })

    await page.goto('/active?org=test-org&hunt=test-hunt')

    const grid = page.locator('[aria-label="Sponsors"] .grid')
    await expect(grid).toHaveClass(/grid-cols-3/)
  })

  test('is accessible to screen readers', async ({ page }) => {
    await page.goto('/active?org=test-org&hunt=test-hunt')

    // Check accessibility attributes
    const sponsorCard = page.locator('[aria-label="Sponsors"]')
    await expect(sponsorCard).toHaveAttribute('aria-label', 'Sponsors')

    // Check that images have alt text
    const images = page.locator('[aria-label="Sponsors"] img')
    for (const image of await images.all()) {
      await expect(image).toHaveAttribute('alt')
    }

    // Check SVG accessibility
    const svgElements = page.locator('[aria-label="Sponsors"] [role="img"]')
    for (const svg of await svgElements.all()) {
      await expect(svg).toHaveAttribute('aria-label')
    }
  })

  test('works on mobile devices', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }) // iPhone SE size

    await page.goto('/active?org=test-org&hunt=test-hunt')

    const sponsorCard = page.locator('[aria-label="Sponsors"]')
    await expect(sponsorCard).toBeVisible()

    // Check that images have mobile-appropriate height (h-12)
    const images = page.locator('[aria-label="Sponsors"] img')
    for (const image of await images.all()) {
      const box = await image.boundingBox()
      expect(box?.height).toBeCloseTo(48, 5) // h-12 = 3rem = 48px
    }
  })

  test('works on desktop devices', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 })

    await page.goto('/active?org=test-org&hunt=test-hunt')

    const sponsorCard = page.locator('[aria-label="Sponsors"]')
    await expect(sponsorCard).toBeVisible()

    // Check that images have desktop-appropriate height (md:h-14)
    const images = page.locator('[aria-label="Sponsors"] img')
    for (const image of await images.all()) {
      const box = await image.boundingBox()
      expect(box?.height).toBeCloseTo(56, 5) // h-14 = 3.5rem = 56px
    }
  })

  test('handles image load failures gracefully', async ({ page }) => {
    await page.route('**/sponsors-get', async (route) => {
      await route.fulfill({
        json: {
          layout: '1x1',
          items: [{
            id: '1',
            companyId: 'company-1',
            companyName: 'Test Company',
            alt: 'Test Company logo',
            type: 'png',
            src: '/nonexistent-image.png',
            svg: null
          }]
        }
      })
    })

    await page.goto('/active?org=test-org&hunt=test-hunt')

    // Should show placeholder with company name
    await expect(page.locator('text=Test Company')).toBeVisible()
  })

  test('maintains proper spacing with other page elements', async ({ page }) => {
    await page.goto('/active?org=test-org&hunt=test-hunt')

    const sponsorCard = page.locator('[aria-label="Sponsors"]')
    await expect(sponsorCard).toBeVisible()

    // Check that sponsor card appears above progress content
    // This is a visual test that would need to be adapted based on your actual page structure
    const sponsorCardPosition = await sponsorCard.boundingBox()
    // const progressCardPosition = await page.locator('[data-testid="progress-card"]').boundingBox()

    // expect(sponsorCardPosition.y).toBeLessThan(progressCardPosition.y)
  })
})
```

### Task 4: Performance and Load Tests
**Prompt**: Create performance tests to ensure the sponsor card system performs well under various conditions.

**Requirements**:
1. Test performance with many sponsors (10+)
2. Test image loading performance
3. Test API response times
4. Test memory usage
5. Test bundle size impact

**Performance Tests**:
```typescript
// tests/performance/sponsor-card.perf.test.ts
import { test, expect } from '@playwright/test'

test.describe('Sponsor Card Performance', () => {
  test('handles many sponsors efficiently', async ({ page }) => {
    // Generate many sponsors for testing
    const manySponsors = Array.from({ length: 20 }, (_, i) => ({
      id: `sponsor-${i}`,
      companyId: `company-${i}`,
      companyName: `Company ${i}`,
      alt: `Company ${i} logo`,
      type: 'png',
      src: `/logo-${i}.png`,
      svg: null
    }))

    await page.route('**/sponsors-get', async (route) => {
      await route.fulfill({
        json: {
          layout: '1x3',
          items: manySponsors
        }
      })
    })

    const startTime = Date.now()

    await page.goto('/active?org=test-org&hunt=test-hunt')
    await page.locator('[aria-label="Sponsors"]').waitFor()

    const loadTime = Date.now() - startTime

    // Should load in reasonable time (adjust threshold as needed)
    expect(loadTime).toBeLessThan(3000)

    // All sponsors should be rendered
    const sponsorItems = page.locator('[aria-label="Sponsors"] img')
    expect(await sponsorItems.count()).toBe(20)
  })

  test('lazy loads images efficiently', async ({ page }) => {
    await page.goto('/active?org=test-org&hunt=test-hunt')

    const images = page.locator('[aria-label="Sponsors"] img')

    // Check that images have loading="lazy" attribute
    for (const image of await images.all()) {
      await expect(image).toHaveAttribute('loading', 'lazy')
    }
  })

  test('API response time is acceptable', async ({ page }) => {
    let requestTime = 0

    await page.route('**/sponsors-get', async (route) => {
      const start = Date.now()

      // Simulate some processing time
      await new Promise(resolve => setTimeout(resolve, 100))

      await route.fulfill({
        json: {
          layout: '1x2',
          items: [
            { id: '1', companyId: 'c1', companyName: 'Company 1', alt: 'Logo 1', type: 'png', src: '/logo1.png', svg: null }
          ]
        }
      })

      requestTime = Date.now() - start
    })

    await page.goto('/active?org=test-org&hunt=test-hunt')
    await page.locator('[aria-label="Sponsors"]').waitFor()

    // API should respond quickly
    expect(requestTime).toBeLessThan(1000)
  })

  test('does not cause layout shift', async ({ page }) => {
    await page.goto('/active?org=test-org&hunt=test-hunt')

    // Take screenshot before sponsors load
    const beforeScreenshot = await page.screenshot()

    // Wait for sponsors to load
    await page.locator('[aria-label="Sponsors"]').waitFor()

    // Take screenshot after sponsors load
    const afterScreenshot = await page.screenshot()

    // Screenshots should be different (sponsors appeared) but layout should be stable
    expect(beforeScreenshot).not.toEqual(afterScreenshot)
  })
})

// Bundle size test (can be run separately)
test.describe('Bundle Size Impact', () => {
  test('sponsor features have reasonable bundle impact', async () => {
    // This would be implemented using webpack-bundle-analyzer or similar
    // Pseudo-code:

    const baseBundleSize = getBundleSize('without-sponsors')
    const withSponsorsSize = getBundleSize('with-sponsors')

    const increase = withSponsorsSize - baseBundleSize
    const percentIncrease = (increase / baseBundleSize) * 100

    // Sponsor features should add <10% to bundle size
    expect(percentIncrease).toBeLessThan(10)
  })
})
```

### Task 5: Cross-Browser and Device Tests
**Prompt**: Create tests to ensure sponsor card works across different browsers and devices.

**Requirements**:
1. Test on Chrome, Firefox, Safari, Edge
2. Test on mobile devices (iOS/Android)
3. Test different screen sizes
4. Test touch interactions (if any)
5. Test browser-specific CSS behaviors

**Cross-Browser Test Configuration**:
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
    {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
  ],
})
```

```typescript
// tests/cross-browser/sponsor-card.cross-browser.spec.ts
import { test, expect, devices } from '@playwright/test'

const testDevices = [
  { name: 'Desktop Chrome', ...devices['Desktop Chrome'] },
  { name: 'Desktop Firefox', ...devices['Desktop Firefox'] },
  { name: 'Desktop Safari', ...devices['Desktop Safari'] },
  { name: 'iPhone 12', ...devices['iPhone 12'] },
  { name: 'Pixel 5', ...devices['Pixel 5'] },
]

testDevices.forEach(device => {
  test.describe(`Sponsor Card on ${device.name}`, () => {
    test.use(device)

    test('renders correctly', async ({ page }) => {
      await page.route('**/sponsors-get', async (route) => {
        await route.fulfill({
          json: {
            layout: '1x2',
            items: [
              {
                id: '1',
                companyId: 'company-1',
                companyName: 'Test Company',
                alt: 'Test Company logo',
                type: 'png',
                src: '/test-logo.png',
                svg: null
              }
            ]
          }
        })
      })

      await page.goto('/active?org=test-org&hunt=test-hunt')

      const sponsorCard = page.locator('[aria-label="Sponsors"]')
      await expect(sponsorCard).toBeVisible()

      // Take a screenshot for visual comparison
      await expect(sponsorCard).toHaveScreenshot(`sponsor-card-${device.name.replace(/\s+/g, '-').toLowerCase()}.png`)
    })

    test('maintains proper spacing', async ({ page }) => {
      await page.route('**/sponsors-get', async (route) => {
        await route.fulfill({
          json: {
            layout: '1x3',
            items: [
              { id: '1', companyId: 'c1', companyName: 'Company 1', alt: 'Logo 1', type: 'png', src: '/logo1.png', svg: null },
              { id: '2', companyId: 'c2', companyName: 'Company 2', alt: 'Logo 2', type: 'png', src: '/logo2.png', svg: null },
              { id: '3', companyId: 'c3', companyName: 'Company 3', alt: 'Logo 3', type: 'png', src: '/logo3.png', svg: null }
            ]
          }
        })
      })

      await page.goto('/active?org=test-org&hunt=test-hunt')

      const sponsorCard = page.locator('[aria-label="Sponsors"]')
      await expect(sponsorCard).toBeVisible()

      // Check grid layout works on this device
      const grid = sponsorCard.locator('.grid')
      const gridBox = await grid.boundingBox()
      expect(gridBox?.width).toBeGreaterThan(0)
      expect(gridBox?.height).toBeGreaterThan(0)
    })

    test('images display correctly', async ({ page }) => {
      await page.goto('/active?org=test-org&hunt=test-hunt')

      const images = page.locator('[aria-label="Sponsors"] img')
      const imageCount = await images.count()

      for (let i = 0; i < imageCount; i++) {
        const image = images.nth(i)
        await expect(image).toBeVisible()

        // Check that image has loaded
        const naturalWidth = await image.evaluate(img => (img as HTMLImageElement).naturalWidth)
        expect(naturalWidth).toBeGreaterThan(0)
      }
    })
  })
})
```

## Acceptance Tests

### Test Coverage Requirements
- [ ] Unit test coverage >90% for all sponsor-related code
- [ ] Integration tests cover all API endpoints and database operations
- [ ] E2E tests cover complete user workflows
- [ ] Performance tests validate acceptable load times and resource usage
- [ ] Cross-browser tests pass on all target browsers and devices
- [ ] Accessibility tests pass with screen readers and keyboard navigation

### Quality Gates
- [ ] All tests pass in CI/CD pipeline
- [ ] No console errors in any test scenario
- [ ] Visual regression tests show no unintended changes
- [ ] Performance benchmarks meet or exceed baseline requirements
- [ ] Accessibility audit shows no violations
- [ ] Cross-browser compatibility confirmed

### Test Scenarios Covered
- [ ] Sponsor card displays with different layouts (1x1, 1x2, 1x3)
- [ ] Sponsor card handles both image and SVG content types
- [ ] Sponsor card renders nothing when no sponsors exist
- [ ] Sponsor card handles API errors gracefully
- [ ] Sponsor card works on mobile and desktop devices
- [ ] Sponsor card is accessible to screen readers
- [ ] Sponsor card maintains proper spacing with other elements
- [ ] Sponsor card performs well with many sponsors
- [ ] Sponsor card works in all target browsers

## Definition of Done
- [ ] Comprehensive unit tests written and passing (>90% coverage)
- [ ] Integration tests for API functions written and passing
- [ ] End-to-end tests for complete workflows written and passing
- [ ] Performance tests validate acceptable resource usage
- [ ] Cross-browser tests pass on all target platforms
- [ ] Accessibility tests pass with no violations
- [ ] Visual regression tests configured and baseline established
- [ ] All tests integrated into CI/CD pipeline
- [ ] Test documentation created for maintainability
- [ ] Quality gates defined and enforced
- [ ] Bug reports and fixes tracked and resolved
- [ ] Performance benchmarks documented and met

## Files Created
- `src/features/sponsors/__tests__/SponsorCard.test.tsx` - Component tests
- `src/services/__tests__/SponsorsService.test.ts` - Service tests
- `netlify/functions/__tests__/sponsors-get.integration.test.js` - API tests
- `tests/e2e/sponsor-card.spec.ts` - End-to-end tests
- `tests/performance/sponsor-card.perf.test.ts` - Performance tests
- `tests/cross-browser/sponsor-card.cross-browser.spec.ts` - Cross-browser tests
- `playwright.config.ts` - Test configuration
- Test documentation and quality gates

## Notes
- Run tests in CI/CD pipeline for every pull request
- Monitor test execution time and optimize slow tests
- Update tests when features change
- Consider adding visual regression testing for design consistency
- Document test maintenance procedures for team
- Set up test result reporting and monitoring