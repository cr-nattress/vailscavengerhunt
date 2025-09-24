/**
 * SponsorCard Component
 * Displays sponsor logos in configurable grid layouts (1x1, 1x2, 1x3)
 * Handles both stored images and inline SVG content
 * Includes accessibility features and responsive design
 */

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
      className="relative border rounded-lg shadow-sm"
      style={{
        backgroundColor: 'var(--color-white)',
        borderColor: 'var(--color-light-grey)'
      }}
      aria-label="Sponsors"
    >
      <div className="absolute z-10" style={{ top: '0px', right: '5px' }}>
        <span className="px-1.5 py-0.5 bg-black bg-opacity-60 text-white text-xs rounded" style={{ fontSize: '9px' }}>
          Sponsors
        </span>
      </div>
      <div className={`grid ${gridCols}`}>
        {items.map((sponsor, index) => (
          <SponsorItem
            key={sponsor.id}
            sponsor={sponsor}
            index={index}
            total={items.length}
          />
        ))}
      </div>
    </div>
  )
}

interface SponsorItemProps {
  sponsor: SponsorAsset
  index: number
  total: number
}

const SponsorItem: React.FC<SponsorItemProps> = ({ sponsor, index, total }) => {
  // Calculate border classes based on position in grid
  const getBorderClasses = () => {
    if (total === 1) return 'border border-gray-200 rounded'

    // For 2 items (1x2 grid)
    if (total === 2) {
      if (index === 0) return 'border border-gray-200 rounded-l border-r-0' // Left item
      if (index === 1) return 'border border-gray-200 rounded-r border-l-0' // Right item
    }

    // For 3+ items, remove borders between adjacent items
    if (index === 0) return 'border border-gray-200 rounded-l border-r-0'
    if (index === total - 1) return 'border border-gray-200 rounded-r border-l-0'
    return 'border-t border-b border-gray-200 border-l-0 border-r-0'
  }

  return (
    <div className="flex items-center justify-center">
      {sponsor.type === 'svg' && sponsor.svg ? (
        <SponsorSVG
          svg={sponsor.svg}
          alt={sponsor.alt}
          companyName={sponsor.companyName}
          borderClasses={getBorderClasses()}
        />
      ) : sponsor.src ? (
        <SponsorImage
          src={sponsor.src}
          alt={sponsor.alt}
          companyName={sponsor.companyName}
          borderClasses={getBorderClasses()}
        />
      ) : (
        <SponsorPlaceholder
          companyName={sponsor.companyName}
          borderClasses={getBorderClasses()}
        />
      )}
    </div>
  )
}

interface SponsorImageProps {
  src: string
  alt: string
  companyName: string
  borderClasses: string
}

const SponsorImage: React.FC<SponsorImageProps> = ({ src, alt, companyName, borderClasses }) => {
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
  borderClasses: string
}

const SponsorSVG: React.FC<SponsorSVGProps> = ({ svg, alt, companyName, borderClasses }) => {
  console.log('[SponsorSVG] Rendering SVG for:', companyName, 'SVG length:', svg.length)

  // Sanitize SVG content (basic safety check)
  const sanitizedSVG = svg
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/on\w+="[^"]*"/gi, '') // Remove on* event handlers
    .replace(/on\w+='[^']*'/gi, '') // Remove on* event handlers (single quotes)

  console.log('[SponsorSVG] Sanitized SVG:', sanitizedSVG.substring(0, 100) + '...')

  return (
    <div
      className={`h-12 md:h-14 w-full flex items-center justify-center bg-gray-50 ${borderClasses}`}
      style={{ minWidth: '120px', minHeight: '48px' }}
      dangerouslySetInnerHTML={{ __html: sanitizedSVG }}
      title={alt}
      role="img"
      aria-label={alt}
    />
  )
}

interface SponsorPlaceholderProps {
  companyName: string
  borderClasses: string
}

const SponsorPlaceholder: React.FC<SponsorPlaceholderProps> = ({ companyName, borderClasses }) => {
  return (
    <div className={`h-12 md:h-14 flex items-center justify-center bg-gray-100 ${borderClasses} px-3`}>
      <span className="text-xs text-gray-600 text-center font-medium truncate">
        {companyName}
      </span>
    </div>
  )
}