/**
 * SponsorCard Component Tests
 * Comprehensive tests for SponsorCard component and sub-components
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { SponsorCard } from '../SponsorCard'
import { SponsorAsset } from '../../../types/sponsors'

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
  svg: '<svg viewBox="0 0 100 40"><rect width="100" height="40" fill="#007acc"/><text x="50" y="20" fill="white" text-anchor="middle">SVG Co</text></svg>'
}

const mockMaliciousSVGSponsor: SponsorAsset = {
  id: '3',
  companyId: 'malicious-company',
  companyName: 'Malicious Company',
  alt: 'Malicious Company logo',
  type: 'svg',
  src: null,
  svg: '<svg viewBox="0 0 100 40"><script>alert("xss")</script><rect width="100" height="40" fill="red"/><rect onclick="alert(\'click\')" width="50" height="20"/></svg>'
}

const mockBrokenSponsor: SponsorAsset = {
  id: '4',
  companyId: 'broken-company',
  companyName: 'Broken Company',
  alt: 'Broken Company logo',
  type: 'png',
  src: null,
  svg: null
}

describe('SponsorCard Component', () => {
  describe('Rendering Logic', () => {
    test('renders nothing when no sponsors provided', () => {
      const { container } = render(<SponsorCard items={[]} layout="1x2" />)
      expect(container.firstChild).toBeNull()
    })

    test('renders nothing when items is null', () => {
      const { container } = render(<SponsorCard items={null as any} layout="1x2" />)
      expect(container.firstChild).toBeNull()
    })

    test('renders nothing when items is undefined', () => {
      const { container } = render(<SponsorCard items={undefined as any} layout="1x2" />)
      expect(container.firstChild).toBeNull()
    })

    test('renders sponsor card when sponsors provided', () => {
      render(<SponsorCard items={[mockImageSponsor]} layout="1x2" />)

      const card = screen.getByLabelText('Sponsors')
      expect(card).toBeInTheDocument()
    })
  })

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
      const thirdSponsor: SponsorAsset = {
        ...mockImageSponsor,
        id: '3',
        companyId: 'third-company',
        companyName: 'Third Company'
      }
      render(<SponsorCard items={[mockImageSponsor, mockSVGSponsor, thirdSponsor]} layout="1x3" />)

      const grid = screen.getByLabelText('Sponsors').querySelector('.grid')
      expect(grid).toHaveClass('grid-cols-3')
    })

    test('defaults to 2 columns for invalid layout', () => {
      render(<SponsorCard items={[mockImageSponsor]} layout={'invalid' as any} />)

      const grid = screen.getByLabelText('Sponsors').querySelector('.grid')
      expect(grid).toHaveClass('grid-cols-2')
    })

    test('applies proper grid gap', () => {
      render(<SponsorCard items={[mockImageSponsor]} layout="1x1" />)

      const grid = screen.getByLabelText('Sponsors').querySelector('.grid')
      expect(grid).toHaveClass('gap-3')
    })
  })

  describe('Content Handling', () => {
    test('renders image sponsors with correct attributes', () => {
      render(<SponsorCard items={[mockImageSponsor]} layout="1x1" />)

      const image = screen.getByAltText('Test Company logo')
      expect(image).toHaveAttribute('src', 'https://example.com/logo.png')
      expect(image).toHaveClass('h-12', 'md:h-14', 'object-contain', 'max-w-full')
      expect(image).toHaveAttribute('loading', 'lazy')
    })

    test('renders SVG sponsors with inline content', () => {
      render(<SponsorCard items={[mockSVGSponsor]} layout="1x1" />)

      const svgContainer = screen.getByRole('img', { name: 'SVG Company logo' })
      expect(svgContainer).toBeInTheDocument()
      expect(svgContainer).toHaveAttribute('title', 'SVG Company logo')
      expect(svgContainer).toHaveAttribute('aria-label', 'SVG Company logo')
      expect(svgContainer.innerHTML).toContain('<svg')
      expect(svgContainer.innerHTML).toContain('SVG Co')
    })

    test('sanitizes dangerous SVG content', () => {
      render(<SponsorCard items={[mockMaliciousSVGSponsor]} layout="1x1" />)

      const svgContainer = screen.getByRole('img', { name: 'Malicious Company logo' })
      expect(svgContainer.innerHTML).not.toContain('<script>')
      expect(svgContainer.innerHTML).not.toContain('onclick')
      expect(svgContainer.innerHTML).not.toContain('javascript:')
      expect(svgContainer.innerHTML).toContain('<rect')
    })

    test('renders placeholder for sponsors with no content', () => {
      render(<SponsorCard items={[mockBrokenSponsor]} layout="1x1" />)

      expect(screen.getByText('Broken Company')).toBeInTheDocument()
    })
  })

  describe('Image Error Handling', () => {
    test('shows placeholder when image fails to load', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

      render(<SponsorCard items={[mockImageSponsor]} layout="1x1" />)

      const image = screen.getByAltText('Test Company logo')

      // Simulate image load error
      fireEvent.error(image)

      await waitFor(() => {
        expect(screen.getByText('Test Company')).toBeInTheDocument()
      })

      expect(consoleSpy).toHaveBeenCalledWith(
        '[SponsorCard] Failed to load image for Test Company:',
        'https://example.com/logo.png'
      )

      consoleSpy.mockRestore()
    })

    test('shows loading spinner initially', () => {
      render(<SponsorCard items={[mockImageSponsor]} layout="1x1" />)

      const spinner = document.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })

    test('hides loading spinner after image loads', async () => {
      render(<SponsorCard items={[mockImageSponsor]} layout="1x1" />)

      const image = screen.getByAltText('Test Company logo')

      // Simulate image load
      fireEvent.load(image)

      await waitFor(() => {
        const spinner = document.querySelector('.animate-spin')
        expect(spinner).not.toBeInTheDocument()
      })
    })
  })

  describe('Styling and CSS', () => {
    test('has proper card styling', () => {
      render(<SponsorCard items={[mockImageSponsor]} layout="1x1" />)

      const card = screen.getByLabelText('Sponsors')
      expect(card).toHaveClass('border', 'rounded-lg', 'shadow-sm', 'px-4', 'py-3')
    })

    test('applies CSS custom properties for theming', () => {
      render(<SponsorCard items={[mockImageSponsor]} layout="1x1" />)

      const card = screen.getByLabelText('Sponsors')
      expect(card).toHaveStyle({
        backgroundColor: 'var(--color-white)',
        borderColor: 'var(--color-light-grey)'
      })
    })

    test('applies proper item padding', () => {
      render(<SponsorCard items={[mockImageSponsor]} layout="1x1" />)

      const itemContainer = screen.getByLabelText('Sponsors').querySelector('.p-2')
      expect(itemContainer).toBeInTheDocument()
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

    test('SVG elements have proper roles and labels', () => {
      render(<SponsorCard items={[mockSVGSponsor]} layout="1x1" />)

      const svgElement = screen.getByRole('img', { name: 'SVG Company logo' })
      expect(svgElement).toHaveAttribute('role', 'img')
      expect(svgElement).toHaveAttribute('aria-label', 'SVG Company logo')
      expect(svgElement).toHaveAttribute('title', 'SVG Company logo')
    })

    test('placeholders have readable text', () => {
      render(<SponsorCard items={[mockBrokenSponsor]} layout="1x1" />)

      const placeholder = screen.getByText('Broken Company')
      expect(placeholder).toBeInTheDocument()
      expect(placeholder).toHaveClass('text-xs', 'text-gray-600', 'font-medium')
    })
  })

  describe('Multiple Sponsors', () => {
    test('renders multiple sponsors in grid', () => {
      const sponsors = [mockImageSponsor, mockSVGSponsor, mockBrokenSponsor]
      render(<SponsorCard items={sponsors} layout="1x3" />)

      expect(screen.getByAltText('Test Company logo')).toBeInTheDocument()
      expect(screen.getByRole('img', { name: 'SVG Company logo' })).toBeInTheDocument()
      expect(screen.getByText('Broken Company')).toBeInTheDocument()

      const grid = screen.getByLabelText('Sponsors').querySelector('.grid')
      expect(grid?.children).toHaveLength(3)
    })

    test('handles mixed content types correctly', () => {
      const mixedSponsors = [
        mockImageSponsor,
        mockSVGSponsor,
        mockBrokenSponsor,
        { ...mockImageSponsor, id: '5', companyName: 'Second Image Co' }
      ]

      render(<SponsorCard items={mixedSponsors} layout="1x2" />)

      // Should have 2 images, 1 SVG, 1 placeholder
      expect(screen.getAllByRole('img')).toHaveLength(3) // 2 img tags + 1 SVG with role="img"
      expect(screen.getByText('Broken Company')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    test('handles sponsors with empty strings', () => {
      const emptySponsor: SponsorAsset = {
        id: 'empty',
        companyId: '',
        companyName: '',
        alt: '',
        type: 'png',
        src: '',
        svg: null
      }

      render(<SponsorCard items={[emptySponsor]} layout="1x1" />)

      // Should still render something (likely a placeholder)
      expect(screen.getByLabelText('Sponsors')).toBeInTheDocument()
    })

    test('handles very long company names', () => {
      const longNameSponsor: SponsorAsset = {
        id: 'long',
        companyId: 'long-company',
        companyName: 'This Is A Very Long Company Name That Should Be Truncated',
        alt: 'Long company logo',
        type: 'png',
        src: null,
        svg: null
      }

      render(<SponsorCard items={[longNameSponsor]} layout="1x1" />)

      const companyName = screen.getByText('This Is A Very Long Company Name That Should Be Truncated')
      expect(companyName).toHaveClass('truncate')
    })

    test('handles special characters in company names', () => {
      const specialCharSponsor: SponsorAsset = {
        id: 'special',
        companyId: 'special-company',
        companyName: 'Company & Co. "Special" <Chars>',
        alt: 'Special company logo',
        type: 'svg',
        src: null,
        svg: '<svg><rect width="100" height="40"/></svg>'
      }

      expect(() => {
        render(<SponsorCard items={[specialCharSponsor]} layout="1x1" />)
      }).not.toThrow()

      expect(screen.getByRole('img', { name: 'Special company logo' })).toBeInTheDocument()
    })
  })
})