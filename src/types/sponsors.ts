/**
 * Type definitions for Sponsor Card system
 * Defines API contracts, database types, and frontend interfaces
 */

// Frontend display types
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

// Database row types (matches Supabase schema)
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

// Settings integration types
export interface SponsorSettings {
  layout: '1x1' | '1x2' | '1x3'
}

// API error types
export interface SponsorApiError {
  error: string
  message?: string
}

// Component prop types
export interface SponsorCardProps {
  items: SponsorAsset[]
  layout: '1x1' | '1x2' | '1x3'
}

export interface SponsorItemProps {
  sponsor: SponsorAsset
}

// Hook return types
export interface UseSponsorsResult {
  sponsors: SponsorsResponse | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

// Valid layout options
export const VALID_LAYOUTS = ['1x1', '1x2', '1x3'] as const
export type SponsorLayout = typeof VALID_LAYOUTS[number]

// Default values
export const DEFAULT_LAYOUT: SponsorLayout = '1x2'

// Type guards
export function isSponsorLayout(value: string): value is SponsorLayout {
  return VALID_LAYOUTS.includes(value as SponsorLayout)
}

export function isValidImageType(type: string): type is 'svg' | 'png' | 'jpeg' | 'jpg' {
  return ['svg', 'png', 'jpeg', 'jpg'].includes(type)
}

// Utility types for service operations
export interface SponsorServiceCache {
  data: SponsorsResponse
  timestamp: number
}

export interface SponsorAssetUpload {
  organizationId: string
  huntId: string
  companyId: string
  companyName: string
  imageType: 'svg' | 'png' | 'jpeg' | 'jpg'
  imageAlt: string
  orderIndex?: number
  file?: File // For uploaded images
  svgContent?: string // For inline SVG
}