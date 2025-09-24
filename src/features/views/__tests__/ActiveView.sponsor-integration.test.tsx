/**
 * ActiveView Sponsor Integration Tests
 * Tests that sponsor card integrates correctly with ActiveView
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { describe, test, expect, beforeEach, vi } from 'vitest'
import ActiveView from '../ActiveView'
import { useSponsors } from '../../sponsors/useSponsors'

// Mock the sponsors hook
vi.mock('../../sponsors/useSponsors')
const mockUseSponsors = useSponsors as any

// Mock other dependencies
vi.mock('../../../store/appStore', () => ({
  useAppStore: () => ({
    organizationId: 'test-org',
    huntId: 'test-hunt',
    teamName: 'Test Team',
    locationName: 'Test Location',
    sessionId: 'test-session',
    eventName: 'Test Event'
  })
}))

vi.mock('../../../store/uiStore', () => ({
  useUIStore: () => ({
    expandedStops: new Set(),
    transitioningStops: new Set(),
    showTips: false,
    toggleStopExpanded: vi.fn(),
    setTransitioning: vi.fn(),
    setShowTips: vi.fn()
  })
}))

vi.mock('../../../hooks/useProgress', () => ({
  useProgress: () => ({
    progress: {},
    setProgress: vi.fn(),
    completeCount: 0,
    percent: 0
  })
}))

vi.mock('../../../hooks/usePhotoUpload', () => ({
  usePhotoUpload: () => ({
    uploadPhoto: vi.fn(),
    uploadingStops: new Set()
  })
}))

vi.mock('../../../hooks/useCollage', () => ({
  useCollage: () => ({
    collageUrl: null
  })
}))

vi.mock('../../notifications/ToastProvider', () => ({
  useToastActions: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn()
  })
}))

vi.mock('../../../utils/random', () => ({
  getRandomStops: () => [
    { id: 'stop1', title: 'Stop 1', description: 'Test stop 1' },
    { id: 'stop2', title: 'Stop 2', description: 'Test stop 2' }
  ]
}))

vi.mock('../../../services/ProgressService', () => ({
  progressService: {
    getProgress: vi.fn(() => Promise.resolve({})),
    saveProgress: vi.fn(() => Promise.resolve())
  }
}))

describe('ActiveView Sponsor Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders sponsor card when sponsors exist', async () => {
    // Mock sponsors data
    mockUseSponsors.mockReturnValue({
      sponsors: {
        layout: '1x2',
        items: [
          {
            id: '1',
            companyId: 'test-company',
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
      refetch: vi.fn()
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
      refetch: vi.fn()
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
      refetch: vi.fn()
    })

    render(<ActiveView />)

    // Page should render normally even during sponsor loading
    // Check for progress card (should be present regardless)
    expect(screen.getByText('Test Team')).toBeInTheDocument()
    expect(screen.queryByLabelText('Sponsors')).not.toBeInTheDocument()
  })

  test('handles sponsor errors gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    mockUseSponsors.mockReturnValue({
      sponsors: null,
      isLoading: false,
      error: 'Failed to load sponsors',
      refetch: vi.fn()
    })

    render(<ActiveView />)

    // Page should render normally despite error
    expect(screen.getByText('Test Team')).toBeInTheDocument()
    expect(screen.queryByLabelText('Sponsors')).not.toBeInTheDocument()

    consoleSpy.mockRestore()
  })

  test('applies correct spacing with sponsors present', async () => {
    mockUseSponsors.mockReturnValue({
      sponsors: {
        layout: '1x2',
        items: [
          {
            id: '1',
            companyId: 'test',
            companyName: 'Test',
            alt: 'Test',
            type: 'png',
            src: 'test.png',
            svg: null
          }
        ]
      },
      isLoading: false,
      error: null,
      refetch: vi.fn()
    })

    render(<ActiveView />)

    await waitFor(() => {
      const sponsorCard = screen.getByLabelText('Sponsors')
      expect(sponsorCard).toBeInTheDocument()

      // Sponsor card container should have mt-0
      const sponsorContainer = sponsorCard.parentElement
      expect(sponsorContainer).toHaveClass('mt-0')
    })

    // Progress card should have mt-3 when sponsors are present
    const progressCardContainer = screen.getByText('Test Team').closest('.border')
    expect(progressCardContainer).toHaveClass('mt-3')
  })

  test('applies correct spacing without sponsors', () => {
    mockUseSponsors.mockReturnValue({
      sponsors: { layout: '1x2', items: [] },
      isLoading: false,
      error: null,
      refetch: vi.fn()
    })

    render(<ActiveView />)

    // Progress card should have mt-0 when no sponsors
    const progressCardContainer = screen.getByText('Test Team').closest('.border')
    expect(progressCardContainer).toHaveClass('mt-0')
    expect(progressCardContainer).not.toHaveClass('mt-3')
  })

  test('does not break existing ActiveView functionality', () => {
    mockUseSponsors.mockReturnValue({
      sponsors: { layout: '1x2', items: [] },
      isLoading: false,
      error: null,
      refetch: vi.fn()
    })

    render(<ActiveView />)

    // Test that existing functionality still works
    expect(screen.getByText('Test Team')).toBeInTheDocument()
    expect(screen.getByText('test-hunt')).toBeInTheDocument()

    // Progress gauge should be present
    const progressSection = screen.getByText('Test Team').closest('.border')
    expect(progressSection).toBeInTheDocument()
  })

  test('handles multiple sponsors correctly', async () => {
    const multipleSponsors = [
      {
        id: '1',
        companyId: 'company-1',
        companyName: 'Company 1',
        alt: 'Company 1 logo',
        type: 'png' as const,
        src: 'https://example.com/logo1.png',
        svg: null
      },
      {
        id: '2',
        companyId: 'company-2',
        companyName: 'Company 2',
        alt: 'Company 2 logo',
        type: 'svg' as const,
        src: null,
        svg: '<svg><rect width="100" height="40"/></svg>'
      }
    ]

    mockUseSponsors.mockReturnValue({
      sponsors: {
        layout: '1x2',
        items: multipleSponsors
      },
      isLoading: false,
      error: null,
      refetch: vi.fn()
    })

    render(<ActiveView />)

    await waitFor(() => {
      expect(screen.getByLabelText('Sponsors')).toBeInTheDocument()
    })

    // Both sponsors should be rendered
    expect(screen.getByAltText('Company 1 logo')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Company 2 logo' })).toBeInTheDocument()

    // Grid should have 2 columns
    const grid = screen.getByLabelText('Sponsors').querySelector('.grid')
    expect(grid).toHaveClass('grid-cols-2')
  })

  test('responds to layout changes correctly', async () => {
    const { rerender } = render(<ActiveView />)

    // Start with 1x2 layout
    mockUseSponsors.mockReturnValue({
      sponsors: {
        layout: '1x2',
        items: [
          {
            id: '1',
            companyId: 'test',
            companyName: 'Test',
            alt: 'Test',
            type: 'png',
            src: 'test.png',
            svg: null
          }
        ]
      },
      isLoading: false,
      error: null,
      refetch: vi.fn()
    })

    rerender(<ActiveView />)

    await waitFor(() => {
      const grid = screen.getByLabelText('Sponsors').querySelector('.grid')
      expect(grid).toHaveClass('grid-cols-2')
    })

    // Change to 1x3 layout
    mockUseSponsors.mockReturnValue({
      sponsors: {
        layout: '1x3',
        items: [
          {
            id: '1',
            companyId: 'test',
            companyName: 'Test',
            alt: 'Test',
            type: 'png',
            src: 'test.png',
            svg: null
          }
        ]
      },
      isLoading: false,
      error: null,
      refetch: vi.fn()
    })

    rerender(<ActiveView />)

    await waitFor(() => {
      const grid = screen.getByLabelText('Sponsors').querySelector('.grid')
      expect(grid).toHaveClass('grid-cols-3')
    })
  })

  test('maintains consistent card styling with other elements', async () => {
    mockUseSponsors.mockReturnValue({
      sponsors: {
        layout: '1x1',
        items: [
          {
            id: '1',
            companyId: 'test',
            companyName: 'Test',
            alt: 'Test',
            type: 'png',
            src: 'test.png',
            svg: null
          }
        ]
      },
      isLoading: false,
      error: null,
      refetch: vi.fn()
    })

    render(<ActiveView />)

    await waitFor(() => {
      const sponsorCard = screen.getByLabelText('Sponsors')
      const progressCard = screen.getByText('Test Team').closest('.border')

      // Both cards should have similar styling
      expect(sponsorCard).toHaveClass('border', 'rounded-lg', 'shadow-sm', 'px-4', 'py-3')
      expect(progressCard).toHaveClass('border', 'rounded-lg', 'shadow-sm', 'px-4', 'py-3')

      // Both should use CSS custom properties
      expect(sponsorCard).toHaveStyle({
        backgroundColor: 'var(--color-white)',
        borderColor: 'var(--color-light-grey)'
      })
    })
  })
})