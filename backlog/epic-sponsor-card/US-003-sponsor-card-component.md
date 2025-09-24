# US-003: Core Sponsor Card Component

## User Story
**As an attendee**, I want to see sponsor logos displayed prominently on the Active page so that I know who sponsored the event.

## Priority: HIGH
**Estimated Time**: 8 hours
**Complexity**: MEDIUM
**Dependencies**: US-002 (Sponsor Data API)

## Acceptance Criteria
- [ ] `SponsorCard` component created with proper styling
- [ ] Component supports 1x1, 1x2, and 1x3 grid layouts
- [ ] Component handles both stored images and inline SVG
- [ ] Component renders nothing when no sponsors provided
- [ ] Component matches existing card styling in ActiveView
- [ ] Component is fully accessible with proper ARIA labels
- [ ] Component is responsive across different screen sizes
- [ ] Component preserves image aspect ratios

## Implementation Prompt

### Task 1: Create Core SponsorCard Component
**Prompt**: Create the main SponsorCard component that displays sponsor logos in a configurable grid layout, matching the existing card styling used throughout the application.

**Requirements**:
1. Create `src/features/sponsors/SponsorCard.tsx`
2. Accept `items` and `layout` props as specified in the API contract
3. Use CSS Grid for flexible layouts (1x1, 1x2, 1x3)
4. Handle both image URLs and inline SVG content
5. Match existing card styling from other components
6. Include proper accessibility attributes

**Component Implementation**:
```tsx
// src/features/sponsors/SponsorCard.tsx

import React from 'react'
import { SponsorAsset } from '../../types/sponsors'

interface SponsorCardProps {
  items: SponsorAsset[]
  layout: '1x1' | '1x2' | '1x3'
}

export const SponsorCard: React.FC<SponsorCardProps> = ({ items, layout }) => {
  // Don't render anything if no sponsors
  if (!items || items.length === 0) {
    return null
  }

  // Convert layout to CSS Grid classes
  const getGridCols = (layout: string): string => {
    switch (layout) {
      case '1x1': return 'grid-cols-1'
      case '1x2': return 'grid-cols-2'
      case '1x3': return 'grid-cols-3'
      default: return 'grid-cols-2'
    }
  }

  const gridCols = getGridCols(layout)

  return (
    <div
      className="border rounded-lg shadow-sm px-4 py-3"
      style={{
        backgroundColor: 'var(--color-white)',
        borderColor: 'var(--color-light-grey)'
      }}
      aria-label="Sponsors"
    >
      <div className={`grid gap-3 ${gridCols}`}>
        {items.map((sponsor) => (
          <SponsorItem
            key={sponsor.id}
            sponsor={sponsor}
          />
        ))}
      </div>
    </div>
  )
}

interface SponsorItemProps {
  sponsor: SponsorAsset
}

const SponsorItem: React.FC<SponsorItemProps> = ({ sponsor }) => {
  return (
    <div className="flex items-center justify-center p-2">
      {sponsor.type === 'svg' && sponsor.svg ? (
        <SponsorSVG
          svg={sponsor.svg}
          alt={sponsor.alt}
          companyName={sponsor.companyName}
        />
      ) : sponsor.src ? (
        <SponsorImage
          src={sponsor.src}
          alt={sponsor.alt}
          companyName={sponsor.companyName}
        />
      ) : (
        <SponsorPlaceholder companyName={sponsor.companyName} />
      )}
    </div>
  )
}

interface SponsorImageProps {
  src: string
  alt: string
  companyName: string
}

const SponsorImage: React.FC<SponsorImageProps> = ({ src, alt, companyName }) => {
  const [imageError, setImageError] = React.useState(false)
  const [imageLoaded, setImageLoaded] = React.useState(false)

  const handleImageError = () => {
    console.warn(`[SponsorCard] Failed to load image for ${companyName}:`, src)
    setImageError(true)
  }

  const handleImageLoad = () => {
    setImageLoaded(true)
  }

  if (imageError) {
    return <SponsorPlaceholder companyName={companyName} />
  }

  return (
    <div className="relative">
      <img
        src={src}
        alt={alt}
        className="h-12 md:h-14 object-contain max-w-full"
        style={{
          opacity: imageLoaded ? 1 : 0,
          transition: 'opacity 0.2s ease-in-out'
        }}
        onError={handleImageError}
        onLoad={handleImageLoad}
        loading="lazy"
      />
      {!imageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}

interface SponsorSVGProps {
  svg: string
  alt: string
  companyName: string
}

const SponsorSVG: React.FC<SponsorSVGProps> = ({ svg, alt, companyName }) => {
  // Sanitize SVG content (basic safety check)
  const sanitizedSVG = svg.replace(/<script[^>]*>.*?<\/script>/gi, '')
                          .replace(/javascript:/gi, '')
                          .replace(/on\w+="[^"]*"/gi, '')

  return (
    <div
      className="h-12 md:h-14 flex items-center justify-center max-w-full"
      dangerouslySetInnerHTML={{ __html: sanitizedSVG }}
      title={alt}
      role="img"
      aria-label={alt}
    />
  )
}

interface SponsorPlaceholderProps {
  companyName: string
}

const SponsorPlaceholder: React.FC<SponsorPlaceholderProps> = ({ companyName }) => {
  return (
    <div className="h-12 md:h-14 flex items-center justify-center bg-gray-100 rounded border px-3">
      <span className="text-xs text-gray-600 text-center font-medium truncate">
        {companyName}
      </span>
    </div>
  )
}
```

### Task 2: Create React Hook for Sponsor Data
**Prompt**: Create a custom React hook that fetches sponsor data and manages loading/error states, following existing patterns in the codebase.

**Requirements**:
1. Create `src/features/sponsors/useSponsors.ts`
2. Use existing app state patterns (check `useAppStore`)
3. Handle loading and error states
4. Cache data appropriately
5. Return data in format expected by SponsorCard

**Hook Implementation**:
```typescript
// src/features/sponsors/useSponsors.ts

import { useState, useEffect, useMemo } from 'react'
import { SponsorsResponse } from '../../types/sponsors'
import { SponsorsService } from '../../services/SponsorsService'
import { useAppStore } from '../../store/appStore' // Adjust import based on your store structure

interface UseSponsorsResult {
  sponsors: SponsorsResponse | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export const useSponsors = (): UseSponsorsResult => {
  const [sponsors, setSponsors] = useState<SponsorsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get organization and hunt info from app store
  const { organizationId, huntId, teamName } = useAppStore() // Adjust based on your store structure

  // Create stable request object
  const request = useMemo(() => {
    if (!organizationId || !huntId) {
      return null
    }

    return {
      organizationId,
      huntId,
      teamName
    }
  }, [organizationId, huntId, teamName])

  const fetchSponsors = async () => {
    if (!request) {
      setSponsors(null)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log('[useSponsors] Fetching sponsors...', request)
      const data = await SponsorsService.getSponsors(request)
      setSponsors(data)

      if (data.items.length > 0) {
        console.log(`[useSponsors] Loaded ${data.items.length} sponsors with ${data.layout} layout`)
      } else {
        console.log('[useSponsors] No sponsors found for this event')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch sponsors'
      console.error('[useSponsors] Error fetching sponsors:', err)
      setError(errorMessage)
      setSponsors({ layout: '1x2', items: [] }) // Fallback to empty
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch sponsors when request parameters change
  useEffect(() => {
    fetchSponsors()
  }, [request])

  return {
    sponsors,
    isLoading,
    error,
    refetch: fetchSponsors
  }
}
```

### Task 3: Add Sponsor Card Styling
**Prompt**: Create any additional CSS styles needed for the sponsor card to ensure it matches existing components and works responsively.

**Requirements**:
1. Add styles to existing CSS files or create new ones
2. Ensure responsive behavior across screen sizes
3. Match existing card styling patterns
4. Handle different logo aspect ratios gracefully
5. Add loading and error state styles

**Additional CSS** (add to appropriate CSS file):
```css
/* Sponsor Card Specific Styles */
.sponsor-card {
  /* Additional styles if needed beyond Tailwind */
}

.sponsor-item {
  /* Ensure logos scale properly */
  min-height: 3rem; /* h-12 equivalent */
}

@media (min-width: 768px) {
  .sponsor-item {
    min-height: 3.5rem; /* h-14 equivalent */
  }
}

/* Loading animation for sponsor images */
@keyframes sponsor-loading {
  from {
    opacity: 0.5;
  }
  to {
    opacity: 1;
  }
}

.sponsor-loading {
  animation: sponsor-loading 1.5s ease-in-out infinite alternate;
}

/* Sponsor placeholder styling */
.sponsor-placeholder {
  background: linear-gradient(90deg, #f0f0f0 25%, transparent 37%, transparent 63%, #f0f0f0 75%);
  background-size: 400% 100%;
  animation: sponsor-placeholder-shimmer 1.5s ease-in-out infinite;
}

@keyframes sponsor-placeholder-shimmer {
  0% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}
```

### Task 4: Create Component Tests
**Prompt**: Create comprehensive tests for the SponsorCard component to ensure it works correctly across different scenarios and layouts.

**Requirements**:
1. Create `src/features/sponsors/SponsorCard.test.tsx`
2. Test rendering with different layouts (1x1, 1x2, 1x3)
3. Test handling of both image and SVG sponsors
4. Test empty state (no rendering)
5. Test error handling for failed images
6. Test accessibility attributes

**Test Implementation**:
```typescript
// src/features/sponsors/SponsorCard.test.tsx

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { SponsorCard } from './SponsorCard'
import { SponsorAsset } from '../../types/sponsors'

// Mock sponsors data
const mockImageSponsor: SponsorAsset = {
  id: '1',
  companyId: 'test-company',
  companyName: 'Test Company',
  alt: 'Test Company logo',
  type: 'png',
  src: 'https://example.com/logo.png',
  svg: null
}

const mockSVGSponsor: SponsorAsset = {
  id: '2',
  companyId: 'svg-company',
  companyName: 'SVG Company',
  alt: 'SVG Company logo',
  type: 'svg',
  src: null,
  svg: '<svg viewBox="0 0 100 40"><rect width="100" height="40" fill="blue"/></svg>'
}

describe('SponsorCard', () => {
  test('renders nothing when no sponsors provided', () => {
    const { container } = render(<SponsorCard items={[]} layout="1x2" />)
    expect(container.firstChild).toBeNull()
  })

  test('renders sponsor card with correct layout classes', () => {
    render(<SponsorCard items={[mockImageSponsor]} layout="1x3" />)

    const gridContainer = screen.getByLabelText('Sponsors').querySelector('div')
    expect(gridContainer).toHaveClass('grid', 'gap-3', 'grid-cols-3')
  })

  test('renders image sponsor correctly', () => {
    render(<SponsorCard items={[mockImageSponsor]} layout="1x2" />)

    const image = screen.getByAltText('Test Company logo')
    expect(image).toBeInTheDocument()
    expect(image).toHaveAttribute('src', 'https://example.com/logo.png')
    expect(image).toHaveClass('h-12', 'md:h-14', 'object-contain')
  })

  test('renders SVG sponsor correctly', () => {
    render(<SponsorCard items={[mockSVGSponsor]} layout="1x1" />)

    const svgContainer = screen.getByRole('img', { name: 'SVG Company logo' })
    expect(svgContainer).toBeInTheDocument()
    expect(svgContainer).toHaveAttribute('title', 'SVG Company logo')
  })

  test('renders multiple sponsors in grid', () => {
    const sponsors = [mockImageSponsor, mockSVGSponsor]
    render(<SponsorCard items={sponsors} layout="1x2" />)

    expect(screen.getByAltText('Test Company logo')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'SVG Company logo' })).toBeInTheDocument()
  })

  test('has proper accessibility attributes', () => {
    render(<SponsorCard items={[mockImageSponsor]} layout="1x2" />)

    const card = screen.getByLabelText('Sponsors')
    expect(card).toBeInTheDocument()
    expect(card).toHaveAttribute('aria-label', 'Sponsors')
  })

  test('handles different layout options', () => {
    const layouts: Array<'1x1' | '1x2' | '1x3'> = ['1x1', '1x2', '1x3']
    const expectedClasses = ['grid-cols-1', 'grid-cols-2', 'grid-cols-3']

    layouts.forEach((layout, index) => {
      const { rerender } = render(<SponsorCard items={[mockImageSponsor]} layout={layout} />)

      const gridContainer = screen.getByLabelText('Sponsors').querySelector('div')
      expect(gridContainer).toHaveClass(expectedClasses[index])

      rerender(<SponsorCard items={[]} layout="1x1" />)
    })
  })

  test('shows placeholder when image fails to load', async () => {
    // Mock image load error
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

    render(<SponsorCard items={[mockImageSponsor]} layout="1x1" />)

    const image = screen.getByAltText('Test Company logo')

    // Simulate image load error
    Object.defineProperty(image, 'onerror', {
      set: jest.fn(),
      get: jest.fn(() => () => {})
    })

    // Note: This test might need adjustment based on how you handle image errors
    // in your actual implementation

    consoleSpy.mockRestore()
  })

  test('sanitizes SVG content', () => {
    const maliciousSVG = '<svg><script>alert("xss")</script><rect width="100" height="40"/></svg>'
    const maliciousSponsor: SponsorAsset = {
      ...mockSVGSponsor,
      svg: maliciousSVG
    }

    render(<SponsorCard items={[maliciousSponsor]} layout="1x1" />)

    // Should not contain script tag
    const svgContainer = screen.getByRole('img', { name: 'SVG Company logo' })
    expect(svgContainer.innerHTML).not.toContain('<script>')
    expect(svgContainer.innerHTML).toContain('<rect')
  })
})
```

### Task 5: Add Storybook Stories (Optional)
**Prompt**: Create Storybook stories for the SponsorCard component to showcase different layouts and states.

**Requirements** (if Storybook is used in the project):
1. Create `src/features/sponsors/SponsorCard.stories.tsx`
2. Show all layout variations
3. Show different sponsor types (image vs SVG)
4. Show empty state
5. Show loading and error states

**Storybook Implementation**:
```typescript
// src/features/sponsors/SponsorCard.stories.tsx

import type { Meta, StoryObj } from '@storybook/react'
import { SponsorCard } from './SponsorCard'
import { SponsorAsset } from '../../types/sponsors'

const meta: Meta<typeof SponsorCard> = {
  title: 'Features/Sponsors/SponsorCard',
  component: SponsorCard,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'light',
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

const mockSponsors: SponsorAsset[] = [
  {
    id: '1',
    companyId: 'company-1',
    companyName: 'Tech Corp',
    alt: 'Tech Corp logo',
    type: 'png',
    src: 'https://via.placeholder.com/120x60/007acc/ffffff?text=Tech+Corp',
    svg: null
  },
  {
    id: '2',
    companyId: 'company-2',
    companyName: 'Design Studio',
    alt: 'Design Studio logo',
    type: 'svg',
    src: null,
    svg: '<svg viewBox="0 0 120 60"><rect width="120" height="60" fill="#ff6b6b"/><text x="60" y="35" fill="white" text-anchor="middle" font-family="Arial" font-size="12">Design Studio</text></svg>'
  },
  {
    id: '3',
    companyId: 'company-3',
    companyName: 'Local Bank',
    alt: 'Local Bank logo',
    type: 'png',
    src: 'https://via.placeholder.com/120x60/28a745/ffffff?text=Local+Bank',
    svg: null
  }
]

export const OneColumn: Story = {
  args: {
    items: [mockSponsors[0]],
    layout: '1x1'
  }
}

export const TwoColumns: Story = {
  args: {
    items: mockSponsors.slice(0, 2),
    layout: '1x2'
  }
}

export const ThreeColumns: Story = {
  args: {
    items: mockSponsors,
    layout: '1x3'
  }
}

export const EmptyState: Story = {
  args: {
    items: [],
    layout: '1x2'
  }
}

export const MixedContentTypes: Story = {
  args: {
    items: mockSponsors,
    layout: '1x2'
  }
}
```

## Acceptance Tests

### Test 1: Component Rendering
- [ ] Component renders with 1x1 layout correctly
- [ ] Component renders with 1x2 layout correctly
- [ ] Component renders with 1x3 layout correctly
- [ ] Component returns null when items array is empty
- [ ] Component handles undefined/null items prop gracefully

### Test 2: Content Handling
- [ ] Image sponsors display with correct src and alt attributes
- [ ] SVG sponsors render inline content correctly
- [ ] Images preserve aspect ratio and don't stretch
- [ ] SVG content is properly sanitized (no script tags)
- [ ] Placeholder shows when image fails to load

### Test 3: Styling and Layout
- [ ] Card styling matches other cards in ActiveView
- [ ] CSS Grid layouts work correctly on different screen sizes
- [ ] Component is responsive (h-12 on mobile, h-14 on desktop)
- [ ] Proper spacing and gap between sponsor items
- [ ] Loading states display appropriately

### Test 4: Accessibility
- [ ] Card has proper aria-label="Sponsors"
- [ ] Images have appropriate alt text
- [ ] SVG content has proper role and aria-label
- [ ] Component is keyboard navigable (if interactive)
- [ ] Screen readers announce content appropriately

### Test 5: Error Handling
- [ ] Failed image loads show placeholder with company name
- [ ] Invalid SVG content doesn't break rendering
- [ ] Component gracefully handles malformed sponsor data
- [ ] Console warnings logged for failed resources

## Definition of Done
- [ ] SponsorCard component created and styled
- [ ] Component supports all three layout options (1x1, 1x2, 1x3)
- [ ] Component handles both image and SVG sponsor types
- [ ] Component returns null for empty sponsor lists
- [ ] useSponsors hook created and integrated
- [ ] Component matches existing card styling patterns
- [ ] Responsive design works on mobile and desktop
- [ ] All accessibility requirements met
- [ ] Comprehensive tests written and passing
- [ ] Component performs well with multiple sponsors
- [ ] Error handling works for failed image loads
- [ ] SVG content is properly sanitized for security

## Files Created
- `src/features/sponsors/SponsorCard.tsx` - Main component
- `src/features/sponsors/useSponsors.ts` - Data fetching hook
- `src/features/sponsors/SponsorCard.test.tsx` - Component tests
- `src/features/sponsors/SponsorCard.stories.tsx` - Storybook stories (optional)

## Notes
- Ensure component is performant with many sponsors
- Consider lazy loading for images if needed
- Test with various image sizes and aspect ratios
- Verify component works with existing theming system
- Consider adding loading skeleton for better UX