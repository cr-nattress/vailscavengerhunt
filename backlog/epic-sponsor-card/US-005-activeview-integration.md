# US-005: ActiveView Integration

## User Story
**As a developer**, I need the sponsor card integrated into ActiveView with proper spacing and conditional rendering so that it appears above the progress card only when sponsors exist.

## Priority: HIGH
**Estimated Time**: 3 hours
**Complexity**: LOW
**Dependencies**: US-003 (Sponsor Card Component)

## Acceptance Criteria
- [ ] SponsorCard integrated into ActiveView.tsx
- [ ] SponsorCard appears above the Progress card
- [ ] SponsorCard uses same container styling as other elements
- [ ] SponsorCard has proper vertical spacing (mt-0 for top, mt-3 before progress)
- [ ] SponsorCard only renders when sponsors exist
- [ ] Page layout identical to current when no sponsors
- [ ] Integration doesn't break existing functionality
- [ ] Loading and error states handled appropriately

## Implementation Prompt

### Task 1: Analyze ActiveView Current Structure
**Prompt**: Examine the current ActiveView.tsx component to understand the layout structure and identify the exact integration points for the sponsor card.

**Requirements**:
1. Read `src/features/views/ActiveView.tsx`
2. Identify the Progress card location and container structure
3. Understand current spacing and styling patterns
4. Document the integration approach

**Analysis Steps**:
```typescript
// Find these elements in ActiveView.tsx:
// 1. Main container: div.max-w-screen-sm.mx-auto.px-4.py-3
// 2. Progress card location (around lines 187-225 per epic specs)
// 3. Current vertical spacing patterns
// 4. Any conditional rendering patterns
```

### Task 2: Integrate SponsorCard into ActiveView
**Prompt**: Add the SponsorCard component to ActiveView.tsx in the correct position with proper conditional rendering and styling.

**Requirements**:
1. Import SponsorCard and useSponsors
2. Add component above Progress card
3. Implement conditional rendering
4. Ensure proper spacing matches existing elements
5. Handle loading and error states appropriately

**Integration Implementation**:
```typescript
// Add to src/features/views/ActiveView.tsx imports
import { SponsorCard } from '../sponsors/SponsorCard'
import { useSponsors } from '../sponsors/useSponsors'

// In the ActiveView component function, add:
export function ActiveView() {
  // ... existing state and hooks ...

  // Add sponsors hook
  const { sponsors, isLoading: sponsorsLoading, error: sponsorsError } = useSponsors()

  // ... existing component logic ...

  return (
    <div className="max-w-screen-sm mx-auto px-4 py-3">
      {/* Existing header content */}

      {/* ADD SPONSOR CARD HERE - above progress card */}
      {sponsors && sponsors.items.length > 0 && (
        <div className="mt-0"> {/* First element in content area */}
          <SponsorCard
            items={sponsors.items}
            layout={sponsors.layout}
          />
        </div>
      )}

      {/* MODIFY EXISTING PROGRESS CARD */}
      <div className={sponsors && sponsors.items.length > 0 ? "mt-3" : "mt-0"}>
        {/* Existing Progress card content */}
        {/* ... progress card JSX ... */}
      </div>

      {/* Rest of existing content */}
      {/* ... existing ActiveView content ... */}
    </div>
  )
}
```

### Task 3: Handle Loading and Error States
**Prompt**: Implement appropriate loading and error handling for the sponsor card that doesn't interfere with the rest of the page loading.

**Requirements**:
1. Don't show loading spinner for sponsors (silent loading)
2. Don't display errors to user (log only)
3. Ensure page loads normally if sponsor fetch fails
4. Consider showing placeholder during initial load

**Loading State Implementation**:
```typescript
// In ActiveView component:

// Option 1: Silent loading (recommended)
// Don't show loading state, just render when data arrives
{sponsors && sponsors.items.length > 0 && (
  <div className="mt-0">
    <SponsorCard
      items={sponsors.items}
      layout={sponsors.layout}
    />
  </div>
)}

// Option 2: Loading placeholder (if preferred)
// Show subtle loading state that doesn't impact layout
{sponsorsLoading && (
  <div className="mt-0">
    <div className="border rounded-lg shadow-sm px-4 py-3 animate-pulse">
      <div className="grid grid-cols-2 gap-3">
        <div className="h-12 bg-gray-200 rounded"></div>
        <div className="h-12 bg-gray-200 rounded"></div>
      </div>
    </div>
  </div>
)}

{sponsors && sponsors.items.length > 0 && !sponsorsLoading && (
  <div className="mt-0">
    <SponsorCard
      items={sponsors.items}
      layout={sponsors.layout}
    />
  </div>
)}

// Error handling: Log errors but don't show to user
{sponsorsError && console.warn('[ActiveView] Sponsor loading error:', sponsorsError)}
```

### Task 4: Update Spacing Logic
**Prompt**: Implement dynamic spacing logic so that the Progress card has the correct top margin based on whether sponsors are displayed.

**Requirements**:
1. Progress card should have `mt-0` when no sponsors
2. Progress card should have `mt-3` when sponsors are present
3. Spacing should be consistent with other elements on the page
4. Consider creating a helper function for cleaner code

**Spacing Implementation**:
```typescript
// Helper function approach:
const getSponsorCardSpacing = () => {
  const hasSponsors = sponsors && sponsors.items.length > 0
  return {
    sponsorCardClass: "mt-0", // Always first element
    progressCardClass: hasSponsors ? "mt-3" : "mt-0"
  }
}

// In JSX:
const spacing = getSponsorCardSpacing()

return (
  <div className="max-w-screen-sm mx-auto px-4 py-3">
    {/* Sponsors */}
    {sponsors && sponsors.items.length > 0 && (
      <div className={spacing.sponsorCardClass}>
        <SponsorCard items={sponsors.items} layout={sponsors.layout} />
      </div>
    )}

    {/* Progress Card */}
    <div className={spacing.progressCardClass}>
      {/* Existing progress card content */}
    </div>
  </div>
)
```

### Task 5: Add Integration Tests
**Prompt**: Create tests to verify that the ActiveView integration works correctly with different sponsor scenarios.

**Requirements**:
1. Test ActiveView renders with sponsors
2. Test ActiveView renders without sponsors
3. Test spacing is correct in both scenarios
4. Test that existing functionality is not broken
5. Test loading states if implemented

**Integration Test Implementation**:
```typescript
// src/features/views/ActiveView.test.tsx

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ActiveView } from './ActiveView'
import { useSponsors } from '../sponsors/useSponsors'

// Mock the sponsors hook
jest.mock('../sponsors/useSponsors')
const mockUseSponsors = useSponsors as jest.MockedFunction<typeof useSponsors>

// Mock other dependencies as needed
jest.mock('../../store/appStore', () => ({
  useAppStore: () => ({
    organizationId: 'test-org',
    huntId: 'test-hunt',
    // ... other required store values
  })
}))

describe('ActiveView Sponsor Integration', () => {
  beforeEach(() => {
    mockUseSponsors.mockClear()
  })

  test('renders sponsor card when sponsors exist', async () => {
    // Mock sponsors data
    mockUseSponsors.mockReturnValue({
      sponsors: {
        layout: '1x2',
        items: [
          {
            id: '1',
            companyId: 'test',
            companyName: 'Test Company',
            alt: 'Test Company logo',
            type: 'png',
            src: 'https://example.com/logo.png',
            svg: null
          }
        ]
      },
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    render(<ActiveView />)

    // Wait for sponsors to render
    await waitFor(() => {
      expect(screen.getByLabelText('Sponsors')).toBeInTheDocument()
    })

    // Verify sponsor content
    expect(screen.getByAltText('Test Company logo')).toBeInTheDocument()
  })

  test('does not render sponsor card when no sponsors', async () => {
    // Mock empty sponsors
    mockUseSponsors.mockReturnValue({
      sponsors: {
        layout: '1x2',
        items: []
      },
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    render(<ActiveView />)

    // Sponsor card should not be in DOM
    expect(screen.queryByLabelText('Sponsors')).not.toBeInTheDocument()
  })

  test('renders correctly during loading state', () => {
    mockUseSponsors.mockReturnValue({
      sponsors: null,
      isLoading: true,
      error: null,
      refetch: jest.fn()
    })

    render(<ActiveView />)

    // Page should render normally even during sponsor loading
    // (Adjust based on your actual ActiveView content)
    expect(screen.getByRole('main')).toBeInTheDocument() // or whatever main element exists
  })

  test('handles sponsor errors gracefully', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

    mockUseSponsors.mockReturnValue({
      sponsors: null,
      isLoading: false,
      error: 'Failed to load sponsors',
      refetch: jest.fn()
    })

    render(<ActiveView />)

    // Page should render normally despite error
    expect(screen.queryByLabelText('Sponsors')).not.toBeInTheDocument()

    consoleSpy.mockRestore()
  })

  test('maintains correct spacing with and without sponsors', async () => {
    // Test with sponsors
    mockUseSponsors.mockReturnValue({
      sponsors: {
        layout: '1x2',
        items: [{ id: '1', companyId: 'test', companyName: 'Test', alt: 'Test', type: 'png', src: 'test.png', svg: null }]
      },
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    const { rerender } = render(<ActiveView />)

    await waitFor(() => {
      const sponsorCard = screen.getByLabelText('Sponsors').parentElement
      expect(sponsorCard).toHaveClass('mt-0')
    })

    // Test without sponsors
    mockUseSponsors.mockReturnValue({
      sponsors: { layout: '1x2', items: [] },
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    rerender(<ActiveView />)

    // Verify sponsor card is not rendered
    expect(screen.queryByLabelText('Sponsors')).not.toBeInTheDocument()
  })

  test('does not break existing ActiveView functionality', () => {
    mockUseSponsors.mockReturnValue({
      sponsors: { layout: '1x2', items: [] },
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    render(<ActiveView />)

    // Test that existing functionality still works
    // (Add specific tests based on your ActiveView features)
    // Example:
    // expect(screen.getByText('Progress')).toBeInTheDocument()
    // expect(screen.getByRole('button', { name: 'Upload Photo' })).toBeInTheDocument()
  })
})
```

### Task 6: Add TypeScript Types (if needed)
**Prompt**: Ensure all TypeScript types are properly imported and used in the ActiveView integration.

**Requirements**:
1. Verify all imports have proper types
2. Add type annotations where needed
3. Ensure no TypeScript errors
4. Document any type assumptions

**Type Safety Check**:
```typescript
// Verify these imports work correctly:
import { SponsorCard } from '../sponsors/SponsorCard'
import { useSponsors } from '../sponsors/useSponsors'

// Ensure hook returns are properly typed:
const {
  sponsors, // SponsorsResponse | null
  isLoading, // boolean
  error, // string | null
  refetch // () => Promise<void>
} = useSponsors()

// Verify component props are typed:
<SponsorCard
  items={sponsors.items} // SponsorAsset[]
  layout={sponsors.layout} // '1x1' | '1x2' | '1x3'
/>
```

## Acceptance Tests

### Test 1: Visual Integration
- [ ] SponsorCard appears above Progress card when sponsors exist
- [ ] SponsorCard does not appear when no sponsors exist
- [ ] Page layout identical to original when no sponsors
- [ ] Sponsor card styling matches other cards on page
- [ ] Vertical spacing looks correct in both scenarios

### Test 2: Conditional Rendering
- [ ] Component only renders when sponsors array has items
- [ ] Component does not render when sponsors array is empty
- [ ] Component does not render when sponsors is null/undefined
- [ ] Page renders normally during sponsor data loading

### Test 3: Spacing and Layout
- [ ] Sponsor card has mt-0 (first element in content area)
- [ ] Progress card has mt-3 when sponsors present
- [ ] Progress card has mt-0 when no sponsors present
- [ ] Spacing is consistent with other page elements
- [ ] Layout works on mobile and desktop

### Test 4: Error Handling
- [ ] Page renders normally if sponsor fetch fails
- [ ] No error messages shown to user for sponsor failures
- [ ] Console warnings logged for debugging
- [ ] Existing ActiveView functionality unaffected by sponsor errors

### Test 5: Performance
- [ ] Sponsor loading doesn't block page rendering
- [ ] No layout shift when sponsors load
- [ ] Page performs normally with sponsor integration
- [ ] Memory usage acceptable with sponsor components

### Test 6: Existing Functionality
- [ ] All existing ActiveView features still work
- [ ] Progress card functionality unchanged
- [ ] Photo upload functionality unchanged
- [ ] Navigation and other features unaffected
- [ ] No console errors introduced

## Definition of Done
- [ ] SponsorCard integrated into ActiveView.tsx
- [ ] Component appears above Progress card
- [ ] Conditional rendering works (only shows when sponsors exist)
- [ ] Proper spacing implemented (mt-0 for sponsor, dynamic for progress)
- [ ] Loading states handled appropriately
- [ ] Error states handled gracefully
- [ ] Integration tests written and passing
- [ ] TypeScript types properly used
- [ ] No existing functionality broken
- [ ] Page performs well with integration
- [ ] Visual design matches existing cards
- [ ] Mobile and desktop layouts work correctly

## Files Created/Modified
- `src/features/views/ActiveView.tsx` - Main integration changes
- `src/features/views/ActiveView.test.tsx` - Integration tests
- Any related type files if needed

## Notes
- Test integration thoroughly on different screen sizes
- Verify sponsor card doesn't interfere with existing photo upload flow
- Consider adding analytics for sponsor card visibility
- Document any changes to existing ActiveView behavior
- Test with various numbers of sponsors (1, 2, 3, 4+)
- Ensure integration works with all layout types (1x1, 1x2, 1x3)