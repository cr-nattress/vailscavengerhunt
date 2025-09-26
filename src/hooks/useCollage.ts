import { useState } from 'react'

interface UseCollageOptions {
  stops: any[]
  progress: any
  teamName?: string
}

export function useCollage({ stops, progress, teamName }: UseCollageOptions) {
  const [collageUrl, setCollageUrl] = useState<string | null>(null)
  const [collageLoading, setCollageLoading] = useState(false)

  // Note: Automatic collage creation has been removed
  // The CollageService.createCollage() method expects File objects, not URLs
  // If collage functionality is needed in the future, it should be triggered
  // manually with actual File objects from the user

  return {
    collageUrl,
    collageLoading,
    setCollageUrl
  }
}