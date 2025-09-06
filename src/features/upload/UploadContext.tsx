import React, { createContext, useContext, ReactNode } from 'react'
import { slugify } from '../../utils/slug'

interface UploadMeta {
  dateISO: string
  locationSlug: string
  teamSlug: string
  sessionId: string
  eventName: string
}

interface UploadProviderProps {
  location?: string
  team?: string
  sessionId?: string
  eventName?: string
  locationSlug?: string
  teamSlug?: string
  children: ReactNode
}

const UploadContext = createContext<UploadMeta | null>(null)

export function UploadProvider({
  location = '',
  team = '',
  sessionId = '',
  eventName = '',
  locationSlug,
  teamSlug,
  children
}: UploadProviderProps) {
  // Generate current date ISO string
  const dateISO = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
  
  // Derive slugs from names if slugs not provided
  const finalLocationSlug = locationSlug || (location ? slugify(location) : '')
  const finalTeamSlug = teamSlug || (team ? slugify(team) : '')
  
  const uploadMeta: UploadMeta = {
    dateISO,
    locationSlug: finalLocationSlug,
    teamSlug: finalTeamSlug,
    sessionId,
    eventName
  }
  
  return (
    <UploadContext.Provider value={uploadMeta}>
      {children}
    </UploadContext.Provider>
  )
}

export function useUploadMeta(): UploadMeta {
  const context = useContext(UploadContext)
  
  if (!context) {
    // Provide helpful error message but don't crash - allow props path fallback
    console.warn('useUploadMeta must be used within an UploadProvider. Using fallback values.')
    return {
      dateISO: new Date().toISOString().split('T')[0],
      locationSlug: '',
      teamSlug: '',
      sessionId: '',
      eventName: ''
    }
  }
  
  return context
}